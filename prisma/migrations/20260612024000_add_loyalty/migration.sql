-- CreateEnum
CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM');

-- CreateTable
CREATE TABLE "LoyaltyCustomer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nom" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "LoyaltyTransactionType" NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyReward" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyCustomer_phone_key" ON "LoyaltyCustomer"("phone");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_customerId_idx" ON "LoyaltyTransaction"("customerId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_orderId_idx" ON "LoyaltyTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyReward_code_key" ON "LoyaltyReward"("code");

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "LoyaltyCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
