-- Paramètres e-commerce configurables par établissement.
ALTER TABLE "Store"
ADD COLUMN "ecommerceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "deliveryEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "clickAndCollectEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deliveryFee" DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN "preparationDelayMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "closedDates" JSONB;
