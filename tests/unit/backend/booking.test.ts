import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingService } from "@/services/booking.service";
import { prisma } from "@/lib/db";
import { redisPub } from "@/lib/redis";

// Mock database and SSE pub/sub
vi.mock("@/lib/db", () => {
  const mockTable = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const mockReservation = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const mockOrder = {
    create: vi.fn(),
  };
  const mockReservationLog = {
    create: vi.fn(),
  };

  return {
    prisma: {
      table: mockTable,
      reservation: mockReservation,
      order: mockOrder,
      reservationLog: mockReservationLog,
      $transaction: vi.fn().mockImplementation((cb) => cb({
        table: mockTable,
        reservation: mockReservation,
        order: mockOrder,
        reservationLog: mockReservationLog,
      })),
    },
  };
});

vi.mock("@/lib/redis", () => ({
  redisPub: {
    publish: vi.fn().mockResolvedValue(1),
  },
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
    del: vi.fn().mockResolvedValue(1),
    keys: vi.fn().mockResolvedValue([]),
  },
  REDIS_KEYS: {
    stats: (storeId: string) => `stats:${storeId}`,
  },
}));

describe("BookingService - Table Booking & Reservations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTables", () => {
    it("should return the list of tables for a store", async () => {
      const mockTables = [
        { id: "table-1", number: "10", capacity: 4, status: "AVAILABLE", storeId: "store-1", isActive: true },
        { id: "table-2", number: "11", capacity: 2, status: "OCCUPIED", storeId: "store-1", isActive: true },
      ];
      vi.mocked(prisma.table.findMany).mockResolvedValue(mockTables as any);

      const result = await BookingService.getTables("store-1");
      expect(result).toEqual(mockTables);
      expect(prisma.table.findMany).toHaveBeenCalledWith({
        where: { storeId: "store-1", isActive: true },
        orderBy: { number: "asc" },
      });
    });
  });

  describe("getReservations", () => {
    it("should return list of reservations for a store and date", async () => {
      const mockReservations = [
        { id: "resa-1", customerName: "Client A", guests: 2, startTime: new Date() },
      ];
      vi.mocked(prisma.reservation.findMany).mockResolvedValue(mockReservations as any);

      const result = await BookingService.getReservations("store-1", "2026-06-12");
      expect(result).toEqual(mockReservations);
      expect(prisma.reservation.findMany).toHaveBeenCalled();
    });
  });

  describe("createReservation", () => {
    it("should throw error if assigned table does not exist", async () => {
      vi.mocked(prisma.table.findUnique).mockResolvedValue(null);

      await expect(
        BookingService.createReservation({
          storeId: "store-1",
          tableId: "invalid-table",
          customerName: "Alice",
          phone: "01020304",
          email: null,
          date: new Date("2026-06-12"),
          startTime: new Date("2026-06-12T19:00:00"),
          guests: 2,
        })
      ).rejects.toThrow("La table spécifiée est introuvable");
    });

    it("should throw error if assigned table capacity is too small", async () => {
      vi.mocked(prisma.table.findUnique).mockResolvedValue({
        id: "table-1",
        number: "5",
        capacity: 2,
        isActive: true,
      } as any);

      await expect(
        BookingService.createReservation({
          storeId: "store-1",
          tableId: "table-1",
          customerName: "Alice",
          phone: "01020304",
          email: null,
          date: new Date("2026-06-12"),
          startTime: new Date("2026-06-12T19:00:00"),
          guests: 4,
        })
      ).rejects.toThrow("Capacité insuffisante : la table #5 accueille max 2 personnes (demandé: 4)");
    });

    it("should throw error if there is an overlapping reservation", async () => {
      vi.mocked(prisma.table.findUnique).mockResolvedValue({
        id: "table-1",
        number: "5",
        capacity: 4,
        isActive: true,
      } as any);

      // Mock existing reservation in overlap slot
      vi.mocked(prisma.reservation.findMany).mockResolvedValue([
        { id: "existing-resa" },
      ] as any);

      await expect(
        BookingService.createReservation({
          storeId: "store-1",
          tableId: "table-1",
          customerName: "Alice",
          phone: "01020304",
          email: null,
          date: new Date("2026-06-12"),
          startTime: new Date("2026-06-12T19:00:00"),
          guests: 2,
        })
      ).rejects.toThrow("Table non disponible sur ce créneau horaire");
    });

    it("should automatically allocate a table if tableId is 'auto'", async () => {
      const mockTables = [
        { id: "table-1", number: "10", capacity: 4, isActive: true },
        { id: "table-2", number: "11", capacity: 2, isActive: true },
      ];
      vi.mocked(prisma.table.findMany).mockResolvedValue(mockTables as any);
      vi.mocked(prisma.reservation.findMany).mockResolvedValue([]); // No overlaps
      vi.mocked(prisma.reservation.create).mockResolvedValue({
        id: "resa-new",
        customerName: "Alice",
        guests: 2,
        tableId: "table-2", // Autodelegated smallest capacity table
      } as any);

      const result = await BookingService.createReservation({
        storeId: "store-1",
        tableId: "auto",
        customerName: "Alice",
        phone: "01020304",
        email: null,
        date: new Date("2026-06-12"),
        startTime: new Date("2026-06-12T19:00:00"),
        guests: 2,
      });

      expect(result.id).toBe("resa-new");
      expect(result.tableId).toBe("table-2");
      expect(redisPub.publish).toHaveBeenCalled();
    });
  });

  describe("updateStatus", () => {
    it("should allow transitioning from PENDING to CONFIRMED", async () => {
      const mockResa = {
        id: "resa-1",
        status: "PENDING",
        tableId: "table-1",
        storeId: "store-1",
        table: { id: "table-1", status: "AVAILABLE" },
      };
      vi.mocked(prisma.reservation.findUnique).mockResolvedValue(mockResa as any);
      vi.mocked(prisma.reservation.update).mockResolvedValue({
        ...mockResa,
        status: "CONFIRMED",
      } as any);

      const result = await BookingService.updateStatus("resa-1", "CONFIRMED", "Admin");
      expect(result.status).toBe("CONFIRMED");
      expect(redisPub.publish).toHaveBeenCalled();
    });

    it("should set table status to OCCUPIED and auto-create order when reservation is SEATED", async () => {
      const mockResa = {
        id: "resa-1",
        status: "CONFIRMED",
        tableId: "table-1",
        storeId: "store-1",
        guests: 3,
        customerName: "Alice",
        table: { id: "table-1", number: "5", status: "AVAILABLE" },
      };

      vi.mocked(prisma.reservation.findUnique).mockResolvedValue(mockResa as any);
      vi.mocked(prisma.table.findUnique).mockResolvedValue(mockResa.table as any);
      vi.mocked(prisma.reservation.update).mockResolvedValue({
        ...mockResa,
        status: "SEATED",
      } as any);

      const result = await BookingService.updateStatus("resa-1", "SEATED", "Admin");

      expect(result.status).toBe("SEATED");
      // Check table state is updated
      expect(prisma.table.update).toHaveBeenCalledWith({
        where: { id: "table-1" },
        data: { status: "OCCUPIED" },
      });
      // Check empty order is created
      expect(prisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            storeId: "store-1",
            tableId: "table-1",
            status: "EN_ATTENTE",
            type: "DINE_IN",
          }),
        })
      );
    });

    it("should throw error when seating and table is already occupied", async () => {
      const mockResa = {
        id: "resa-1",
        status: "CONFIRMED",
        tableId: "table-1",
        storeId: "store-1",
        table: { id: "table-1", status: "OCCUPIED" },
      };

      vi.mocked(prisma.reservation.findUnique).mockResolvedValue(mockResa as any);

      await expect(
        BookingService.updateStatus("resa-1", "SEATED", "Admin")
      ).rejects.toThrow("Impossible d'installer le client : la table est déjà occupée");
    });
  });
});
