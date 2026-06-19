import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { SYNC_ORDER_SCHEMA_VERSION, type SyncLocalStatus, type SyncOrderInput } from '@/lib/offline-sync';

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
export type QueuedOrder = SyncOrderInput & {
  id?: number;
  createdAt?: number;
  queuedAt?: string;
  localStatus?: SyncLocalStatus;
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
  dbPromise = openDB<POSDB>('pos-db', 2, {
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

type QueueableOrder = Omit<SyncOrderInput, 'schemaVersion' | 'queuedAt' | 'localStatus'> &
  Partial<Pick<SyncOrderInput, 'schemaVersion' | 'queuedAt' | 'localStatus'>>

export async function addOrderToSyncQueue(order: QueueableOrder) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.add('sync_orders', {
    ...order,
    schemaVersion: order.schemaVersion ?? SYNC_ORDER_SCHEMA_VERSION,
    queuedAt: order.queuedAt ?? new Date().toISOString(),
    localStatus: order.localStatus ?? 'PENDING_SYNC',
    createdAt: Date.now(),
  });
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
  const orders = await db.getAll('sync_orders');
  const staleOrders = orders.filter((order) => {
    const queuedAtMs = order.queuedAt ? Date.parse(order.queuedAt) : order.createdAt ?? 0;
    return queuedAtMs > 0 && queuedAtMs < cutoff && order.localStatus !== 'SYNCED';
  });

  if (staleOrders.length > 0) {
    console.warn(
      `[OfflineSync] ${staleOrders.length} commande(s) hors-ligne dépassent 24h sans synchronisation. Aucune suppression automatique n'a été effectuée.`
    );
  }

  return staleOrders.length;
}

export async function updateSyncQueueItem(id: number, patch: Partial<QueuedOrder>) {
  if (!dbPromise) return;
  const db = await dbPromise;
  const current = await db.get('sync_orders', id);
  if (!current) return;
  await db.put('sync_orders', { ...current, ...patch, id });
}

export async function markSyncQueueItemFailed(id: number, error: string) {
  await updateSyncQueueItem(id, {
    localStatus: 'FAILED',
    lastError: error,
  });
}

export async function clearSyncQueueItem(id: number) {
  if (!dbPromise) return;
  const db = await dbPromise;
  await db.delete('sync_orders', id);
}
