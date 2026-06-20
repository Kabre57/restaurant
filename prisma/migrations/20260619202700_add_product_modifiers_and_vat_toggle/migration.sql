-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN "displayVatBreakdown" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "ProductModifier" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProductModifier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductModifier_productId_idx" ON "ProductModifier"("productId");

-- AddForeignKey
ALTER TABLE "ProductModifier" ADD CONSTRAINT "ProductModifier_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
