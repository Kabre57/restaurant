const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyRLS() {
  console.log("==================================================");
  console.log("  APPLICATION DU ROW-LEVEL SECURITY (RLS) SUR DB  ");
  console.log("==================================================");

  // Tables possédant directement un champ storeId
  const directStoreTables = [
    "Table",
    "Order",
    "Category",
    "Product",
    "StockMovement",
    "Reservation",
    "User"
  ];

  // Tables liées indirectement via userId
  const indirectUserTables = [
    "Payroll",
    "LeaveRequest",
    "Loan",
    "UserHistory"
  ];

  try {
    // 1. Configuration des tables directes
    for (const table of directStoreTables) {
      console.log(`🔒 RLS Direct pour : ${table}...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      
      const policyName = `policy_${table.toLowerCase()}_store_isolation`;
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS ${policyName} ON "${table}";`);
      
      await prisma.$executeRawUnsafe(`
        CREATE POLICY ${policyName} ON "${table}"
        AS RESTRICTIVE
        USING (
          "storeId" = current_setting('app.current_store_id', true) 
          OR current_setting('app.current_store_id', true) = '' 
          OR current_setting('app.bypass_rls', true) = 'true'
        )
        WITH CHECK (
          "storeId" = current_setting('app.current_store_id', true) 
          OR current_setting('app.current_store_id', true) = '' 
          OR current_setting('app.bypass_rls', true) = 'true'
        );
      `);
      console.log(`✅ Politique '${policyName}' créée avec succès.`);
    }

    // 2. Configuration des tables indirectes via User
    for (const table of indirectUserTables) {
      console.log(`🔒 RLS Indirect via User pour : ${table}...`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
      await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY;`);
      
      const policyName = `policy_${table.toLowerCase()}_store_isolation`;
      await prisma.$executeRawUnsafe(`DROP POLICY IF EXISTS ${policyName} ON "${table}";`);
      
      await prisma.$executeRawUnsafe(`
        CREATE POLICY ${policyName} ON "${table}"
        AS RESTRICTIVE
        USING (
          EXISTS (
            SELECT 1 FROM "User"
            WHERE "User".id = "${table}"."userId"
              AND (
                "User"."storeId" = current_setting('app.current_store_id', true)
                OR current_setting('app.current_store_id', true) = ''
                OR current_setting('app.bypass_rls', true) = 'true'
              )
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM "User"
            WHERE "User".id = "${table}"."userId"
              AND (
                "User"."storeId" = current_setting('app.current_store_id', true)
                OR current_setting('app.current_store_id', true) = ''
                OR current_setting('app.bypass_rls', true) = 'true'
              )
          )
        );
      `);
      console.log(`✅ Politique '${policyName}' créée avec succès.`);
    }

    console.log("\n==================================================");
    console.log("   POLITIQUES RLS ET ISOLATION DU DB APPLIQUÉES ");
    console.log("==================================================");
  } catch (error) {
    console.error("❌ Erreur lors de l'application de la RLS :", error);
  } finally {
    await prisma.$disconnect();
  }
}

applyRLS();
