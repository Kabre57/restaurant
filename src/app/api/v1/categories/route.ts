import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db'
import { validateApiToken } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") ?? "";
    const apiKeyHeader = request.headers.get("x-api-key") ?? "";
    let token = authHeader.replace("Bearer ", "").trim();
    if (!token && apiKeyHeader) {
      token = apiKeyHeader.trim();
    }

    const isValid = await validateApiToken(token);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid API token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json({ error: 'Store ID is required' }, { status: 400 });
    }

    const categories = await prisma.category.findMany({
      where: { storeId },
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

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
