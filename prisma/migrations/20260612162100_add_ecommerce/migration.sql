-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('ONLINE', 'POS');

-- CreateEnum
CREATE TYPE "OnlineDeliveryType" AS ENUM ('DELIVERY', 'CLICK_AND_COLLECT');

-- CreateEnum
CREATE TYPE "OnlinePaymentMethod" AS ENUM ('CARD', 'ORANGE_MONEY', 'MTN_MONEY');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_paymentMethodId_fkey";

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerEmail" TEXT,
ADD COLUMN     "deliveryType" "OnlineDeliveryType",
ADD COLUMN     "source" "OrderSource" NOT NULL DEFAULT 'POS';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "onlineMethod" "OnlinePaymentMethod",
ADD COLUMN     "transactionId" TEXT,
ALTER COLUMN "paymentMethodId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
