// scripts/generate-openapi.ts
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { swaggerSpec } from '../src/lib/swagger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

try {
  const outputPath = resolve(__dirname, '../openapi.json')
  writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf-8')
  console.log(`[OpenAPI] Spécification exportée avec succès sous : ${outputPath}`)
  process.exit(0)
} catch (error) {
  console.error('[OpenAPI] Échec de l\'export de la spécification :', error)
  process.exit(1)
}
