const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Starting DB migration for OrderStatus enum...");
  try {
    // 1. Alter the column 'status' to drop default constraint if any
    console.log("Dropping default value from status column...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ALTER COLUMN status DROP DEFAULT;`);

    // 2. Alter the column 'status' to type TEXT
    console.log("Converting status column to TEXT...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ALTER COLUMN status TYPE TEXT USING status::text;`);

    // 3. Update the values in the "Order" table
    console.log("Updating PRÊT to PRET...");
    const updatedPret = await prisma.$executeRawUnsafe(`UPDATE "Order" SET status = 'PRET' WHERE status = 'PRÊT';`);
    console.log(`Updated ${updatedPret} rows from PRÊT to PRET.`);

    console.log("Updating PRÉPARATION to PREPARATION...");
    const updatedPrep = await prisma.$executeRawUnsafe(`UPDATE "Order" SET status = 'PREPARATION' WHERE status = 'PRÉPARATION';`);
    console.log(`Updated ${updatedPrep} rows from PRÉPARATION to PREPARATION.`);

    // 4. Drop the old enum type
    console.log("Dropping old OrderStatus enum type...");
    await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "OrderStatus";`);

    // 5. Create the new enum type
    console.log("Creating new OrderStatus enum type...");
    await prisma.$executeRawUnsafe(`CREATE TYPE "OrderStatus" AS ENUM ('EN_ATTENTE', 'PREPARATION', 'PRET', 'COMPLETED', 'CANCELLED');`);

    // 6. Alter the column 'status' to the new "OrderStatus" enum type
    console.log("Converting status column back to OrderStatus enum...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ALTER COLUMN status TYPE "OrderStatus" USING status::"OrderStatus";`);

    // 7. Add back the default constraint
    console.log("Re-adding default constraint...");
    await prisma.$executeRawUnsafe(`ALTER TABLE "Order" ALTER COLUMN status SET DEFAULT 'EN_ATTENTE';`);

    console.log("🎉 OrderStatus migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
