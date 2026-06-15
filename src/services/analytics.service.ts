// src/services/analytics.service.ts
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { format, startOfDay, endOfDay, eachDayOfInterval, eachMonthOfInterval, eachHourOfInterval, isWithinInterval } from "date-fns";

export interface DashboardParams {
  startDate: Date;
  endDate: Date;
  storeId?: string;
  period: "hour" | "day" | "month" | "year";
}

export interface KPIStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalGuests: number;
  reservationConversionRate: number;
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  ordersCount: number;
}

export interface TopProductItem {
  id: string;
  name: string;
  quantitySold: number;
  revenue: number;
  costPrice: number;
  marginAmount: number;
  marginPercent: number;
}

export interface MarginProductItem {
  id: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  marginAmount: number;
  marginPercent: number;
}

export interface DashboardReport {
  kpis: KPIStats;
  revenueChart: RevenuePoint[];
  topProducts: TopProductItem[];
  marginProducts: MarginProductItem[];
}

export class AnalyticsService {
  /**
   * Calculates the true recipe cost price of a product based on its ProductIngredient table.
   * Falls back to the direct product.costPrice if no ingredients are specified.
   */
  static async getProductCostPrice(productId: string, prismaClient = prisma): Promise<number> {
    const product = await prismaClient.product.findUnique({
      where: { id: productId },
      include: {
        ingredients: {
          include: {
            ingredientBase: true,
            ingredientProduct: {
              include: {
                ingredients: {
                  include: {
                    ingredientBase: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) return 0;
    if (!product.ingredients || product.ingredients.length === 0) {
      return product.costPrice || 0;
    }

    let totalCost = 0;
    for (const pi of product.ingredients) {
      if (pi.isSubRecipe && pi.ingredientProduct) {
        let subCost = pi.ingredientProduct.costPrice || 0;
        if (pi.ingredientProduct.ingredients && pi.ingredientProduct.ingredients.length > 0) {
          subCost = pi.ingredientProduct.ingredients.reduce((acc, subPi) => {
            const cost = subPi.ingredientBase?.costPrice || 0;
            return acc + subPi.quantity * cost;
          }, 0);
        }
        totalCost += pi.quantity * subCost;
      } else if (pi.ingredientBase) {
        totalCost += pi.quantity * (pi.ingredientBase.costPrice || 0);
      }
    }
    return totalCost;
  }

  /**
   * Helper to set dashboard cache and track the cache keys to allow easy invalidation.
   */
  static async setCachedDashboard(key: string, storeId: string, data: DashboardReport): Promise<void> {
    await redis.setex(key, 300, JSON.stringify(data)); // 5 minutes cache
    
    // Track keys to invalidate them on orders/reservations updates
    const trackKey = `analytics:keys:${storeId}`;
    try {
      const keysStr = await redis.get(trackKey);
      const keys: string[] = keysStr ? JSON.parse(keysStr) : [];
      if (!keys.includes(key)) {
        keys.push(key);
        await redis.setex(trackKey, 86400, JSON.stringify(keys)); // 24 hours tracker TTL
      }
    } catch (e) {
      console.error("[Analytics Cache Tracker Error]:", e);
    }
  }

  /**
   * Public function to invalidate all analytics caches for a store.
   */
  static async invalidateStoreAnalytics(storeId: string): Promise<void> {
    const trackKey = `analytics:keys:${storeId}`;
    try {
      const keysStr = await redis.get(trackKey);
      if (keysStr) {
        const keys: string[] = JSON.parse(keysStr);
        for (const k of keys) {
          await redis.del(k);
        }
        await redis.del(trackKey);
      }
    } catch (e) {
      console.error("[Analytics Cache Invalidation Error]:", e);
    }
  }

  /**
   * Retrieve the complete analytical report for the dashboard.
   */
  static async getDashboard(params: DashboardParams): Promise<DashboardReport> {
    const storeId = params.storeId || "global";
    const cacheKey = `analytics:${storeId}:${params.period}:${params.startDate.getTime()}:${params.endDate.getTime()}`;

    // 1. Try cache
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as DashboardReport;
      }
    } catch (e) {
      console.error("[Analytics Cache Read Error]:", e);
    }

    // 2. Fetch raw data from DB
    const storeFilter = params.storeId ? { storeId: params.storeId } : {};

    // Orders in interval (excluding CANCELLED)
    const orders = await prisma.order.findMany({
      where: {
        ...storeFilter,
        createdAt: {
          gte: params.startDate,
          lte: params.endDate,
        },
        status: {
          not: "CANCELLED",
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Reservations in interval
    const reservations = await prisma.reservation.findMany({
      where: {
        ...storeFilter,
        date: {
          gte: params.startDate,
          lte: params.endDate,
        },
      },
    });

    // 3. Compute KPI stats
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Seated / Completed / Confirmed covers count
    const totalGuests = reservations
      .filter((r) => ["SEATED", "CONFIRMED", "COMPLETED"].includes(r.status))
      .reduce((sum, r) => sum + r.guests, 0);

    // Reservation conversion rate
    const totalReservations = reservations.length;
    const convertedReservations = reservations.filter((r) =>
      ["SEATED", "CONFIRMED", "COMPLETED"].includes(r.status)
    ).length;
    const reservationConversionRate =
      totalReservations > 0 ? (convertedReservations / totalReservations) * 100 : 0;

    const kpis: KPIStats = {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      totalGuests,
      reservationConversionRate,
    };

    // 4. Generate Revenue Chart Points
    let revenueChart: RevenuePoint[] = [];
    if (params.period === "hour") {
      const hours = eachHourOfInterval({ start: params.startDate, end: params.endDate });
      revenueChart = hours.map((hr) => {
        const label = format(hr, "HH:00");
        const hrOrders = orders.filter((o) => {
          const oHour = startOfDay(o.createdAt).getTime() === startOfDay(hr).getTime() &&
                        o.createdAt.getHours() === hr.getHours();
          return oHour;
        });
        return {
          label,
          revenue: hrOrders.reduce((sum, o) => sum + o.total, 0),
          ordersCount: hrOrders.length,
        };
      });
    } else if (params.period === "day") {
      const days = eachDayOfInterval({ start: params.startDate, end: params.endDate });
      revenueChart = days.map((d) => {
        const label = format(d, "yyyy-MM-dd");
        const dayOrders = orders.filter(
          (o) => format(o.createdAt, "yyyy-MM-dd") === label
        );
        return {
          label,
          revenue: dayOrders.reduce((sum, o) => sum + o.total, 0),
          ordersCount: dayOrders.length,
        };
      });
    } else if (params.period === "month") {
      const months = eachMonthOfInterval({ start: params.startDate, end: params.endDate });
      revenueChart = months.map((m) => {
        const label = format(m, "yyyy-MM");
        const monthOrders = orders.filter(
          (o) => format(o.createdAt, "yyyy-MM") === label
        );
        return {
          label,
          revenue: monthOrders.reduce((sum, o) => sum + o.total, 0),
          ordersCount: monthOrders.length,
        };
      });
    } else {
      // year period
      const years = Array.from(
        new Set(orders.map((o) => o.createdAt.getFullYear()))
      ).sort();
      if (years.length === 0) {
        years.push(new Date().getFullYear());
      }
      revenueChart = years.map((yr) => {
        const label = String(yr);
        const yrOrders = orders.filter((o) => o.createdAt.getFullYear() === yr);
        return {
          label,
          revenue: yrOrders.reduce((sum, o) => sum + o.total, 0),
          ordersCount: yrOrders.length,
        };
      });
    }

    // 5. Compute Top Products
    const productSalesMap = new Map<string, { name: string; qty: number; rev: number }>();
    for (const o of orders) {
      for (const item of o.items) {
        const current = productSalesMap.get(item.productId) || {
          name: item.product.name,
          qty: 0,
          rev: 0,
        };
        current.qty += item.quantity;
        current.rev += item.quantity * item.price;
        productSalesMap.set(item.productId, current);
      }
    }

    const topProductsListRaw = Array.from(productSalesMap.entries()).map(([id, val]) => ({
      id,
      name: val.name,
      quantitySold: val.qty,
      revenue: val.rev,
    }));

    // Sort by revenue desc and take top 10
    const sortedTopProducts = topProductsListRaw
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topProducts: TopProductItem[] = [];
    for (const p of sortedTopProducts) {
      const costPrice = await this.getProductCostPrice(p.id);
      const totalCost = costPrice * p.quantitySold;
      const marginAmount = p.revenue - totalCost;
      const marginPercent = p.revenue > 0 ? (marginAmount / p.revenue) * 100 : 0;
      topProducts.push({
        ...p,
        costPrice,
        marginAmount,
        marginPercent,
      });
    }

    // 6. Compute margins for all products sold
    const marginProducts: MarginProductItem[] = [];
    const uniqueProductIds = Array.from(productSalesMap.keys());
    for (const pId of uniqueProductIds) {
      const productInfo = await prisma.product.findUnique({
        where: { id: pId },
        select: { name: true, price: true },
      });
      if (productInfo) {
        const costPrice = await this.getProductCostPrice(pId);
        const marginAmount = productInfo.price - costPrice;
        const marginPercent =
          productInfo.price > 0 ? (marginAmount / productInfo.price) * 100 : 0;
        marginProducts.push({
          id: pId,
          name: productInfo.name,
          sellingPrice: productInfo.price,
          costPrice,
          marginAmount,
          marginPercent,
        });
      }
    }

    const report: DashboardReport = {
      kpis,
      revenueChart,
      topProducts,
      marginProducts,
    };

    // 7. Cache results
    try {
      await this.setCachedDashboard(cacheKey, storeId, report);
    } catch (e) {
      console.error("[Analytics Cache Write Error]:", e);
    }

    return report;
  }
}
