const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres_dev_2025@localhost:5433/pos_restaurant?schema=public"
    }
  }
});

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        storeId: true,
        status: true,
        password: true
      }
    });
    console.log("Users currently in DB:", JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error checking users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
