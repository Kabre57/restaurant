const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('password123', 10)
  await prisma.user.updateMany({
    where: { email: 'admin@plateforme.ci' },
    data: { password: hash }
  })
  console.log("Password for admin@plateforme.ci reset to password123")
  
  await prisma.user.updateMany({
    where: { email: 'resto@gourmet.ci' },
    data: { password: hash }
  })
  console.log("Password for resto@gourmet.ci reset to password123")
}

main().catch(console.error).finally(() => prisma.$disconnect())
