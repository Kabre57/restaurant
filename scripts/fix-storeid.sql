-- scripts/fix-storeid.sql
-- Script de sécurité : Vérifier/corriger les storeId manquants

-- 1. Vérifier/créer store par défaut si aucun store n'existe
INSERT INTO "Store" (id, name, address, phone, email, "createdAt", "updatedAt")
SELECT 'store_default', 'Restaurant Principal', 'Abidjan, Côte d''Ivoire', '+225 00000000', 'contact@restaurant.com', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Store" LIMIT 1);

-- 2. Assigner storeId aux utilisateurs RESTAURATEUR sans store
UPDATE "User" 
SET "storeId" = (SELECT id FROM "Store" LIMIT 1)
WHERE role = 'RESTAURATEUR' AND "storeId" IS NULL;

-- 3. Assigner storeId à TOUT utilisateur sans store (sécurité)
UPDATE "User" 
SET "storeId" = (SELECT id FROM "Store" LIMIT 1)
WHERE "storeId" IS NULL;

-- 4. Vérification finale
SELECT u.email, u.role, u."storeId", s.name as store_name
FROM "User" u
LEFT JOIN "Store" s ON u."storeId" = s.id
ORDER BY u.role;
