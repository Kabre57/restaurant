import { prisma } from '@/lib/db'

export class StoreService {
  /**
   * Récupère la liste des magasins accessibles pour un utilisateur donné selon son rôle
   */
  static async getStoresForUser(userId: string, role: string, userStoreId: string) {
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
      return prisma.store.findMany({
        orderBy: { name: 'asc' },
      })
    }

    // Récupérer l'utilisateur avec ses magasins associés (many-to-many)
    const userWithStores = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stores: true,
      },
    })

    if (!userWithStores) return []

    // Fusionner le store principal et les stores assignés, éliminer les doublons par ID
    const storesMap = new Map<string, any>()
    
    // Ajouter le store par défaut s'il existe
    const defaultStore = await prisma.store.findUnique({
      where: { id: userStoreId },
    })
    if (defaultStore) {
      storesMap.set(defaultStore.id, defaultStore)
    }

    // Ajouter les stores many-to-many
    userWithStores.stores.forEach(s => {
      storesMap.set(s.id, s)
    })

    return Array.from(storesMap.values())
  }

  /**
   * Crée un nouveau magasin dans le réseau (Console Franchise)
   */
  static async createStore(data: {
    name: string
    code?: string
    timezone?: string
    address?: string
    phone?: string
    email?: string
    parentId?: string
    commission?: number
  }) {
    return prisma.store.create({
      data: {
        name: data.name,
        code: data.code || null,
        timezone: data.timezone || 'UTC',
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        parentId: data.parentId || null,
        commission: data.commission ?? 15,
      },
    })
  }

  /**
   * Récupère un résumé analytique complet de tous les magasins pour le hub d'accueil centralisé
   */
  static async getStoreHubSummary() {
    const stores = await prisma.store.findMany({
      include: {
        parent: {
          select: { name: true }
        },
        _count: {
          select: {
            users: true,
            products: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    const summaries = []

    for (const store of stores) {
      // Calculer le CA total (sur les commandes COMPLETED)
      const salesAgg = await prisma.order.aggregate({
        where: {
          storeId: store.id,
          status: 'COMPLETED',
        },
        _sum: {
          total: true,
        },
      })

      // Somme totale des stocks des produits dans ce magasin
      const stockAgg = await prisma.product.aggregate({
        where: {
          storeId: store.id,
        },
        _sum: {
          stockQuantity: true,
        },
      })

      // Nombre total d'employés affectés (soit storeId principal, soit dans la table d'association many-to-many)
      const directEmployees = await prisma.user.count({
        where: { storeId: store.id },
      })
      const assignedEmployees = await prisma.user.count({
        where: {
          stores: {
            some: { id: store.id }
          },
          NOT: {
            storeId: store.id // éviter les doublons
          }
        }
      })

      summaries.push({
        id: store.id,
        name: store.name,
        code: store.code,
        address: store.address,
        commission: store.commission,
        parentName: store.parent?.name || null,
        totalSales: salesAgg._sum.total || 0,
        totalStock: stockAgg._sum.stockQuantity || 0,
        employeeCount: directEmployees + assignedEmployees,
        productsCount: store._count.products,
      })
    }

    return summaries
  }
}
