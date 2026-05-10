import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Start seeding...')

  // Nettoyage de la base
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.productIngredient.deleteMany()
  await prisma.inventory.deleteMany()
  await prisma.ingredient.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.table.deleteMany()
  await prisma.user.deleteMany()
  await prisma.store.deleteMany()

  // Création du Store
  const store = await prisma.store.create({
    data: {
      name: 'POS Abidjan Plateau',
      address: 'Rue du Commerce, Plateau, Abidjan',
      phone: '+225 01 02 03 04 05',
    },
  })

  // Création d'un User (Caissier)
  const bcrypt = require('bcryptjs')
  const hashedPassword = bcrypt.hashSync('Password123', 10)
  
  const cashier = await prisma.user.create({
    data: {
      storeId: store.id,
      name: 'Théo',
      email: 'theogeoffroy5@gmail.com',
      password: hashedPassword,
      role: 'CASHIER',
    },
  })

  // Création des Catégories
  const catBurgers = await prisma.category.create({
    data: { storeId: store.id, name: 'Burgers', icon: '🍔' },
  })
  const catPoulet = await prisma.category.create({
    data: { storeId: store.id, name: 'Poulet', icon: '🍗' },
  })
  const catAcc = await prisma.category.create({
    data: { storeId: store.id, name: 'Accompagnements', icon: '🍟' },
  })
  const catBoissons = await prisma.category.create({
    data: { storeId: store.id, name: 'Boissons', icon: '🥤' },
  })
  const catDesserts = await prisma.category.create({
    data: { storeId: store.id, name: 'Desserts', icon: '🍦' },
  })

  // Création des Produits
  const products = [
    { categoryId: catBurgers.id, name: 'Burger Classique Bœuf', price: 3500 },
    { categoryId: catBurgers.id, name: 'Burger Double Cheese', price: 5000 },
    { categoryId: catBurgers.id, name: 'Chicken Burger', price: 3000 },
    { categoryId: catPoulet.id, name: 'Nuggets x9', price: 2500 },
    { categoryId: catPoulet.id, name: 'Ailes de Poulet x6', price: 3500 },
    { categoryId: catAcc.id, name: 'Frites Moyennes', price: 1000 },
    { categoryId: catAcc.id, name: 'Frites Grandes', price: 1500 },
    { categoryId: catBoissons.id, name: 'Soda Cola 50cl', price: 800 },
    { categoryId: catBoissons.id, name: 'Jus de Bissap 50cl', price: 1000 },
    { categoryId: catBoissons.id, name: 'Eau Minérale 1.5L', price: 500 },
    { categoryId: catDesserts.id, name: 'Glace Vanille', price: 1500 },
    { categoryId: catDesserts.id, name: 'Gâteau au Chocolat', price: 2000 },
  ]

  for (const p of products) {
    await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: p.categoryId,
        name: p.name,
        price: p.price,
      },
    })
  }

  // Création d'une table
  await prisma.table.create({
    data: {
      storeId: store.id,
      number: 12,
      capacity: 4,
    },
  })

  console.log('Seeding finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
