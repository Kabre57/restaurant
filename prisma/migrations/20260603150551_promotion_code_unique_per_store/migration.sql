/*
  Warnings:

  - A unique constraint covering the columns `[storeId,code]` on the table `Promotion` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Promotion_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "Promotion_storeId_code_key" ON "Promotion"("storeId", "code");
