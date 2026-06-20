-- AlterTable
ALTER TABLE "Product" ADD COLUMN "priceHT" DECIMAL(12,2);
ALTER TABLE "Product" ADD COLUMN "taxRate" DECIMAL(5,2);
ALTER TABLE "Product" ADD COLUMN "priceTTC" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "StoreSettings" ADD COLUMN "defaultTaxRate" DECIMAL(5,2) DEFAULT 18.00;

-- Migrate Data
UPDATE "Product" SET "priceTTC" = CAST("price" AS DECIMAL(12,2)), "taxRate" = 18.00, "priceHT" = CAST("price" / 1.18 AS DECIMAL(12,2)) WHERE "priceTTC" IS NULL;
UPDATE "StoreSettings" SET "defaultTaxRate" = 18.00 WHERE "defaultTaxRate" IS NULL;
