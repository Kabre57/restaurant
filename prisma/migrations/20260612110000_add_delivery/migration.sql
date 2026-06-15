-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'LIVREUR';

-- CreateEnum
CREATE TYPE "DeliveryOrderStatus" AS ENUM ('PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "DeliveryOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "distanceKm" DECIMAL(65,30),
    "deliveryFee" DECIMAL(65,30) NOT NULL,
    "status" "DeliveryOrderStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedTimeMinutes" INTEGER,
    "startedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "livreurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryDriver" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryDriver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryTracking" (
    "id" TEXT NOT NULL,
    "deliveryOrderId" TEXT NOT NULL,
    "livreurId" TEXT NOT NULL,
    "latitude" DECIMAL(65,30) NOT NULL,
    "longitude" DECIMAL(65,30) NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryTracking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryOrder_orderId_key" ON "DeliveryOrder"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryOrder_livreurId_idx" ON "DeliveryOrder"("livreurId");

-- CreateIndex
CREATE INDEX "DeliveryOrder_status_idx" ON "DeliveryOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryDriver_userId_key" ON "DeliveryDriver"("userId");

-- CreateIndex
CREATE INDEX "DeliveryTracking_deliveryOrderId_idx" ON "DeliveryTracking"("deliveryOrderId");

-- CreateIndex
CREATE INDEX "DeliveryTracking_livreurId_idx" ON "DeliveryTracking"("livreurId");

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryOrder" ADD CONSTRAINT "DeliveryOrder_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryDriver" ADD CONSTRAINT "DeliveryDriver_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTracking" ADD CONSTRAINT "DeliveryTracking_deliveryOrderId_fkey" FOREIGN KEY ("deliveryOrderId") REFERENCES "DeliveryOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryTracking" ADD CONSTRAINT "DeliveryTracking_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
