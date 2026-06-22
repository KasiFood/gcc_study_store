import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { amountInRands, getProduct } from './products.mjs';
import { getSiteUrl, json, payfastSignature, writeOrder } from './shared.mjs';

export default async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  let payload;
  try { payload = await request.json(); } catch { return json(400, { error: 'Invalid request body.' }); }

  const product = getProduct(payload.product);
  const email = String(payload.email || '').trim().toLowerCase();
  if (!product) return json(400, { error: 'Unknown product.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Enter a valid email address.' });

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  if (!merchantId || !merchantKey || !passphrase || !process.env.LINK_SECRET) {
    return json(500, { error: 'Payment service is not configured yet.' });
  }

  const orderId = `gcc-${Date.now()}-${crypto.randomBytes(9).toString('hex')}`;
  const siteUrl = getSiteUrl(request);
  const fields = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${siteUrl}/download.html?order=${encodeURIComponent(orderId)}`,
    cancel_url: `${siteUrl}/payment.html?product=${encodeURIComponent(payload.product)}&cancelled=1`,
    notify_url: `${siteUrl}/api/payfast-itn`,
    name_first: 'GCC Study Hub Customer',
    email_address: email,
    m_payment_id: orderId,
    amount: amountInRands(product),
    item_name: product.title,
    item_description: `Digital download: ${product.title}`,
    custom_str1: payload.product,
    email_confirmation: '1',
    confirmation_address: process.env.FROM_EMAIL || ''
  };
  fields.signature = payfastSignature(fields, passphrase);

  // This must be created in a current Netlify Function, not legacy Lambda mode.
  const store = getStore('payfast-orders');
  await writeOrder(store, orderId, { orderId, productSlug: payload.product, email, amount: fields.amount, status: 'pending', createdAt: new Date().toISOString() });
  return json(200, {
    action: process.env.PAYFAST_LIVE === 'true' ? 'https://www.payfast.co.za/eng/process' : 'https://sandbox.payfast.co.za/eng/process',
    fields
  });
};
