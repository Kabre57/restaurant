import Module from 'module'
import path from 'path'

// ── CUSTOM RESOLUTION HOOK POUR RESOUDRE L'ALIAS @/ EN TEMPS REEL ──
const originalResolveFilename = (Module as any)._resolveFilename
;(Module as any)._resolveFilename = function (request: string, parent: any, isMain: boolean) {
  if (request.startsWith('@/')) {
    request = path.join(__dirname, 'src', request.substring(2))
  }
  return originalResolveFilename.call(this, request, parent, isMain)
}

import { PrismaClient } from '@prisma/client'
import { applyRounding } from './src/lib/roundingUtils'
import { getStoreSettings, updateStoreSettings } from './src/app/actions/store/storeSettings'
import { getActiveShift, openShift, closeShift, payIn, payOut } from './src/app/actions/caisse/cashDrawer'
import { generateTokenAction, listTokensAction, revokeTokenAction } from './src/app/actions/auth/apiTokens'
import { getPrinters, savePrinter, deletePrinter, testPrinterConnection } from './src/app/actions/caisse/printers'

const prisma = new PrismaClient()

async function testSuite() {
  console.log('======================================================================')
  console.log('🧪 DEBUT DE LA SUITE DE TEST D\'INTEGRATION - STANDARDS LOYVERSE POS')
  console.log('======================================================================\n')

  let passedTests = 0
  let totalTests = 0

  function assert(condition: boolean, message: string) {
    totalTests++
    if (condition) {
      passedTests++
      console.log(`  ✔ [PASS] ${message}`)
    } else {
      console.error(`  ❌ [FAIL] ${message}`)
    }
  }

  // Trouvons un store existant pour faire les tests
  const store = await prisma.store.findFirst()
  if (!store) {
    console.error('❌ Aucun store trouvé en base de données. Veuillez créer un store pour exécuter les tests.')
    return
  }
  const storeId = store.id
  const testUserId = 'test-cashier-id-123'
  const testUserName = 'Test Caissier'

  console.log(`ℹ️ Utilisation du restaurant : "${store.name}" (${storeId})`)
  console.log(`ℹ️ Caissier de test : "${testUserName}" (${testUserId})\n`)

  // ──────────────────────────────────────────────────────────────────
  // TEST 1 : LOGIQUE D'ARRONDI PURE
  // ──────────────────────────────────────────────────────────────────
  console.log('🔸 1. Validation de la logique pure d\'arrondi (applyRounding)...')
  
  // ROUND_NEAREST 5
  assert(applyRounding(1327, 'ROUND_NEAREST', 5) === 1325, 'ROUND_NEAREST 5 : 1327 -> 1325')
  assert(applyRounding(1328, 'ROUND_NEAREST', 5) === 1330, 'ROUND_NEAREST 5 : 1328 -> 1330')
  assert(applyRounding(1325, 'ROUND_NEAREST', 5) === 1325, 'ROUND_NEAREST 5 : 1325 -> 1325')
  
  // ROUND_UP 5
  assert(applyRounding(1327, 'ROUND_UP', 5) === 1330, 'ROUND_UP 5 : 1327 -> 1330')
  
  // ROUND_DOWN 5
  assert(applyRounding(1327, 'ROUND_DOWN', 5) === 1325, 'ROUND_DOWN 5 : 1327 -> 1325')
  
  // ROUND_NEAREST 50
  assert(applyRounding(1224, 'ROUND_NEAREST', 50) === 1200, 'ROUND_NEAREST 50 : 1224 -> 1200')
  assert(applyRounding(1226, 'ROUND_NEAREST', 50) === 1250, 'ROUND_NEAREST 50 : 1226 -> 1250')

  console.log('')

  // ──────────────────────────────────────────────────────────────────
  // TEST 2 : RECUPERATION ET MAJ DES PARAMETRES DU RESTAURANT
  // ──────────────────────────────────────────────────────────────────
  console.log('🔸 2. Validation des réglages de reçus et d\'arrondis (StoreSettings)...')
  
  const getRes = await getStoreSettings(storeId)
  assert(getRes.success === true && getRes.settings !== undefined, 'getStoreSettings retourne les réglages du restaurant')

  const updateRes = await updateStoreSettings(storeId, {
    rounding: 'ROUND_NEAREST',
    roundingValue: 10,
    receiptHeader: 'EN-TETE DE TEST GOURMET',
    receiptFooter: 'PIED DE PAGE DE TEST GOURMET',
    receiptLogo: 'BASE64_LOGO_TEST_STRING'
  })
  assert(updateRes.success === true, 'updateStoreSettings met à jour la configuration')
  assert(updateRes.settings?.rounding === 'ROUND_NEAREST', 'Le type d\'arrondi a été enregistré à ROUND_NEAREST')
  assert(updateRes.settings?.roundingValue === 10, 'La valeur d\'arrondi a été enregistrée à 10 FCFA')
  assert(updateRes.settings?.receiptHeader === 'EN-TETE DE TEST GOURMET', 'L\'en-tête de reçu a été enregistré')

  console.log('')

  // ──────────────────────────────────────────────────────────────────
  // TEST 3 : ROTATION DE POSTE (SHIFT & CASHDRAWER)
  // ──────────────────────────────────────────────────────────────────
  console.log('🔸 3. Validation de la rotation de poste (Caisse)...')

  // Nettoyer tout shift actif précédent pour éviter les conflits dans le test
  await prisma.cashDrawerShift.updateMany({
    where: { storeId, status: 'OPEN' },
    data: { status: 'CLOSED', closedAt: new Date() }
  })

  // Ouvrir la caisse
  const openRes = await openShift(storeId, testUserId, testUserName, 25000)
  assert(openRes.success === true && openRes.shift !== undefined, 'openShift ouvre une nouvelle session de caisse')
  assert(openRes.shift?.startAmount === 25000, 'Le fond de caisse initial est enregistré (25 000 FCFA)')
  assert(openRes.shift?.status === 'OPEN', 'Le statut du shift est OPEN')

  const activeRes = await getActiveShift(storeId)
  assert(activeRes.success === true && activeRes.shift !== null, 'getActiveShift retrouve la session ouverte')
  const shiftId = activeRes.shift!.id

  // Enregistrer des mouvements d'espèces
  const payInRes = await payIn(shiftId, 5000, 'Ajout monnaie caisse')
  assert(payInRes.success === true, 'payIn enregistre un apport de monnaie (+5 000 FCFA)')

  const payOutRes = await payOut(shiftId, 2000, 'Achat fournitures de test')
  assert(payOutRes.success === true, 'payOut enregistre un retrait (-2 000 FCFA)')

  // Clôturer la caisse (Simulons un comptage réel à 28 000 FCFA)
  // Fond initial (25000) + Ventes (0 pour le test) + PayIn (5000) - PayOut (2000) = Attendu (28000)
  const closeRes = await closeShift(shiftId, testUserId, testUserName, 28000)
  assert(closeRes.success === true, 'closeShift clôture la caisse')
  assert(closeRes.expectedAmount === 28000, 'Le montant attendu calculé est exact (28 000 FCFA)')
  assert(closeRes.shift?.endAmount === 28000, 'Le montant de clôture réel est enregistré (28 000 FCFA)')
  assert(closeRes.shift?.status === 'CLOSED', 'Le statut du shift est passé à CLOSED')

  // Vérifier qu'il n'y a plus de caisse ouverte
  const activePostClose = await getActiveShift(storeId)
  assert(activePostClose.success === true && activePostClose.shift === null, 'Il n\'y a plus de caisse ouverte après clôture')

  console.log('')

  // ──────────────────────────────────────────────────────────────────
  // TEST 4 : CLES API & INTÉGRATIONS
  // ──────────────────────────────────────────────────────────────────
  console.log('🔸 4. Validation des clés d\'API & Intégrations...')

  const generateRes = await generateTokenAction(storeId, 'Token Test Apify')
  assert(generateRes.success === true && generateRes.rawToken !== undefined, 'generateTokenAction génère un jeton d\'API')
  assert(!!generateRes.rawToken?.startsWith('GLP_'), 'Le jeton d\'API commence par le préfixe GLP_')
  assert(generateRes.apiToken?.name === 'Token Test Apify', 'Le descriptif de l\'intégration est valide')

  const listRes = await listTokensAction(storeId)
  assert(listRes.success === true && listRes.tokens?.length! > 0, 'listTokensAction liste les jetons actifs')
  const testTokenId = generateRes.apiToken!.id

  const revokeRes = await revokeTokenAction(testTokenId)
  assert(revokeRes.success === true, 'revokeTokenAction révoque avec succès le jeton')

  const listPostRevoke = await listTokensAction(storeId)
  assert(listPostRevoke.tokens?.find(t => t.id === testTokenId) === undefined, 'Le jeton révoqué n\'apparaît plus dans la liste')

  console.log('')

  // ──────────────────────────────────────────────────────────────────
  // TEST 5 : MATÉRIEL & IMPRIMANTES (ESC/POS)
  // ──────────────────────────────────────────────────────────────────
  console.log('🔸 5. Validation de la gestion du matériel & imprimantes (ESC/POS)...')

  // Création d'une imprimante réseau Ethernet
  const printerSaveRes = await savePrinter(storeId, {
    name: 'Imprimante Cuisine Test',
    type: 'ETHERNET',
    ipAddress: '192.168.1.200',
    port: 9100,
    paperWidth: 80,
    printReceipts: false,
    printOrders: true,
    categories: 'boissons,desserts'
  })
  assert(printerSaveRes.success === true && printerSaveRes.printer !== undefined, 'savePrinter crée une nouvelle imprimante ETHERNET avec succès')
  const testPrinter = printerSaveRes.printer!

  // Récupération des imprimantes
  const listPrintersRes = await getPrinters(storeId)
  assert(listPrintersRes.success === true && listPrintersRes.printers !== undefined, 'getPrinters liste toutes les imprimantes du magasin')
  assert(listPrintersRes.printers!.some(p => p.id === testPrinter.id), 'L\'imprimante créée apparaît bien dans la liste')

  // Envoi d'un autotest matériel de communication
  const autotestRes = await testPrinterConnection(testPrinter.id)
  assert(autotestRes.success === true, 'testPrinterConnection effectue un autotest de communication valide')
  assert(autotestRes.simulated === true && autotestRes.receiptPreview !== undefined, 'L\'autotest de simulation génère un aperçu de reçu de test au format ESC/POS')

  // Mise à jour de l'imprimante
  const updatePrinterRes = await savePrinter(storeId, {
    id: testPrinter.id,
    name: 'Imprimante Cuisine Test (Modifiée)',
    type: 'USB',
    paperWidth: 58,
    printReceipts: true,
    printOrders: false
  })
  assert(updatePrinterRes.success === true && updatePrinterRes.printer !== undefined, 'savePrinter met à jour avec succès les configurations de l\'imprimante')
  assert(updatePrinterRes.printer?.type === 'USB', 'Le type de l\'imprimante mis à jour est USB')
  assert(updatePrinterRes.printer?.paperWidth === 58, 'La largeur du papier a été modifiée à 58mm')

  // Suppression de l'imprimante
  const deletePrinterRes = await deletePrinter(testPrinter.id)
  assert(deletePrinterRes.success === true, 'deletePrinter supprime avec succès le périphérique matériel')

  const postDeletePrintersRes = await getPrinters(storeId)
  assert(postDeletePrintersRes.printers?.find(p => p.id === testPrinter.id) === undefined, 'L\'imprimante supprimée ne figure plus en base de données')

  console.log('')

  // ──────────────────────────────────────────────────────────────────
  // RAPPORT FINAL
  // ──────────────────────────────────────────────────────────────────
  console.log('======================================================================')
  console.log(`📊 RAPPORT DE TEST FINAL : ${passedTests}/${totalTests} TESTS PASSES`)
  if (passedTests === totalTests) {
    console.log('🎉 TOUS LES TESTS SONT AU VERT ! QUALITE LOYVERSE VALIDEE A 100%')
  } else {
    console.warn('⚠️ CERTAINS TESTS ONT ECHOUE. VEUILLEZ VERIFIER LA TRACE CI-DESSUS.')
  }
  console.log('======================================================================')
}

testSuite()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
