import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateApiToken } from '@/lib/api-auth';
import { prisma } from '@/lib/db';
import crypto from 'crypto';

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      apiToken: {
        findUnique: vi.fn(),
      },
    },
  };
});

describe('validateApiToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false if token is undefined or null', async () => {
    const res = await validateApiToken(undefined);
    expect(res).toBe(false);
  });

  it('should return false if token does not start with GLP_', async () => {
    const res = await validateApiToken('INVALID_PREFIX_123');
    expect(res).toBe(false);
  });

  it('should query prisma with the sha256 hash of the token and return true if found', async () => {
    const rawToken = 'GLP_my_test_token_key_abc';
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue({
      id: 'token-id-123',
      name: 'Loyverse Integration',
      token: hashed,
      storeId: 'store-123',
      createdAt: new Date(),
    } as any);

    const res = await validateApiToken(rawToken);

    expect(res).toBe(true);
    expect(prisma.apiToken.findUnique).toHaveBeenCalledWith({
      where: { token: hashed },
      select: { id: true },
    });
  });

  it('should return false if the token is not registered in the database', async () => {
    const rawToken = 'GLP_unknown_token';
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    vi.mocked(prisma.apiToken.findUnique).mockResolvedValue(null);

    const res = await validateApiToken(rawToken);

    expect(res).toBe(false);
    expect(prisma.apiToken.findUnique).toHaveBeenCalledWith({
      where: { token: hashed },
      select: { id: true },
    });
  });
});
