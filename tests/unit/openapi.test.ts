import { describe, it, expect } from 'vitest'
import SwaggerParser from '@apidevtools/swagger-parser'
import { swaggerSpec } from '../../src/lib/swagger'

describe('Validation de la spécification OpenAPI', () => {
  it('doit être une spécification OpenAPI 3.0.0 valide et conforme', async () => {
    // Cloner l'objet pour éviter toute modification par référence
    const specClone = JSON.parse(JSON.stringify(swaggerSpec))

    // Validation via swagger-parser
    const api = (await SwaggerParser.validate(specClone)) as any

    expect(api).toBeDefined()
    expect(api.openapi).toBe('3.0.0')
    expect(api.info).toBeDefined()
    expect(api.info.title).toBe('Parabellum POS API')
    expect(api.paths).toBeDefined()
  })
})
