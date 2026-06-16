// src/lib/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc'
import { spec as baseSpec } from '../app/api-docs/swagger-spec'

const options: swaggerJsdoc.Options = {
  definition: {
    ...baseSpec,
    openapi: '3.0.0', // Standardiser en version 3.0.0 pour une compatibilité maximale
    info: {
      ...baseSpec.info,
      title: 'Progi-teck POS API',
    },
  },
  apis: [
    './src/app/api/**/*.ts',
    './src/lib/validation/**/*.ts',
  ],
}

export const swaggerSpec = swaggerJsdoc(options)
