import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('Password123', 10)

  // 1. Create a Store
  const store = await prisma.store.upsert({
    where: { id: 'store_01' },
    update: {},
    create: {
      id: 'store_01',
      name: 'Le Gourmet Abidjan',
      address: 'Cocody Rue des Jardins',
      commission: 15.0
    }
  })

  // 2. Create Users
  await prisma.user.upsert({
    where: { email: 'admin@plateforme.ci' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@plateforme.ci',
      password: hashedPassword,
      role: Role.ADMIN,
      storeId: store.id
    }
  })

  await prisma.user.upsert({
    where: { email: 'resto@gourmet.ci' },
    update: {},
    create: {
      name: 'Marc Restaurateur',
      email: 'resto@gourmet.ci',
      password: hashedPassword,
      role: Role.RESTAURATEUR,
      storeId: store.id
    }
  })

  await prisma.user.upsert({
    where: { email: 'theogeoffroy5@gmail.com' },
    update: {},
    create: {
      name: 'Théo Caissier',
      email: 'theogeoffroy5@gmail.com',
      password: hashedPassword,
      role: Role.CASHIER,
      storeId: store.id
    }
  })

  // 3. Create Categories
  const categoriesData = [
    { id: 'cat_01', name: 'Burgers', icon: '🍔' },
    { id: 'cat_02', name: 'Poulet', icon: '🍗' },
    { id: 'cat_03', name: 'Frites', icon: '🍟' },
    { id: 'cat_04', name: 'Boissons', icon: '🥤' },
    { id: 'cat_05', name: 'Desserts', icon: '🍰' },
  ]

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: { ...cat, storeId: store.id }
    })
  }

  // 4. Create Products
  const productsData = [
    { name: 'Burger Classique', price: 4500, categoryId: 'cat_01', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80' },
    { name: 'Double Cheese', price: 6500, categoryId: 'cat_01', image: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=500&q=80' },
    { name: 'Ailes de Poulet x6', price: 3500, categoryId: 'cat_02', image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?w=500&q=80' },
    { name: 'Frites Maison', price: 1500, categoryId: 'cat_03', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=500&q=80' },
    { name: 'Coca-Cola', price: 1000, categoryId: 'cat_04', image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&q=80' },
  ]

  for (const prod of productsData) {
    await prisma.product.create({
      data: { ...prod, storeId: store.id }
    })
  }

  console.log('Seed completed successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
