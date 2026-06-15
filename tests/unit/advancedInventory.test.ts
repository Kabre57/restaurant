import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';
import { 
  createSupplier, 
  createPurchaseOrder, 
  receivePurchaseOrder 
} from '@/app/actions/inventory/purchaseOrders';
import { 
  createTransferOrder, 
  shipTransferOrder, 
  receiveTransferOrder 
} from '@/app/actions/inventory/transferOrders';
import { 
  createPhysicalInventory, 
  updatePhysicalCount, 
  completePhysicalInventory 
} from '@/app/actions/inventory/physicalInventory';

// Mock Prisma
vi.mock('@/lib/db', () => {
  return {
    prisma: {
      supplier: {
        create: vi.fn(),
      },
      purchaseOrder: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      stockMovement: {
        create: vi.fn(),
      },
      transferOrder: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      physicalInventory: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      physicalInventoryItem: {
        update: vi.fn(),
      },
      store: {
        findMany: vi.fn(),
      }
    },
  };
});

// Mock next/cache
vi.mock('next/cache', () => {
  return {
    revalidatePath: vi.fn(),
  };
});

// Mock requireAuth
vi.mock('@/lib/auth-guard', () => {
  return {
    requireAuth: vi.fn().mockResolvedValue({
      storeId: 'store-1',
      role: 'RESTAURATEUR',
      userId: 'user-1'
    }),
    assertSameStore: vi.fn()
  };
});

describe('Advanced Inventory Management Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Suppliers and Purchase Orders', () => {
    it('should successfully create a supplier', async () => {
      const data = { name: 'Supplier A', email: 'sup@a.com', phone: '123' };
      vi.mocked(prisma.supplier.create).mockResolvedValue({ id: 'sup-1', storeId: 'store-1', ...data, address: null, contactName: null, taxId: null, notes: null, isActive: true, createdAt: new Date(), updatedAt: new Date() });

      const res = await createSupplier(data);
      expect(res.name).toBe('Supplier A');
      expect(prisma.supplier.create).toHaveBeenCalled();
    });

    it('should successfully receive a purchase order and update stock/cost price', async () => {
      const poId = 'po-1';
      vi.mocked(prisma.purchaseOrder.findUnique).mockResolvedValue({
        id: poId,
        poNumber: 'PO-123',
        storeId: 'store-1',
        supplierId: 'sup-1',
        status: 'SENT',
        orderDate: new Date(),
        expectedDate: null,
        receivedDate: null,
        notes: null,
        subtotal: 1000,
        taxAmount: 180,
        totalAmount: 1180,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'item-1',
            purchaseOrderId: poId,
            productId: 'prod-1',
            quantity: 10,
            receivedQuantity: 0,
            unitCost: 100,
            totalCost: 1000,
          }
        ]
      } as any);

      vi.mocked(prisma.purchaseOrder.update).mockResolvedValue({ id: poId } as any);
      vi.mocked(prisma.product.update).mockResolvedValue({ id: 'prod-1' } as any);

      await receivePurchaseOrder(poId);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: {
          stockQuantity: { increment: 10 },
          costPrice: 100
        }
      });

      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: 'prod-1',
          storeId: 'store-1',
          quantity: 10,
          reason: 'DELIVERY',
          referenceId: poId,
          note: expect.stringContaining('PO-123')
        }
      });
    });
  });

  describe('Inter-store Transfers', () => {
    it('should successfully ship a transfer order and decrement origin stock', async () => {
      const transferId = 'tr-1';
      vi.mocked(prisma.transferOrder.findUnique).mockResolvedValue({
        id: transferId,
        transferNumber: 'TR-001',
        fromStoreId: 'store-1',
        toStoreId: 'store-2',
        status: 'PENDING',
        requestedBy: 'user-1',
        approvedBy: null,
        requestDate: new Date(),
        shipDate: null,
        receiveDate: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'tr-item-1',
            transferOrderId: transferId,
            productId: 'prod-1',
            quantity: 5,
            unitCost: 100,
            totalCost: 500,
          }
        ]
      } as any);

      vi.mocked(prisma.product.findUnique).mockResolvedValue({
        id: 'prod-1',
        name: 'Product 1',
        stockQuantity: 10
      } as any);

      await shipTransferOrder(transferId);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: {
          stockQuantity: { decrement: 5 }
        }
      });

      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: 'prod-1',
          storeId: 'store-1',
          quantity: -5,
          reason: 'TRANSFER_OUT',
          referenceId: transferId,
          note: expect.stringContaining('TR-001')
        }
      });
    });
  });

  describe('Physical Inventory Reconciliation', () => {
    it('should complete physical inventory, adjust stock and record correct reason', async () => {
      const invId = 'inv-1';
      vi.mocked(prisma.physicalInventory.findUnique).mockResolvedValue({
        id: invId,
        name: 'Count June',
        storeId: 'store-1',
        status: 'IN_PROGRESS',
        scheduledDate: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: 'inv-item-1',
            physicalInventoryId: invId,
            productId: 'prod-1',
            expectedQuantity: 10,
            countedQuantity: 8,
            difference: -2,
            notes: 'Damaged'
          }
        ]
      } as any);

      await completePhysicalInventory(invId);

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: {
          stockQuantity: 8
        }
      });

      expect(prisma.stockMovement.create).toHaveBeenCalledWith({
        data: {
          productId: 'prod-1',
          storeId: 'store-1',
          quantity: -2,
          reason: 'WASTE',
          referenceId: invId,
          note: expect.stringContaining('June')
        }
      });
    });
  });
});
