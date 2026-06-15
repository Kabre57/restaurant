import { prisma } from "@/lib/db";
import { DeliveryOrderStatus, Prisma } from "@prisma/client";
import { GeocodingService } from "./geocoding.service";
import { NotificationService } from "./notification.service";
import { redisPub } from "@/lib/redis"; // Standard redis publisher in the app
import { TrackingService } from "./tracking.service";

export class DeliveryService {
  /**
   * Estimates distance, duration, and delivery fee for a given address and store
   */
  static async estimateDelivery(address: string, storeId: string) {
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
   * Creates a new DeliveryOrder associated with an existing Order
   */
  static async createDeliveryOrder(data: {
    orderId: string;
    address: string;
    deliveryFee: number;
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

    // Geocode address to save exact lat/lng and calculate distance
    let lat = 5.3096;
    let lng = -4.0127;
    let distanceKm = 1.0;

    try {
      const estimation = await this.estimateDelivery(data.address, order.storeId);
      lat = estimation.latitude;
      lng = estimation.longitude;
      distanceKm = estimation.distanceKm;
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
        deliveryFee: data.deliveryFee,
        status: data.livreurId ? "ASSIGNED" : "PENDING",
        estimatedTimeMinutes: data.estimatedTimeMinutes || 30,
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
