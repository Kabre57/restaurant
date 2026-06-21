/*
  Warnings:

  - A unique constraint covering the columns `[storeId,barcode]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,ingredientId,sectionGroup]` on the table `ProductIngredient` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `unit` to the `ProductIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ProductIngredient` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkflowType" AS ENUM ('CASHIER_ONLY', 'SERVER_FIRST');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PENDING', 'APPROVED', 'SHIPPED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MvtReason" ADD VALUE 'TRANSFER_IN';
ALTER TYPE "MvtReason" ADD VALUE 'TRANSFER_OUT';

-- DropIndex
DROP INDEX "ProductIngredient_productId_ingredientId_key";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "HrConfiguration" ADD COLUMN     "accidentTravailRate" DOUBLE PRECISION DEFAULT 3.0,
ADD COLUMN     "adresseSiege" TEXT,
ADD COLUMN     "apprentissageRate" DOUBLE PRECISION DEFAULT 0.4,
ADD COLUMN     "cmuPatronalFixe" DOUBLE PRECISION DEFAULT 500,
ADD COLUMN     "cmuRate" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "cmuSalarialFixe" DOUBLE PRECISION DEFAULT 1000,
ADD COLUMN     "compteContribuable" TEXT,
ADD COLUMN     "formationRate" DOUBLE PRECISION DEFAULT 0.6,
ADD COLUMN     "horaireJournalier" DOUBLE PRECISION DEFAULT 8.0,
ADD COLUMN     "joursParSemaine" INTEGER DEFAULT 5,
ADD COLUMN     "nomEntreprise" TEXT,
ADD COLUMN     "numeroCnps" TEXT,
ADD COLUMN     "prestFamilialeRate" DOUBLE PRECISION DEFAULT 5.75,
ADD COLUMN     "registreCommerce" TEXT,
ADD COLUMN     "telephone" TEXT;

-- AlterTable
ALTER TABLE "Ingredient" ALTER COLUMN "unit" SET DEFAULT 'unité';

-- AlterTable
ALTER TABLE "Loyalty" ADD COLUMN     "pointsMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "loyaltyPointsEarned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "loyaltyPointsRedeemed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payroll" ADD COLUMN     "details" JSONB;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "costPrice" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "ProductIngredient" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isSubRecipe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preparationNote" TEXT,
ADD COLUMN     "sectionGroup" TEXT,
ADD COLUMN     "unit" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "applicableId" TEXT,
ADD COLUMN     "applicableTo" TEXT NOT NULL DEFAULT 'ALL',
ADD COLUMN     "daysOfWeek" INTEGER[] DEFAULT ARRAY[0, 1, 2, 3, 4, 5, 6]::INTEGER[],
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "maxDiscount" DOUBLE PRECISION,
ADD COLUMN     "minOrderAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "startTime" TEXT;

-- AlterTable
ALTER TABLE "Reservation" ALTER COLUMN "startTime" DROP DEFAULT,
ALTER COLUMN "endTime" DROP DEFAULT;

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN     "workflowType" "WorkflowType" NOT NULL DEFAULT 'SERVER_FIRST';

-- CreateTable
CREATE TABLE "Timecard" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockOut" TIMESTAMP(3),
    "duration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClotureMois" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT true,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedBy" TEXT NOT NULL,

    CONSTRAINT "ClotureMois_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomPermission" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "contactName" TEXT,
    "taxId" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "notes" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PurchaseOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferOrder" (
    "id" TEXT NOT NULL,
    "transferNumber" TEXT NOT NULL,
    "fromStoreId" TEXT NOT NULL,
    "toStoreId" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shipDate" TIMESTAMP(3),
    "receiveDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferOrderItem" (
    "id" TEXT NOT NULL,
    "transferOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "TransferOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalInventory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhysicalInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalInventoryItem" (
    "id" TEXT NOT NULL,
    "physicalInventoryId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "expectedQuantity" DOUBLE PRECISION NOT NULL,
    "countedQuantity" DOUBLE PRECISION,
    "difference" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "PhysicalInventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Timecard_storeId_userId_idx" ON "Timecard"("storeId", "userId");

-- CreateIndex
CREATE INDEX "RolePermission_storeId_role_idx" ON "RolePermission"("storeId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_storeId_role_permissionKey_key" ON "RolePermission"("storeId", "role", "permissionKey");

-- CreateIndex
CREATE INDEX "ClotureMois_storeId_idx" ON "ClotureMois"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "ClotureMois_storeId_period_key" ON "ClotureMois"("storeId", "period");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_permissionKey_key" ON "UserPermission"("userId", "permissionKey");

-- CreateIndex
CREATE INDEX "CustomPermission_storeId_idx" ON "CustomPermission"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomPermission_storeId_permissionKey_key" ON "CustomPermission"("storeId", "permissionKey");

-- CreateIndex
CREATE INDEX "Supplier_storeId_idx" ON "Supplier"("storeId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_storeId_name_key" ON "Supplier"("storeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_storeId_status_idx" ON "PurchaseOrder"("storeId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrderItem_purchaseOrderId_productId_key" ON "PurchaseOrderItem"("purchaseOrderId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "TransferOrder_transferNumber_key" ON "TransferOrder"("transferNumber");

-- CreateIndex
CREATE INDEX "TransferOrder_fromStoreId_status_idx" ON "TransferOrder"("fromStoreId", "status");

-- CreateIndex
CREATE INDEX "TransferOrder_toStoreId_status_idx" ON "TransferOrder"("toStoreId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TransferOrderItem_transferOrderId_productId_key" ON "TransferOrderItem"("transferOrderId", "productId");

-- CreateIndex
CREATE INDEX "PhysicalInventory_storeId_status_idx" ON "PhysicalInventory"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalInventoryItem_physicalInventoryId_productId_key" ON "PhysicalInventoryItem"("physicalInventoryId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_storeId_barcode_key" ON "Product"("storeId", "barcode");

-- CreateIndex
CREATE UNIQUE INDEX "ProductIngredient_productId_ingredientId_sectionGroup_key" ON "ProductIngredient"("productId", "ingredientId", "sectionGroup");

-- AddForeignKey
ALTER TABLE "Timecard" ADD CONSTRAINT "Timecard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomPermission" ADD CONSTRAINT "CustomPermission_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderItem" ADD CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferOrder" ADD CONSTRAINT "TransferOrder_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferOrder" ADD CONSTRAINT "TransferOrder_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferOrderItem" ADD CONSTRAINT "TransferOrderItem_transferOrderId_fkey" FOREIGN KEY ("transferOrderId") REFERENCES "TransferOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferOrderItem" ADD CONSTRAINT "TransferOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalInventory" ADD CONSTRAINT "PhysicalInventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalInventoryItem" ADD CONSTRAINT "PhysicalInventoryItem_physicalInventoryId_fkey" FOREIGN KEY ("physicalInventoryId") REFERENCES "PhysicalInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalInventoryItem" ADD CONSTRAINT "PhysicalInventoryItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
