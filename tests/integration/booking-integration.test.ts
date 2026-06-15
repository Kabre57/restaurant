import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import { BookingService } from "@/services/booking.service";

// Mock redis / sse publishers to avoid real socket calls
vi.mock("@/lib/redis-sub-manager", () => ({
  redisSub: {
    publish: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock("@/lib/redis", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/redis")>();
  return {
    ...original,
    redisPub: {
      publish: vi.fn().mockResolvedValue(1),
    },
  };
});

describe("Table Booking & Reservation Module Integration", () => {
  let testStoreId: string;
  let tableId1: string;
  let tableId2: string;

  beforeEach(async () => {
    // 1. Create a test store
    const store = await prisma.store.create({
      data: {
        name: `Resto Booking Integration ${Date.now()}`,
        commission: 12.0,
      },
    });
    testStoreId = store.id;

    // 2. Create tables
    const t1 = await prisma.table.create({
      data: {
        storeId: testStoreId,
        number: 1,
        capacity: 4,
        status: "AVAILABLE",
        isActive: true,
      },
    });
    tableId1 = t1.id;

    const t2 = await prisma.table.create({
      data: {
        storeId: testStoreId,
        number: 2,
        capacity: 2,
        status: "AVAILABLE",
        isActive: true,
      },
    });
    tableId2 = t2.id;
  });

  afterEach(async () => {
    if (testStoreId) {
      // Clean up reservation logs
      await prisma.reservationLog.deleteMany({
        where: { reservation: { storeId: testStoreId } },
      });
      // Clean up reservations
      await prisma.reservation.deleteMany({
        where: { storeId: testStoreId },
      });
      // Clean up orders
      await prisma.order.deleteMany({
        where: { storeId: testStoreId },
      });
      // Clean up tables
      await prisma.table.deleteMany({
        where: { storeId: testStoreId },
      });
      // Clean up store
      await prisma.store.delete({
        where: { id: testStoreId },
      });
    }
  });

  it("should create reservation, prevent overlaps, and check table capacity", async () => {
    const today = new Date();
    const time1 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 19, 0, 0);

    // 1. Create valid reservation
    const r1 = await BookingService.createReservation({
      storeId: testStoreId,
      tableId: tableId1,
      customerName: "Jean Dupont",
      phone: "+22501020304",
      email: "jean@dupont.com",
      date: today,
      startTime: time1,
      guests: 3,
    });

    expect(r1.id).toBeDefined();
    expect(r1.status).toBe("PENDING");
    expect(r1.tableId).toBe(tableId1);

    // 2. Try to book a reservation with too many guests for table T2 (capacity = 2, guests = 4)
    await expect(
      BookingService.createReservation({
        storeId: testStoreId,
        tableId: tableId2,
        customerName: "Marie Lobe",
        phone: "+22505050505",
        email: null,
        date: today,
        startTime: time1,
        guests: 4,
      })
    ).rejects.toThrow("Capacité insuffisante");

    // 3. Try to book an overlapping slot on table T1 (should fail)
    await expect(
      BookingService.createReservation({
        storeId: testStoreId,
        tableId: tableId1,
        customerName: "Kouassi Koffi",
        phone: "+22507070707",
        email: null,
        date: today,
        startTime: new Date(time1.getTime() + 15 * 60 * 1000), // 15 mins later (overlapping)
        guests: 2,
      })
    ).rejects.toThrow("Table non disponible sur ce créneau horaire");
  });

  it("should support auto table allocation and pick the smallest matching table", async () => {
    const today = new Date();
    const time1 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 20, 0, 0);

    // 1. Auto allocation for 2 guests should pick T2 (capacity 2) over T1 (capacity 4)
    const r1 = await BookingService.createReservation({
      storeId: testStoreId,
      tableId: "auto",
      customerName: "Kouame",
      phone: "+22508080808",
      email: null,
      date: today,
      startTime: time1,
      guests: 2,
    });

    expect(r1.tableId).toBe(tableId2);

    // 2. Auto allocation for 4 guests should pick T1 (capacity 4)
    const r2 = await BookingService.createReservation({
      storeId: testStoreId,
      tableId: "auto",
      customerName: "Yao",
      phone: "+22509090909",
      email: null,
      date: today,
      startTime: time1,
      guests: 4,
    });

    expect(r2.tableId).toBe(tableId1);
  });

  it("should set table status to OCCUPIED and generate empty order when seated", async () => {
    const today = new Date();
    const time1 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 21, 0, 0);

    // 1. Create reservation
    const resa = await BookingService.createReservation({
      storeId: testStoreId,
      tableId: tableId1,
      customerName: "Client Seated",
      phone: "+22511111111",
      email: null,
      date: today,
      startTime: time1,
      guests: 3,
    });

    // 2. Set to SEATED
    const updatedResa = await BookingService.updateStatus(resa.id, "SEATED", "POS cashier");
    expect(updatedResa.status).toBe("SEATED");

    // 3. Verify table is now OCCUPIED
    const table = await prisma.table.findUnique({
      where: { id: tableId1 },
    });
    expect(table?.status).toBe("OCCUPIED");

    // 4. Verify empty order is created in database and associated with the table
    const order = await prisma.order.findFirst({
      where: {
        storeId: testStoreId,
        tableId: tableId1,
        status: "EN_ATTENTE",
      },
    });

    expect(order).toBeDefined();
    expect(order?.type).toBe("DINE_IN");
  });
});
