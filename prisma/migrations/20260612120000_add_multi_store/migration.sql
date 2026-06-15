-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE 'STORE_MANAGER';
ALTER TYPE "Role" ADD VALUE 'STORE_EMPLOYEE';

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "code" TEXT,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "timezone" TEXT DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "fromStoreId" TEXT NOT NULL,
    "toStoreId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsolidatedReport" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "ca" DOUBLE PRECISION NOT NULL,
    "marge" DOUBLE PRECISION NOT NULL,
    "nbOrders" INTEGER NOT NULL,
    "nbCouverts" INTEGER NOT NULL,

    CONSTRAINT "ConsolidatedReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_UserStores" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_UserStores_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "StockTransfer_fromStoreId_idx" ON "StockTransfer"("fromStoreId");

-- CreateIndex
CREATE INDEX "StockTransfer_toStoreId_idx" ON "StockTransfer"("toStoreId");

-- CreateIndex
CREATE INDEX "StockTransfer_productId_idx" ON "StockTransfer"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsolidatedReport_storeId_date_key" ON "ConsolidatedReport"("storeId", "date");

-- CreateIndex
CREATE INDEX "_UserStores_B_index" ON "_UserStores"("B");

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_subRecipe_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductIngredient" ADD CONSTRAINT "ProductIngredient_baseIngredient_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidatedReport" ADD CONSTRAINT "ConsolidatedReport_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserStores" ADD CONSTRAINT "_UserStores_A_fkey" FOREIGN KEY ("A") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserStores" ADD CONSTRAINT "_UserStores_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
