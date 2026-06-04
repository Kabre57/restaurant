import { PrismaClient, OrderStatus } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ["EN_ATTENTE", "PREPARATION", "PRET"] as any
      }
    }
  })
  console.log("Orders with string literal:", orders.length)

  const ordersEnum = await prisma.order.findMany({
    where: {
      status: {
        in: [OrderStatus.EN_ATTENTE, OrderStatus.PREPARATION, OrderStatus.PRET]
      }
    }
  })
  console.log("Orders with enum:", ordersEnum.length)
}

main().catch(console.error).finally(() => prisma.$disconnect())
