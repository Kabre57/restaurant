const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:password@localhost:5433/pos_restaurant?schema=public"
    }
  }
});

async function main() {
  try {
    const statuses = await prisma.$queryRaw`SELECT DISTINCT status FROM "Order"`;
    console.log("Distinct statuses in Order table:", statuses);
    
    const enumValues = await prisma.$queryRaw`
      SELECT e.enumlabel 
      FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'OrderStatus'
    `;
    console.log("OrderStatus enum values in DB:", enumValues);
  } catch (error) {
    console.error("Error inspecting database:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
