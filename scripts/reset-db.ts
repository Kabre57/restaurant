// scripts/reset-db.ts — Script de réinitialisation et de seed propre pour Parabellum POS

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function resetDatabase() {
  console.log("🌱 [1/3] Réinitialisation de la base de données...");

  // Récupérer toutes les tables de la base de données publique
  const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname='public'
  `;

  // Filtrer la table des migrations Prisma pour ne pas casser l'historique
  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== "_prisma_migrations");

  console.log(`⚠️  Tables qui vont être vidées : ${tables.join(", ")}`);

  // Désactiver temporairement les contraintes et vider les tables avec CASCADE
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }

  console.log("✅ [2/3] Base de données vidée avec succès.");
}

async function seedDatabase() {
  console.log("🌱 [3/3] Début de la création des données initiales...");

  // ── 1. Établissements (Stores) ───────────────────────────────
  const storeMain = await prisma.store.create({
    data: {
      id: "store-main",
      name: "Gourmet POS — Restaurant Principal",
      address: "12 Avenue du Commerce, Abidjan",
      phone: "+225 07 00 00 01",
      email: "contact@gourmetpos.ci",
      commission: 15.0,
      storeSettings: {
        create: {
          rounding: "ROUND_NEAREST",
          roundingValue: 5,
          workflowType: "CASHIER_ONLY",
        },
      },
    },
  });

  const storeSecondary = await prisma.store.create({
    data: {
      id: "store-secondary",
      name: "Gourmet POS — Plateau Express",
      address: "Rue des Banques, Plateau, Abidjan",
      phone: "+225 07 00 00 02",
      email: "plateau@gourmetpos.ci",
      commission: 15.0,
      storeSettings: {
        create: {
          rounding: "ROUND_NEAREST",
          roundingValue: 5,
          workflowType: "CASHIER_ONLY",
        },
      },
    },
  });

  console.log(`🏢 Établissements créés : ${storeMain.name} & ${storeSecondary.name}`);

  // ── 2. Comptes Utilisateurs (Rôles & Staff) ──────────────────
  const hash = await bcrypt.hash("password123", 10);

  const users = [
    { email: "administrateur@pos.com", name: "Mamadou Koné", role: "ADMIN", storeId: storeMain.id },
    { email: "restaurateur@pos.com", name: "Michel Koffi", role: "RESTAURATEUR", storeId: storeMain.id },
    { email: "directeur@pos.com", name: "Amadou Touré", role: "RESTAURATEUR", storeId: storeMain.id },
    { email: "caissier@pos.com", name: "Awa Diomandé", role: "CASHIER", storeId: storeMain.id },
    { email: "cuisinier@pos.com", name: "Bakary Coulibaly", role: "KITCHEN", storeId: storeMain.id },
    { email: "serveur@pos.com", name: "Chantal Yao", role: "SERVER", storeId: storeMain.id },
    { email: "caissier2@pos.com", name: "Jean-Baptiste Ouattara", role: "CASHIER", storeId: storeSecondary.id },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        password: hash,
        role: u.role as any,
        storeId: u.storeId,
      },
    });
  }

  console.log(`👤 ${users.length} comptes utilisateurs créés avec le mot de passe 'password123'.`);

  // ── 3. Tables Physiques (POS) ────────────────────────────────
  const tables = [
    { id: "table-1", number: 1, capacity: 4, storeId: storeMain.id },
    { id: "table-2", number: 2, capacity: 4, storeId: storeMain.id },
    { id: "table-3", number: 3, capacity: 6, storeId: storeMain.id },
    { id: "table-4", number: 4, capacity: 2, storeId: storeMain.id },
    { id: "table-5", number: 5, capacity: 8, storeId: storeMain.id },
    { id: "table-6", number: 1, capacity: 4, storeId: storeSecondary.id },
    { id: "table-7", number: 2, capacity: 4, storeId: storeSecondary.id },
  ];

  for (const t of tables) {
    await prisma.table.create({
      data: {
        id: t.id,
        number: t.number,
        capacity: t.capacity,
        storeId: t.storeId,
      },
    });
  }

  console.log(`🪑 ${tables.length} tables physiques créées.`);

  // ── 4. Catégories de Produits ────────────────────────────────
  const burgers = await prisma.category.create({
    data: { id: "cat-burgers", name: "Burgers", storeId: storeMain.id },
  });

  const boissons = await prisma.category.create({
    data: { id: "cat-boissons", name: "Boissons", storeId: storeMain.id },
  });

  const accompagnements = await prisma.category.create({
    data: { id: "cat-accompagnements", name: "Accompagnements", storeId: storeMain.id },
  });

  console.log("📂 Catégories de menu créées.");

  // ── 5. Catalogue Produits ────────────────────────────────────
  const products = [
    { 
      id: "prod-classic",  
      name: "Classic Cheeseburger",  
      price: 4500,  
      categoryId: burgers.id,
      image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60"
    },
    { 
      id: "prod-double",   
      name: "Double Cheese",         
      price: 5500,  
      categoryId: burgers.id,
      image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=500&auto=format&fit=crop&q=60"
    },
    { 
      id: "prod-chicken",  
      name: "Spicy Chicken Burger",  
      price: 5000,  
      categoryId: burgers.id,
      image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=500&auto=format&fit=crop&q=60"
    },
    { 
      id: "prod-veggie",   
      name: "Veggie Burger",         
      price: 4800,  
      categoryId: burgers.id,
      image: "https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=500&auto=format&fit=crop&q=60"
    },
    { 
      id: "prod-frites",   
      name: "Frites Maison",         
      price: 1500,  
      categoryId: accompagnements.id,
      image: "https://images.unsplash.com/photo-1576107232684-1279f390859f?w=500&auto=format&fit=crop&q=60"
    },
    { 
      id: "prod-onion",    
      name: "Onion Rings",           
      price: 1800,  
      categoryId: accompagnements.id,
      image: "https://images.unsplash.com/photo-1639024471283-2da7b3c6a267?w=500&auto=format&fit=crop&q=60"
    },
    { 
      id: "prod-cola",     
      name: "Soda Cola",             
      price: 800,   
      categoryId: boissons.id,
      image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60"
    },
    { 
      id: "prod-eau",      
      name: "Eau Minérale",          
      price: 500,   
      categoryId: boissons.id,
      image: "https://images.unsplash.com/photo-1560023907-5f339617ea30?w=500&auto=format&fit=crop&q=60"
    },
    { 
      id: "prod-milksh",   
      name: "Milkshake Vanille",     
      price: 2000,  
      categoryId: boissons.id,
      image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=500&auto=format&fit=crop&q=60"
    },
  ];

  for (const p of products) {
    await prisma.product.create({
      data: { ...p, storeId: storeMain.id },
    });
  }

  console.log(`🍔 ${products.length} produits créés.`);

  // ── 6. Ingrédients & Stocks (Multi-Magasins) ─────────────────
  const ingredients = [
    { id: "ing-buns", name: "Pains Burger", unit: "unités", costPrice: 150, sellPrice: 300, storeId: storeMain.id },
    { id: "ing-beef", name: "Viande Hachée Bœuf", unit: "kg", costPrice: 3500, sellPrice: 6000, storeId: storeMain.id },
    { id: "ing-cheese", name: "Fromage Cheddar", unit: "kg", costPrice: 4000, sellPrice: 7000, storeId: storeMain.id },
    { id: "ing-lettuce", name: "Salade Iceberg", unit: "kg", costPrice: 800, sellPrice: 1500, storeId: storeMain.id },
    { id: "ing-tomato", name: "Tomates", unit: "kg", costPrice: 600, sellPrice: 1200, storeId: storeMain.id },
  ];

  for (const ing of ingredients) {
    await prisma.ingredient.create({
      data: ing,
    });

    // Stock pour Store Principal
    await prisma.inventory.create({
      data: {
        storeId: storeMain.id,
        ingredientId: ing.id,
        quantity: 150,
        minStock: 15,
      },
    });

    // Stock pour Plateau Express
    await prisma.inventory.create({
      data: {
        storeId: storeSecondary.id,
        ingredientId: ing.id,
        quantity: 80,
        minStock: 10,
      },
    });
  }

  console.log("📦 Ingrédients et inventaire initialisés pour le multi-magasins.");
  console.log("\n🎉 Réinitialisation et Seed terminés avec succès !");
  console.log("\n📧 Comptes de test créés (Mot de passe commun : password123) :");
  console.log("   - administrateur@pos.com (ADMIN)           -> Mamadou Koné");
  console.log("   - restaurateur@pos.com   (RESTAURATEUR)    -> Michel Koffi");
  console.log("   - directeur@pos.com      (RESTAURATEUR)    -> Amadou Touré");
  console.log("   - caissier@pos.com       (CASHIER)         -> Awa Diomandé");
  console.log("   - cuisinier@pos.com      (KITCHEN)         -> Bakary Coulibaly");
  console.log("   - serveur@pos.com        (SERVER)          -> Chantal Yao");
  console.log("   - caissier2@pos.com      (CASHIER/Plateau) -> Jean-Baptiste Ouattara\n");
}

async function main() {
  await resetDatabase();
  await seedDatabase();
}

main()
  .catch((e) => {
    console.error("❌ Échec de la réinitialisation / seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
