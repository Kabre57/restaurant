import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type CachedCategory = { id: string; name: string; imageUrl: string | null };
export type CachedProduct = {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  image: string | null;
  averagePrepTimeMins?: number | null;
  isAvailable?: boolean;
  stockQuantity?: number | null;
  trackStock?: boolean | null;
  barcode?: string | null;
};
export type QueuedOrder = {
  id?: number;
  clientRequestId: string;
  storeId: string;
  cashierId: string;
  total: number;
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  paymentMode: string;
  items: { productId: string; quantity: number; price: number; name?: string; options?: string }[];
  createdAt: number;
};

const DEFAULT_SYNC_QUEUE_TTL_MS = 24 * 60 * 60 * 1000;

interface POSDB extends DBSchema {
  categories: {
    key: string;
    value: CachedCategory;
  };
  products: {
    key: string;
    value: CachedProduct;
  };
  sync_orders: {
    key: number;
    value: QueuedOrder;
    autoIncrement: true;
  };
}

let dbPromise: Promise<IDBPDatabase<POSDB>> | null = null;

if (typeof window !== 'undefined') {
  dbPromise = openDB<POSDB>('pos-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sync_orders')) {
        db.createObjectStore('sync_orders', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function saveCategoriesToIDB(categories: CachedCategory[]) {
  if (!dbPromise) return;
  const db = await dbPromise;
  const tx = db.transaction('categories', 'readwrite');
  await Promise.all(categories.map(c => tx.store.put(c)));
  await tx.done;
}

export async function saveProductsToIDB(products: CachedProduct[]) {
  if (!dbPromise) return;
  const db = await dbPromise;
  const tx = db.transaction('products', 'readwrite');
  await Promise.all(products.map(p => tx.store.put(p)));
  await tx.done;
}

export async function getCategoriesFromIDB() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return db.getAll('categories');
}

export async function getProductsFromIDB() {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return db.getAll('products');
}

export async function addOrderToSyncQueue(order: Omit<QueuedOrder, 'id' | 'createdAt'>) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.add('sync_orders', { ...order, createdAt: Date.now() });
}

export async function getSyncQueue(): Promise<QueuedOrder[]> {
  if (!dbPromise) return [];
  const db = await dbPromise;
  return db.getAll('sync_orders');
}

export async function purgeStaleSyncQueue(maxAgeMs = DEFAULT_SYNC_QUEUE_TTL_MS) {
  if (!dbPromise) return 0;
  const db = await dbPromise;
  const cutoff = Date.now() - maxAgeMs;
  const tx = db.transaction('sync_orders', 'readwrite');
  const orders = await tx.store.getAll();
  const staleOrders = orders.filter(order => typeof order.id === 'number' && order.createdAt < cutoff);

  await Promise.all(staleOrders.map(order => tx.store.delete(order.id as number)));
  await tx.done;

  return staleOrders.length;
}

export async function clearSyncQueueItem(id: number) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('sync_orders', id);
}
