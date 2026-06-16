import { prisma } from "@/lib/db";
import { DeliveryOrderStatus, Prisma } from "@prisma/client";
import { GeocodingService } from "./geocoding.service";
import { NotificationService } from "./notification.service";
import { redisPub } from "@/lib/redis"; // Standard redis publisher in the app
import { TrackingService } from "./tracking.service";
import {
  assertEcommerceOrderAllowed,
  ecommerceSettingsSelect,
  normalizeEcommerceSettings,
  type EcommerceDeliveryType,
} from "@/domain/orders/ecommerce-settings";

type DeliveryLocationEstimate = {
  address: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  estimatedTimeMinutes: number;
  deliveryFee: number;
};

type DeliveryQuote = DeliveryLocationEstimate & {
  configuredDeliveryFee: number;
  calculatedDeliveryFee: number;
  preparationDelayMinutes: number;
  ecommerceEnabled: boolean;
  deliveryEnabled: boolean;
  clickAndCollectEnabled: boolean;
};

export class DeliveryService {
  /**
   * Estime la distance et le temps de trajet à partir de l'adresse,
   * puis calcule un tarif indicatif localement.
   */
  private static async buildLocationEstimate(address: string, storeId: string): Promise<DeliveryLocationEstimate> {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new Error("Restaurant non trouvé");
    }

    // Default coordinates if store has no coordinates/address or is mocked
    const storeCoords = { lat: 5.3096, lng: -4.0127 }; // Store base coordinates (Abidjan)
    
    // In production, we'd geocode the store's address if it exists:
    let storeLocation = storeCoords;
    if (store.address && store.address.trim().length > 0) {
      try {
        storeLocation = await GeocodingService.geocodeAddress(store.address);
      } catch (err) {
        console.warn("Failed to geocode store address, using fallback:", err);
      }
    }

    // Geocode destination
    const destCoords = await GeocodingService.geocodeAddress(address);

    // Calculate distance
    const { distanceKm, durationMinutes } = await GeocodingService.calculateDistanceAndDuration(
      storeLocation,
      destCoords
    );

    // Calculate delivery fee
    // Barème: 500 FCFA base + 200 FCFA per km, rounded
    const baseFee = 500;
    const kmFee = 200;
    const fee = baseFee + Math.round(distanceKm * kmFee);

    return {
      address,
      latitude: destCoords.lat,
      longitude: destCoords.lng,
      distanceKm,
      estimatedTimeMinutes: durationMinutes,
      deliveryFee: fee,
    };
  }

  /**
   * Retourne le devis serveur complet pour une livraison.
   * Le fee final provient de la configuration du store; le calcul local
   * sert uniquement d'indication de distance et de temps.
   */
  static async getDeliveryQuote(
    address: string,
    storeId: string,
    options?: { requireEnabled?: boolean }
  ): Promise<DeliveryQuote> {
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: ecommerceSettingsSelect,
    });

    if (!store) {
      throw new Error("Restaurant non trouvé");
    }

    const settings = normalizeEcommerceSettings(store);
    if (options?.requireEnabled) {
      assertEcommerceOrderAllowed(settings, "DELIVERY" as EcommerceDeliveryType);
    }

    const estimate = await this.buildLocationEstimate(address, storeId);
    const configuredDeliveryFee = settings.deliveryFee;

    return {
      ...estimate,
      deliveryFee: configuredDeliveryFee,
      configuredDeliveryFee,
      calculatedDeliveryFee: estimate.deliveryFee,
      preparationDelayMinutes: settings.preparationDelayMinutes,
      ecommerceEnabled: settings.ecommerceEnabled,
      deliveryEnabled: settings.deliveryEnabled,
      clickAndCollectEnabled: settings.clickAndCollectEnabled,
    };
  }

  /**
   * Compatibilité ascendante: conserve l'estimation géographique brute.
   * Le prix retourné ici reste indicatif et ne doit pas être facturé tel quel.
   */
  static async estimateDelivery(address: string, storeId: string) {
    return this.buildLocationEstimate(address, storeId);
  }

  /**
   * Creates a new DeliveryOrder associated with an existing Order
   */
  static async createDeliveryOrder(data: {
    orderId: string;
    address: string;
    estimatedTimeMinutes?: number | null;
    livreurId?: string | null;
  }) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: { store: true },
    });

    if (!order) {
      throw new Error("Commande non trouvée");
    }

    // Le fee final vient de la configuration du store; aucune valeur client ne doit survivre ici.
    let lat = 5.3096;
    let lng = -4.0127;
    let distanceKm = 1.0;
    let deliveryFee = 0;
    let estimatedTimeMinutes = data.estimatedTimeMinutes ?? 30;

    try {
      const quote = await this.getDeliveryQuote(data.address, order.storeId);
      lat = quote.latitude;
      lng = quote.longitude;
      distanceKm = quote.distanceKm;
      deliveryFee = quote.deliveryFee;
      estimatedTimeMinutes = data.estimatedTimeMinutes ?? quote.estimatedTimeMinutes;
    } catch (err) {
      console.warn("Estimation failed on creation, using defaults:", err);
    }

    // Create the delivery order record
    const deliveryOrder = await prisma.deliveryOrder.create({
      data: {
        orderId: data.orderId,
        address: data.address,
        latitude: lat,
        longitude: lng,
        distanceKm,
        deliveryFee,
        status: data.livreurId ? "ASSIGNED" : "PENDING",
        estimatedTimeMinutes,
        livreurId: data.livreurId || null,
        startedAt: data.livreurId ? new Date() : null,
      },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        livreur: true,
      },
    });

    // Notify customer
    const customerName = order.customerName || 
      (deliveryOrder.order.customer 
        ? `${deliveryOrder.order.customer.firstName} ${deliveryOrder.order.customer.lastName}` 
        : "Client");
    const customerPhone = order.customerPhone || deliveryOrder.order.customer?.phone || "+22507000000";
    const customerEmail = deliveryOrder.order.customer?.email || null;

    await NotificationService.notifyStatusChange(
      deliveryOrder.status,
      customerName,
      customerPhone,
      customerEmail,
      order.id,
      deliveryOrder.livreur?.name
    );

    return deliveryOrder;
  }

  /**
   * Lists delivery orders optionally filtered by status and storeId
   */
  static async getDeliveryOrders(filters: { status?: DeliveryOrderStatus; storeId?: string }) {
    const whereClause: Prisma.DeliveryOrderWhereInput = {};

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.storeId) {
      whereClause.order = {
        storeId: filters.storeId,
      };
    }

    return prisma.deliveryOrder.findMany({
      where: whereClause,
      include: {
        order: {
          include: {
            store: true,
            customer: true,
          },
        },
        livreur: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Updates delivery order status and manages time points & notifications
   */
  static async updateDeliveryStatus(
    deliveryOrderId: string,
    status: DeliveryOrderStatus,
    livreurId?: string | null
  ) {
    const deliveryOrder = await prisma.deliveryOrder.findUnique({
      where: { id: deliveryOrderId },
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        livreur: true,
      },
    });

    if (!deliveryOrder) {
      throw new Error("Commande de livraison non trouvée");
    }

    const allowedTransitions: Record<DeliveryOrderStatus, DeliveryOrderStatus[]> = {
      PENDING: ["ASSIGNED", "CANCELLED"],
      ASSIGNED: ["PICKED_UP", "IN_PROGRESS", "DELIVERED", "CANCELLED"],
      PICKED_UP: ["IN_PROGRESS", "DELIVERED", "CANCELLED"],
      IN_PROGRESS: ["DELIVERED", "CANCELLED"],
      DELIVERED: [],
      CANCELLED: [],
    };

    if (!allowedTransitions[deliveryOrder.status].includes(status)) {
      throw new Error(
        `Transition de livraison invalide: ${deliveryOrder.status} -> ${status}`
      );
    }

    const updateData: Prisma.DeliveryOrderUpdateInput = { status };

    if (livreurId) {
      updateData.livreur = { connect: { id: livreurId } };
    } else if (livreurId === null) {
      updateData.livreur = { disconnect: true };
    }

    // Time points
    if (status === "ASSIGNED" || status === "PICKED_UP") {
      updateData.startedAt = deliveryOrder.startedAt || new Date();
    } else if (status === "DELIVERED") {
      updateData.deliveredAt = new Date();
    }

    const updated = await prisma.deliveryOrder.update({
      where: { id: deliveryOrderId },
      data: updateData,
      include: {
        order: {
          include: {
            customer: true,
          },
        },
        livreur: true,
      },
    });

    // Notify customer
    const customerName = updated.order.customerName || 
      (updated.order.customer 
        ? `${updated.order.customer.firstName} ${updated.order.customer.lastName}` 
        : "Client");
    const customerPhone = updated.order.customerPhone || updated.order.customer?.phone || "+22507000000";
    const customerEmail = updated.order.customer?.email || null;

    await NotificationService.notifyStatusChange(
      status,
      customerName,
      customerPhone,
      customerEmail,
      updated.order.id,
      updated.livreur?.name
    );

    // Publish event via Redis
    try {
      if (redisPub && redisPub.publish) {
        await redisPub.publish(
          `delivery:${deliveryOrderId}:status`,
          JSON.stringify({ deliveryOrderId, status, updatedAt: new Date() })
        );
      }
    } catch (redisErr) {
      console.warn("Failed to publish status update to Redis:", redisErr);
    }

    return updated;
  }

  /**
   * Logs driver location tracking, updates Driver current location and publishes status updates
   */
  static async trackDriverLocation(deliveryOrderId: string, livreurId: string, lat: number, lng: number) {
    return TrackingService.recordPosition(deliveryOrderId, livreurId, lat, lng);
  }

  /**
   * Retrieves the latest tracking location for a delivery order
   */
  static async getLatestTracking(deliveryOrderId: string) {
    return TrackingService.getLatestTracking(deliveryOrderId);
  }
}
