CREATE TYPE "DeliveryPlatform" AS ENUM ('GLOVO', 'UBER_EATS', 'DELIVEROO', 'GENERIC');

ALTER TABLE "Order"
ADD COLUMN "sourcePlatform" "DeliveryPlatform",
ADD COLUMN "externalOrderId" TEXT,
ADD COLUMN "externalStoreId" TEXT,
ADD COLUMN "customerName" TEXT,
ADD COLUMN "customerPhone" TEXT,
ADD COLUMN "deliveryAddress" TEXT,
ADD COLUMN "customerNotes" TEXT,
ADD COLUMN "externalPayload" JSONB;

CREATE TABLE "StorePlatformConnection" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "platform" "DeliveryPlatform" NOT NULL,
    "externalStoreId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorePlatformConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductPlatformMapping" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "DeliveryPlatform" NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPlatformMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_sourcePlatform_externalOrderId_key" ON "Order"("sourcePlatform", "externalOrderId");
CREATE UNIQUE INDEX "StorePlatformConnection_storeId_platform_key" ON "StorePlatformConnection"("storeId", "platform");
CREATE UNIQUE INDEX "StorePlatformConnection_platform_externalStoreId_key" ON "StorePlatformConnection"("platform", "externalStoreId");
CREATE UNIQUE INDEX "ProductPlatformMapping_productId_platform_key" ON "ProductPlatformMapping"("productId", "platform");
CREATE UNIQUE INDEX "ProductPlatformMapping_storeId_platform_externalProductId_key" ON "ProductPlatformMapping"("storeId", "platform", "externalProductId");

ALTER TABLE "StorePlatformConnection" ADD CONSTRAINT "StorePlatformConnection_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductPlatformMapping" ADD CONSTRAINT "ProductPlatformMapping_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductPlatformMapping" ADD CONSTRAINT "ProductPlatformMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
