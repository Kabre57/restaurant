-- Détail TVA par ligne de commande.
ALTER TABLE "OrderItem"
ADD COLUMN "priceExcludingTax" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.18,
ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Rattrapage des lignes existantes en considérant le prix historique comme HT.
UPDATE "OrderItem"
SET "priceExcludingTax" = "price",
    "taxRate" = 0.18,
    "taxAmount" = ROUND(("price" * "quantity" * 0.18)::numeric, 2)::double precision
WHERE "priceExcludingTax" = 0
  AND "taxAmount" = 0;
