import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOrphanUsers() {
  // Trouver les utilisateurs sans storeId ou avec un storeId vide/invalide
  const orphanUsers = await prisma.user.findMany({
    where: {
      OR: [
        { storeId: null as any },
        { storeId: '' }
      ]
    },
    select: { id: true, email: true, role: true }
  });

  if (orphanUsers.length === 0) {
    console.log('✅ Aucun utilisateur orphelin trouvé');
    return;
  }

  console.log(`⚠️ ${orphanUsers.length} utilisateur(s) sans storeId trouvé(s) :`);
  orphanUsers.forEach(u => console.log(`   - ${u.email} (${u.role})`));

  // Demander confirmation
  console.log('\n🔧 Pour corriger, exécuter :');
  console.log('npx ts-node scripts/assign-store.ts --email user@example.com --storeId STORE_ID');
}

fixOrphanUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
