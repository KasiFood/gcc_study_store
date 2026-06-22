const crypto = require('crypto');
const { getProduct, amountInRands } = require('./products');
const { getSiteUrl, json, orderStore, payfastSignature } = require('./shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  let request;
  try {
    request = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Invalid request body.' });
  }

  const product = getProduct(request.product);
  const email = String(request.email || '').trim().toLowerCase();
  if (!product) return json(400, { error: 'Unknown product.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Enter a valid email address.' });

  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;
  if (!merchantId || !merchantKey || !passphrase || !process.env.LINK_SECRET) {
    return json(500, { error: 'Payment service is not configured yet.' });
  }

  const orderId = `gcc-${Date.now()}-${crypto.randomBytes(9).toString('hex')}`;
  const siteUrl = getSiteUrl(event);
  const fields = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${siteUrl}/download.html?order=${encodeURIComponent(orderId)}`,
    cancel_url: `${siteUrl}/payment.html?product=${encodeURIComponent(request.product)}&cancelled=1`,
    notify_url: `${siteUrl}/api/payfast-itn`,
    name_first: 'GCC Study Hub Customer',
    email_address: email,
    m_payment_id: orderId,
    amount: amountInRands(product),
    item_name: product.title,
    item_description: `Digital download: ${product.title}`,
    custom_str1: request.product,
    email_confirmation: '1',
    confirmation_address: process.env.FROM_EMAIL || ''
  };
  fields.signature = payfastSignature(fields, passphrase);

  await orderStore().setJSON(orderId, {
    orderId,
    productSlug: request.product,
    email,
    amount: fields.amount,
    status: 'pending',
    createdAt: new Date().toISOString()
  });

  return json(200, {
    action: process.env.PAYFAST_LIVE === 'true'
      ? 'https://www.payfast.co.za/eng/process'
      : 'https://sandbox.payfast.co.za/eng/process',
    fields
  });
};
