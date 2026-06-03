const { GET: getProducts } = require('../src/app/api/v1/products/route');
const { GET: getCategories } = require('../src/app/api/v1/categories/route');
const { POST: createOrder } = require('../src/app/api/v1/orders/route');

async function testUnauthorized(name, handler, method = 'GET', url = 'http://localhost/api/v1/test') {
  try {
    const mockRequest = {
      method,
      url,
      headers: {
        get: (header) => {
          return null; // Pas de token
        }
      }
    };

    const response = await handler(mockRequest);
    const data = await response.json();
    console.log(`[TEST ${name}] Status:`, response.status);
    console.log(`[TEST ${name}] Body:`, data);
    if (response.status === 401 && data.error === 'Invalid API token') {
      console.log(`✅ [TEST ${name}] Bloqué avec succès (401 Unauthorized)`);
    } else {
      console.log(`❌ [TEST ${name}] ÉCHEC: Le handler n'a pas renvoyé 401 ou le corps est incorrect`);
    }
  } catch (err) {
    console.error(`❌ [TEST ${name}] Erreur lors de l'exécution:`, err);
  }
}

async function run() {
  console.log('Début des tests de sécurité des API routes v1...');
  await testUnauthorized('Products API', getProducts, 'GET', 'http://localhost/api/v1/products?storeId=1');
  await testUnauthorized('Categories API', getCategories, 'GET', 'http://localhost/api/v1/categories?storeId=1');
  await testUnauthorized('Orders API', createOrder, 'POST', 'http://localhost/api/v1/orders');
  console.log('Tests terminés.');
}

run();
