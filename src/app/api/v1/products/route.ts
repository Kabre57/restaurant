import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'
import { readApiTokenFromRequest, validateApiToken } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const tokenContext = await validateApiToken(readApiTokenFromRequest(request));
    if (!tokenContext) {
      return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      where: { storeId: tokenContext.storeId, isAvailable: true },
      include: {
        category: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ products }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  } catch (error) {
    console.error('API Products Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
