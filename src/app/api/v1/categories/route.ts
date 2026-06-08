import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'
import { readApiTokenFromRequest, validateApiToken } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const tokenContext = await validateApiToken(readApiTokenFromRequest(request));
    if (!tokenContext) {
      return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
    }

    const categories = await prisma.category.findMany({
      where: { storeId: tokenContext.storeId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ categories }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  } catch (error) {
    console.error('API Categories Error:', error);
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
