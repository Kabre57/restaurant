import { TransactionClient } from '@/infrastructure/prisma/transaction';
import { EcommerceSettingsRecord } from '@/domain/orders/ecommerce-settings';
import { Prisma } from '@prisma/client';

export interface IOrderRepository {
  findStoreSettings(storeId: string, tx?: TransactionClient): Promise<EcommerceSettingsRecord | null>;
  findAvailableProducts(productIds: string[], storeId: string, tx?: TransactionClient): Promise<any[]>;
  findCustomer(phone: string, storeId: string, tx?: TransactionClient): Promise<any>;
  createCustomer(data: Prisma.CustomerCreateInput, tx?: TransactionClient): Promise<any>;
  createOrder(data: Prisma.OrderCreateInput, tx?: TransactionClient): Promise<any>;
  createDeliveryOrder(data: Prisma.DeliveryOrderCreateWithoutOrderInput & { orderId: string }, tx?: TransactionClient): Promise<any>;
  findOrderDetails(id: string, tx?: TransactionClient): Promise<any>;
}
