import { runInTransaction } from "@/infrastructure/prisma/transaction";
import { OrderStatus, OrderType, OrderSource } from "@prisma/client";
import { CheckoutInput } from "@/shared/contracts/checkout";
import { checkRecipeAvailability } from "@/app/actions/inventory/inventory";
import { DeliveryService } from "@/services/delivery.service";
import { PaymentService } from "@/services/payment.service";
import { OrderRepository } from "../../repositories/order.repository";
import {
  assertEcommerceOrderAllowed,
  normalizeEcommerceSettings,
} from "@/domain/orders/ecommerce-settings";
import { DEFAULT_VAT_RATE, computeTaxFromNetAmount } from "@/lib/tax";
import { NotFoundError, ValidationError, InsufficientStockError } from "@/shared/errors";

type EcommercePaymentResult =
  | Awaited<ReturnType<typeof PaymentService.createStripePaymentIntent>>
  | Awaited<ReturnType<typeof PaymentService.createMobileMoneyPayment>>;

export class CreateEcommerceOrderUseCase {
  static async execute(input: CheckoutInput) {
    const order = await runInTransaction(async (tx) => {
      const storeRecord = await OrderRepository.findStoreSettings(input.storeId, tx);

      if (!storeRecord) {
        throw new NotFoundError("Restaurant introuvable");
      }

      const settings = normalizeEcommerceSettings(storeRecord);
      assertEcommerceOrderAllowed(settings, input.deliveryType);

      const now = new Date();
      const minimumReadyAt = new Date(now.getTime() + settings.preparationDelayMinutes * 60_000);

      if (input.requestedFulfillmentAt && input.requestedFulfillmentAt < minimumReadyAt) {
        throw new ValidationError(`Le délai minimal de préparation est de ${settings.preparationDelayMinutes} minutes`);
      }

      const estimatedReadyAt = input.requestedFulfillmentAt ?? minimumReadyAt;
      const productIds = [...new Set(input.items.map((item) => item.productId))];
      const products = await OrderRepository.findAvailableProducts(productIds, input.storeId, tx);

      if (products.length !== productIds.length) {
        throw new ValidationError("Un ou plusieurs produits sont indisponibles pour ce restaurant");
      }

      const productsById = new Map(products.map((product) => [product.id, product]));
      const orderItems = input.items.map((item) => {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new ValidationError("Produit indisponible pour ce restaurant");
        }

        const lineTax = computeTaxFromNetAmount(product.price * item.quantity);

        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          priceExcludingTax: product.price,
          taxRate: DEFAULT_VAT_RATE,
          taxAmount: lineTax.taxAmount,
          options: item.notes || null,
        };
      });

      // 1. Vérifier la disponibilité des ingrédients en cuisine pour chaque article
      for (const item of orderItems) {
        const check = await checkRecipeAvailability(
          tx,
          input.storeId,
          item.productId,
          item.quantity
        );

        if (!check.success) {
          throw new InsufficientStockError(check.error || `Stock insuffisant pour le produit sélectionné.`);
        }
      }

      // 2. Résoudre ou créer la fiche client pour cet établissement
      let customer = await OrderRepository.findCustomer(input.customerPhone, input.storeId, tx);

      if (!customer) {
        const nameParts = input.customerName.trim().split(/\s+/);
        const firstName = nameParts[0] || "Client";
        const lastName = nameParts.slice(1).join(" ") || "En Ligne";

        customer = await OrderRepository.createCustomer({
          firstName,
          lastName,
          phone: input.customerPhone,
          email: input.customerEmail || null,
          store: { connect: { id: input.storeId } },
        }, tx);
      }

      // 3. Calculer les frais de livraison uniquement depuis la configuration serveur
      const deliveryFee = input.deliveryType === "DELIVERY" ? settings.deliveryFee : 0;
      let estLatitude = 5.3096;
      let estLongitude = -4.0127;
      let estDistanceKm = 1.0;
      let estTimeMinutes = settings.preparationDelayMinutes;

      if (input.deliveryType === "DELIVERY" && input.deliveryAddress) {
        try {
          // L'estimation ne sert qu'aux coordonnées et au temps, jamais au prix facturé.
          const estimation = await DeliveryService.estimateDelivery(
            input.deliveryAddress,
            input.storeId
          );
          estLatitude = estimation.latitude;
          estLongitude = estimation.longitude;
          estDistanceKm = estimation.distanceKm;
          estTimeMinutes = Math.max(settings.preparationDelayMinutes, estimation.estimatedTimeMinutes);
        } catch (err) {
          console.warn("Échec de l'estimation de livraison, conservation du forfait configuré:", err);
        }
      }

      // 4. Calculer le total général de la commande
      const itemsTotal = orderItems.reduce(
        (acc, item) => acc + computeTaxFromNetAmount(item.quantity * item.price).totalIncludingTax,
        0
      );
      const total = itemsTotal + deliveryFee;

      // 5. Créer la commande dans la base de données
      const newOrder = await OrderRepository.createOrder({
        store: { connect: { id: input.storeId } },
        customer: { connect: { id: customer.id } },
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail || null,
        deliveryAddress: input.deliveryAddress || null,
        customerNotes: input.customerNotes || null,
        deliveryType: input.deliveryType,
        source: OrderSource.ONLINE,
        status: OrderStatus.EN_ATTENTE,
        type: input.deliveryType === "DELIVERY" ? OrderType.DELIVERY : OrderType.TAKEAWAY,
        estimatedPrepMinutes: settings.preparationDelayMinutes,
        estimatedReadyAt,
        total,
        items: {
          create: orderItems,
        },
      }, tx);

      // 6. Si c'est une livraison, créer la fiche de livraison associée
      if (input.deliveryType === "DELIVERY" && input.deliveryAddress) {
        await OrderRepository.createDeliveryOrder({
          orderId: newOrder.id,
          address: input.deliveryAddress,
          latitude: estLatitude,
          longitude: estLongitude,
          distanceKm: estDistanceKm,
          deliveryFee,
          status: "PENDING",
          estimatedTimeMinutes: estTimeMinutes,
        }, tx);
      }

      return newOrder;
    });

    // 7. Initialiser la transaction de paiement correspondante après commit de l'ordre
    let paymentResult: EcommercePaymentResult;
    if (input.paymentMethod === "CARD") {
      paymentResult = await PaymentService.createStripePaymentIntent(
        order.id,
        order.total,
        input.customerEmail || undefined
      );
    } else {
      paymentResult = await PaymentService.createMobileMoneyPayment(
        order.id,
        order.total,
        input.paymentMethod,
        input.customerPhone,
        input.customerEmail || undefined
      );
    }

    return {
      order,
      payment: paymentResult,
    };
  }
}
