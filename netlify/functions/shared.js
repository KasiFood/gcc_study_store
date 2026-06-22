const crypto = require('crypto');
const { getStore } = require('@netlify/blobs');

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    body: JSON.stringify(body)
  };
}

function getSiteUrl(event) {
  const headers = event.headers || {};
  const host = headers['x-forwarded-host'] || headers.host;
  const protocol = headers['x-forwarded-proto'] || 'https';
  return `${protocol}://${host}`.replace(/\/$/, '');
}

function payfastEncode(value) {
  return encodeURIComponent(String(value)).replace(/%20/g, '+');
}

function payfastSignature(fields, passphrase) {
  const parameterString = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${payfastEncode(value)}`)
    .join('&');
  const withPassphrase = passphrase
    ? `${parameterString}&passphrase=${payfastEncode(passphrase)}`
    : parameterString;
  return crypto.createHash('md5').update(withPassphrase).digest('hex');
}

function safeEqual(left, right) {
  if (!left || !right) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function orderStore() {
  return getStore('payfast-orders');
}

function createDownloadToken(orderId, expiresAt) {
  const secret = process.env.LINK_SECRET;
  if (!secret) throw new Error('LINK_SECRET is not configured.');
  const payload = Buffer.from(JSON.stringify({ orderId, expiresAt })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readDownloadToken(token) {
  const secret = process.env.LINK_SECRET;
  if (!secret || typeof token !== 'string') return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!value.orderId || !Number.isFinite(value.expiresAt) || value.expiresAt < Date.now()) return null;
    return value;
  } catch {
    return null;
  }
}

module.exports = {
  createDownloadToken,
  getSiteUrl,
  json,
  orderStore,
  payfastSignature,
  readDownloadToken,
  safeEqual
};
