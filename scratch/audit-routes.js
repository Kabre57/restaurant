const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

function getFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else if (file === 'route.ts') {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const routeFiles = getFilesRecursively(apiDir);
console.log(`Found ${routeFiles.length} API route files.\n`);

const results = [];

for (const file of routeFiles) {
  const relativePath = path.relative(path.join(__dirname, '..'), file);
  const content = fs.readFileSync(file, 'utf8');
  
  const hasGetServerSession = content.includes('getServerSession');
  const hasValidateApiToken = content.includes('validateApiToken');
  const hasRequireAuth = content.includes('requireAuth');
  const hasRequireSession = content.includes('requireSession');
  const hasValidateApiKey = content.includes('validateApiKey');
  const hasPublicInPath = relativePath.includes('/public/');
  const hasWebhookInPath = relativePath.includes('/webhooks/');
  const hasGlovoWebhook = relativePath.includes('glovo-webhook');
  const hasApiDocs = relativePath.includes('swagger/json') || relativePath.includes('api-docs');
  const hasHealth = relativePath.includes('health/route.ts');
  const hasAuthNextAuth = relativePath.includes('api/auth/');
  const hasEstm = relativePath.includes('delivery/estimate');

  const isGuarded = hasGetServerSession || hasValidateApiToken || hasRequireAuth || hasRequireSession || hasValidateApiKey;
  const isExcluded = hasPublicInPath || hasWebhookInPath || hasGlovoWebhook || hasApiDocs || hasHealth || hasAuthNextAuth || hasEstm;

  results.push({
    path: relativePath,
    isGuarded,
    isExcluded,
    methods: getMethods(content),
    contentLength: content.length
  });
}

function getMethods(content) {
  const methods = [];
  if (content.includes('export async function GET')) methods.push('GET');
  if (content.includes('export async function POST')) methods.push('POST');
  if (content.includes('export async function PUT')) methods.push('PUT');
  if (content.includes('export async function PATCH')) methods.push('PATCH');
  if (content.includes('export async function DELETE')) methods.push('DELETE');
  return methods;
}

console.log('| API Route | Guarded? | Excluded? | Methods |');
console.log('| --- | --- | --- | --- |');
for (const r of results) {
  console.log(`| ${r.path} | ${r.isGuarded ? '✅' : '❌'} | ${r.isExcluded ? 'Yes' : 'No'} | ${r.methods.join(', ')} |`);
}
