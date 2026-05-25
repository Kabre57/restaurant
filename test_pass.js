const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@plateforme.ci' } });
  console.log('User found:', !!user);
  if (user) {
    const isValid = await bcrypt.compare('password123', user.password);
    console.log('Password valid:', isValid);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
