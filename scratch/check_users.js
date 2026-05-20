const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, role: true }
  })
  console.log('Users in DB:', JSON.stringify(users, null, 2))

  const products = await prisma.product.findMany({
    select: { name: true, category: { select: { name: true } } }
  })
  console.log('Products in DB:', JSON.stringify(products, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
