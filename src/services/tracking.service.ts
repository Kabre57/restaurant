// src/services/tracking.service.ts
import { prisma } from "@/lib/db";
import { redisPub } from "@/lib/redis";

export class TrackingService {
  /**
   * Records driver GPS location and updates their active driver profile.
   * Also publishes the location update to Redis for real-time subscribers.
   */
  static async recordPosition(
    deliveryOrderId: string,
    livreurId: string,
    latitude: number,
    longitude: number
  ) {
    // 1. Create a tracking point
    const tracking = await prisma.deliveryTracking.create({
      data: {
        deliveryOrderId,
        livreurId,
        latitude,
        longitude,
      },
    });

    // 2. Update DeliveryDriver profile's current location
    await prisma.deliveryDriver.upsert({
      where: { userId: livreurId },
      update: {
        latitude,
        longitude,
      },
      create: {
        userId: livreurId,
        latitude,
        longitude,
        isActive: true,
      },
    });

    // 3. Publish to Redis for real-time subscribers
    try {
      if (redisPub && redisPub.publish) {
        await redisPub.publish(
          `delivery:${deliveryOrderId}:location`,
          JSON.stringify({
            deliveryOrderId,
            livreurId,
            latitude,
            longitude,
            timestamp: tracking.timestamp,
          })
        );
      }
    } catch (redisErr) {
      console.warn("Failed to publish tracking update to Redis:", redisErr);
    }

    return tracking;
  }

  /**
   * Retrieves the full history of coordinates for a delivery order
   */
  static async getTrackingHistory(deliveryOrderId: string) {
    return prisma.deliveryTracking.findMany({
      where: { deliveryOrderId },
      orderBy: { timestamp: "asc" },
    });
  }

  /**
   * Retrieves the latest tracking location for a delivery order
   */
  static async getLatestTracking(deliveryOrderId: string) {
    return prisma.deliveryTracking.findFirst({
      where: { deliveryOrderId },
      orderBy: { timestamp: "desc" },
    });
  }
}
