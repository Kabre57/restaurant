// src/app/api/swagger/json/route.ts
import { NextResponse } from 'next/server'
import { swaggerSpec } from '@/lib/swagger'

export async function GET() {
  try {
    return NextResponse.json(swaggerSpec)
  } catch (error) {
    console.error('Error serving swagger.json:', error)
    return NextResponse.json(
      { error: 'Impossible de charger la spécification Swagger' },
      { status: 500 }
    )
  }
}
