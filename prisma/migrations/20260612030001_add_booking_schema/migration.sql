-- AlterTable
ALTER TABLE "Table" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN "email" TEXT,
ADD COLUMN "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "endTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "ReservationLog" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "utilisateur" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReservationLog_reservationId_idx" ON "ReservationLog"("reservationId");

-- AddForeignKey
ALTER TABLE "ReservationLog" ADD CONSTRAINT "ReservationLog_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "reservationId" TEXT;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
