import crypto from 'node:crypto';

export function json(status, body) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export const getSiteUrl = (request) => new URL(request.url).origin;

function payfastEncode(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

export function payfastSignature(fields, passphrase) {
  const parameterString = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${payfastEncode(value)}`)
    .join('&');
  const value = passphrase ? `${parameterString}&passphrase=${payfastEncode(passphrase)}` : parameterString;
  return crypto.createHash('md5').update(value).digest('hex');
}

export function safeEqual(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function readOrder(store, orderId) {
  const data = await store.get(orderId, { consistency: 'strong' });
  return data ? JSON.parse(data) : null;
}

export const writeOrder = (store, orderId, order) => store.set(orderId, JSON.stringify(order));

export function createDownloadToken(orderId, expiresAt) {
  const secret = process.env.LINK_SECRET;
  if (!secret) throw new Error('LINK_SECRET is not configured.');
  const payload = Buffer.from(JSON.stringify({ orderId, expiresAt })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readDownloadToken(token) {
  const secret = process.env.LINK_SECRET;
  if (!secret || typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return value.orderId && Number.isFinite(value.expiresAt) && value.expiresAt >= Date.now() ? value : null;
  } catch {
    return null;
  }
}
