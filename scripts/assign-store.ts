import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const emailIndex = args.indexOf('--email');
  const storeIdIndex = args.indexOf('--storeId');

  if (emailIndex === -1 || storeIdIndex === -1) {
    console.error('Usage: npx ts-node scripts/assign-store.ts --email user@example.com --storeId STORE_ID');
    process.exit(1);
  }

  const email = args[emailIndex + 1];
  const storeId = args[storeIdIndex + 1];

  const user = await prisma.user.update({
    where: { email },
    data: { storeId },
    include: { store: true }
  });

  console.log(`✅ Utilisateur ${user.email} assigné au store : ${user.store?.name} (${user.storeId})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
