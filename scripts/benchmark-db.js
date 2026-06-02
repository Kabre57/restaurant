const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runBenchmark() {
  console.log("==================================================");
  console.log("      BENCHMARK DE LA BASE DE DONNÉES GOURMET POS ");
  console.log("==================================================");

  try {
    // 1. Connexion & Préchauffage (Warmup)
    const startWarmup = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const warmupDuration = Date.now() - startWarmup;
    console.log(`⚡ Connexion établie et préchauffée en : ${warmupDuration} ms\n`);

    // 2. Benchmark Écriture (INSERT) - Création de logs d'historique utilisateur
    console.log("⏳ Test 1 : Vitesse d'écriture (INSERT)...");
    const insertTimes = [];
    const countInsert = 50;

    // Récupérer un utilisateur existant pour l'associer à l'historique
    const user = await prisma.user.findFirst();
    if (!user) {
      console.warn("⚠️ Aucun utilisateur trouvé pour le benchmark d'écriture. Ignoré.");
    } else {
      for (let i = 0; i < countInsert; i++) {
        const start = Date.now();
        await prisma.userHistory.create({
          data: {
            userId: user.id,
            action: "BENCHMARK_TEST",
            description: `Insertion de test numéro ${i + 1}`,
            metadata: { step: i, timestamp: start }
          }
        });
        insertTimes.push(Date.now() - start);
      }

      const totalInsertTime = insertTimes.reduce((a, b) => a + b, 0);
      const avgInsert = totalInsertTime / countInsert;
      const minInsert = Math.min(...insertTimes);
      const maxInsert = Math.max(...insertTimes);
      console.log(`✅ ${countInsert} écritures terminées.`);
      console.log(`   - Moyenne : ${avgInsert.toFixed(2)} ms / insertion`);
      console.log(`   - Min      : ${minInsert} ms`);
      console.log(`   - Max      : ${maxInsert} ms\n`);
    }

    // 3. Benchmark Lecture avec INDEX (Filtre storeId + role sur User)
    console.log("⏳ Test 2 : Lecture indexée (SELECT avec index storeId + role)...");
    const readIndexedTimes = [];
    const countReads = 100;

    for (let i = 0; i < countReads; i++) {
      const start = Date.now();
      await prisma.user.findMany({
        where: {
          storeId: "store-main",
          role: "CASHIER"
        }
      });
      readIndexedTimes.push(Date.now() - start);
    }

    const totalReadIndexed = readIndexedTimes.reduce((a, b) => a + b, 0);
    const avgReadIndexed = totalReadIndexed / countReads;
    console.log(`✅ ${countReads} lectures indexées terminées.`);
    console.log(`   - Moyenne : ${avgReadIndexed.toFixed(2)} ms / requête\n`);

    // 4. Benchmark Lecture complexe (Jointure Order + OrderItem + Product)
    console.log("⏳ Test 3 : Requêtes de jointure complexes (SELECT + JOIN)...");
    const complexTimes = [];
    const countComplex = 50;

    for (let i = 0; i < countComplex; i++) {
      const start = Date.now();
      await prisma.order.findMany({
        where: { storeId: "store-main" },
        take: 10,
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });
      complexTimes.push(Date.now() - start);
    }

    const totalComplex = complexTimes.reduce((a, b) => a + b, 0);
    const avgComplex = totalComplex / countComplex;
    console.log(`✅ ${countComplex} requêtes complexes terminées.`);
    console.log(`   - Moyenne : ${avgComplex.toFixed(2)} ms / requête\n`);

    // 5. Test de Concurrence
    console.log("⏳ Test 4 : Vitesse sous charge concurrente (50 requêtes simultanées)...");
    const startConcur = Date.now();
    const promises = Array.from({ length: 50 }).map(() => 
      prisma.user.findMany({
        where: { storeId: "store-main" }
      })
    );
    await Promise.all(promises);
    const concurDuration = Date.now() - startConcur;
    console.log(`✅ 50 requêtes concurrentes traitées en : ${concurDuration} ms`);
    console.log(`   - Débit théorique : ${(50000 / concurDuration).toFixed(2)} requêtes / sec\n`);

    // Nettoyage des données de benchmark d'écriture
    if (user) {
      console.log("🧹 Nettoyage des données temporaires de benchmark...");
      const deleted = await prisma.userHistory.deleteMany({
        where: {
          userId: user.id,
          action: "BENCHMARK_TEST"
        }
      });
      console.log(`✅ ${deleted.count} entrées de test supprimées.`);
    }

    console.log("\n==================================================");
    console.log("            FIN DU BENCHMARK AVEC SUCCÈS ");
    console.log("==================================================");

  } catch (error) {
    console.error("❌ Une erreur est survenue lors du benchmark :", error);
  } finally {
    await prisma.$disconnect();
  }
}

runBenchmark();
