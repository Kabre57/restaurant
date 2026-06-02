import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const stores = await prisma.store.findMany({
    select: { id: true, name: true }
  })
  console.log("All stores:")
  stores.forEach(s => console.log(s.id, s.name))
}

main().catch(console.error).finally(() => prisma.$disconnect())
