// prisma/seed.ts — Données initiales pour le projet restaurant (schéma Store/User)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Démarrage du seed...");

  // ── Store principal ─────────────────────────────────────────
  const store = await prisma.store.upsert({
    where: { id: "store-main" },
    update: {},
    create: {
      id:      "store-main",
      name:    "Gourmet POS — Restaurant Principal",
      address: "12 Avenue du Commerce, Abidjan",
      phone:   "+225 07 00 00 01",
      email:   "contact@gourmetpos.ci",
    },
  });

  const storeSecondary = await prisma.store.upsert({
    where: { id: "store-secondary" },
    update: {},
    create: {
      id:      "store-secondary",
      name:    "Gourmet POS — Plateau Express",
      address: "Rue des Banques, Plateau, Abidjan",
      phone:   "+225 07 00 00 02",
      email:   "plateau@gourmetpos.ci",
    },
  });

  console.log(`✅ Stores créés : ${store.name} & ${storeSecondary.name}`);

  // ── Utilisateurs / Rôles ────────────────────────────────────
  const hash = await bcrypt.hash("password123", 10);

  const users = [
    { email: "resto@gourmet.ci",   name: "Gourmet Manager", role: "RESTAURATEUR", storeId: store.id },
    { email: "admin@pos.com",      name: "Admin Système",   role: "ADMIN",        storeId: store.id },
    { email: "manager@pos.com",    name: "Sophie Martin",   role: "RESTAURATEUR", storeId: store.id },
    { email: "cashier@pos.com",    name: "Jean Dupont",     role: "CASHIER",      storeId: store.id },
    { email: "kitchen@pos.com",    name: "Chef Gordon",     role: "KITCHEN",      storeId: store.id },
    { email: "waiter@pos.com",     name: "Amina Benali",    role: "SERVER",       storeId: store.id },
    { email: "cashier2@pos.com",   name: "Koffi Yao",       role: "CASHIER",      storeId: storeSecondary.id },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        email:    u.email,
        name:     u.name,
        password: hash,
        role:     u.role as any,
        storeId:  u.storeId,
      },
    });
  }

  console.log(`✅ ${users.length} utilisateurs créés`);

  // ── Tables ──────────────────────────────────────────────────
  const tableData = [
    { id: "table-1", number: 1, capacity: 4, storeId: store.id },
    { id: "table-2", number: 2, capacity: 4, storeId: store.id },
    { id: "table-3", number: 3, capacity: 6, storeId: store.id },
    { id: "table-4", number: 4, capacity: 2, storeId: store.id },
    { id: "table-5", number: 5, capacity: 8, storeId: store.id },
    { id: "table-6", number: 1, capacity: 4, storeId: storeSecondary.id },
    { id: "table-7", number: 2, capacity: 4, storeId: storeSecondary.id },
  ];

  for (const t of tableData) {
    await prisma.table.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id:       t.id,
        number:   t.number,
        capacity: t.capacity,
        storeId:  t.storeId,
      },
    });
  }

  console.log(`✅ ${tableData.length} tables créées`);

  // ── Catégories ──────────────────────────────────────────────
  const burgers = await prisma.category.upsert({
    where: { id: "cat-burgers" },
    update: {},
    create: { id: "cat-burgers", name: "Burgers", storeId: store.id },
  });

  const boissons = await prisma.category.upsert({
    where: { id: "cat-boissons" },
    update: {},
    create: { id: "cat-boissons", name: "Boissons", storeId: store.id },
  });

  const accompagnements = await prisma.category.upsert({
    where: { id: "cat-accompagnements" },
    update: {},
    create: { id: "cat-accompagnements", name: "Accompagnements", storeId: store.id },
  });

  console.log("✅ Catégories créées");

  // ── Produits ────────────────────────────────────────────────
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
    await prisma.product.upsert({
      where:  { id: p.id },
      update: { image: p.image },
      create: { ...p, storeId: store.id },
    });
  }

  console.log(`✅ ${products.length} produits créés`);

  // ── Ingrédients ─────────────────────────────────────────────
  const ingredients = [
    { id: "ing-buns",    name: "Pains Burger",        unit: "unités", costPrice: 150,  sellPrice: 300, storeId: store.id },
    { id: "ing-beef",    name: "Viande Hachée Bœuf",  unit: "kg",     costPrice: 3500, sellPrice: 6000, storeId: store.id },
    { id: "ing-cheese",  name: "Fromage Cheddar",     unit: "kg",     costPrice: 4000, sellPrice: 7000, storeId: store.id },
    { id: "ing-lettuce", name: "Salade Iceberg",      unit: "kg",     costPrice: 800,  sellPrice: 1500, storeId: store.id },
    { id: "ing-tomato",  name: "Tomates",             unit: "kg",     costPrice: 600,  sellPrice: 1200, storeId: store.id },
  ];

  for (const ing of ingredients) {
    await prisma.ingredient.upsert({
      where:  { id: ing.id },
      update: {
        costPrice: ing.costPrice,
        sellPrice: ing.sellPrice
      },
      create: ing,
    });

    // Inventaire pour Store Principal
    await prisma.inventory.upsert({
      where:  { storeId_ingredientId: { storeId: store.id, ingredientId: ing.id } },
      update: {},
      create: {
        storeId:      store.id,
        ingredientId: ing.id,
        quantity:     150,
        minStock:     15,
      },
    });

    // Inventaire pour Plateau Express
    await prisma.inventory.upsert({
      where:  { storeId_ingredientId: { storeId: storeSecondary.id, ingredientId: ing.id } },
      update: {},
      create: {
        storeId:      storeSecondary.id,
        ingredientId: ing.id,
        quantity:     80,
        minStock:     10,
      },
    });
  }

  console.log("✅ Ingrédients et inventaire créés pour le multi-magasins");

  console.log("\n🎉 Seed terminé avec succès !");
  console.log("\n📧 Comptes de test :");
  console.log("   admin@pos.com       / password123  (ADMIN)");
  console.log("   manager@pos.com     / password123  (RESTAURATEUR)");
  console.log("   cashier@pos.com     / password123  (CASHIER - Store Principal)");
  console.log("   cashier2@pos.com    / password123  (CASHIER - Plateau Express)");
  console.log("   kitchen@pos.com     / password123  (KITCHEN)");
  console.log("   waiter@pos.com      / password123  (SERVER)");
  console.log("   kitchen@pos.com     / password123  (KITCHEN)");
  console.log("   waiter@pos.com      / password123  (SERVER)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
