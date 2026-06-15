import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      name: true,
      role: true,
      store: {
        select: {
          name: true
        }
      }
    }
  })
  console.log("DB_USERS_ROLE_CHECK:")
  console.log(JSON.stringify(users, null, 2))
}

main().catch(console.error).finally(() => prisma.$disconnect())
