-- Align existing schema changes that were already present in schema.prisma.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'RESTAURATEUR';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DELIVERY';

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('ONLINE', 'OFFLINE', 'BUSY');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ESPECES', 'CB', 'MOBILE_MONEY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('EN_ATTENTE', 'REUSSIE', 'ECHOUEE', 'REMBOURSEE');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "clientRequestId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "deliveryPersonId" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "commission" DOUBLE PRECISION NOT NULL DEFAULT 15.0;

-- AlterTable
ALTER TABLE "Category" ADD COLUMN "imageUrl" TEXT;

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "siteName" TEXT NOT NULL DEFAULT 'Ma Plateforme',
    "currency" TEXT NOT NULL DEFAULT 'FCFA',
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "minWithdrawal" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "enforce2FA" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryPerson" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'OFFLINE',
    "vehicleType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'REUSSIE',
    "amount" DOUBLE PRECISION NOT NULL,
    "externalRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_clientRequestId_key" ON "Order"("clientRequestId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryPersonId_fkey" FOREIGN KEY ("deliveryPersonId") REFERENCES "DeliveryPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
