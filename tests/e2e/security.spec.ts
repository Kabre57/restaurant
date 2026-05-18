import { expect, test } from '@playwright/test'

test('call server validates payload', async ({ request }) => {
  const response = await request.post('/api/call-server', { data: { storeId: '', tableId: '' } })
  expect(response.status()).toBe(400)
})

test('finance export is protected', async ({ request }) => {
  const response = await request.get('/api/exports/finances?format=csv')
  expect(response.status()).toBe(403)
})
