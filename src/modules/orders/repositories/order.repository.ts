import { prisma } from '@/infrastructure/prisma/client';
import { TransactionClient } from '@/infrastructure/prisma/transaction';
import { ecommerceSettingsSelect, EcommerceSettingsRecord } from '@/domain/orders/ecommerce-settings';
import { Prisma } from '@prisma/client';

export class OrderRepository {
  private static getClient(tx?: TransactionClient) {
    return tx || prisma;
  }

  static async findStoreSettings(storeId: string, tx?: TransactionClient): Promise<EcommerceSettingsRecord | null> {
    const client = this.getClient(tx);
    return client.store.findUnique({
      where: { id: storeId },
      select: ecommerceSettingsSelect
    }) as Promise<EcommerceSettingsRecord | null>;
  }

  static async findAvailableProducts(productIds: string[], storeId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.product.findMany({
      where: {
        id: { in: productIds },
        storeId,
        isAvailable: true
      },
      select: {
        id: true,
        price: true
      }
    });
  }

  static async findCustomer(phone: string, storeId: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.customer.findFirst({
      where: {
        phone,
        storeId
      }
    });
  }

  static async createCustomer(data: Prisma.CustomerCreateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.customer.create({ data });
  }

  static async createOrder(data: Prisma.OrderCreateInput, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.order.create({
      data,
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });
  }

  static async createDeliveryOrder(data: Prisma.DeliveryOrderCreateWithoutOrderInput & { orderId: string }, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.deliveryOrder.create({
      data: {
        order: { connect: { id: data.orderId } },
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        distanceKm: data.distanceKm,
        deliveryFee: data.deliveryFee,
        status: data.status,
        estimatedTimeMinutes: data.estimatedTimeMinutes
      }
    });
  }

  static async findOrderDetails(id: string, tx?: TransactionClient) {
    const client = this.getClient(tx);
    return client.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        payments: true,
        deliveryOrder: true,
        store: true
      }
    });
  }
}
