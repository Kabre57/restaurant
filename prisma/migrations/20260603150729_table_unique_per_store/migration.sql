/*
  Warnings:

  - A unique constraint covering the columns `[storeId,number]` on the table `Table` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Table_storeId_number_key" ON "Table"("storeId", "number");
