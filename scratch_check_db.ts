import { prisma } from './src/lib/db'

async function main() {
  console.log('--- START DB CHECK ---')
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      storeId: true,
    }
  })
  console.log('Users in DB:', JSON.stringify(users, null, 2))
}

main().catch(console.error)
