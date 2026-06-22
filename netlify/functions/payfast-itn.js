const { getProduct, amountInRands } = require('./products');
const { json, orderStore, payfastSignature, safeEqual } = require('./shared');

function rawBody(event) {
  if (!event.isBase64Encoded) return event.body || '';
  return Buffer.from(event.body || '', 'base64').toString('utf8');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });

  const raw = rawBody(event);
  const received = Object.fromEntries(new URLSearchParams(raw));
  const receivedSignature = received.signature;
  delete received.signature;
  const orderId = received.m_payment_id;
  if (!orderId || !receivedSignature) return { statusCode: 400, body: 'Missing payment information.' };

  const order = await orderStore().get(orderId, { type: 'json' });
  if (!order) return { statusCode: 400, body: 'Unknown payment.' };

  const passphrase = process.env.PAYFAST_PASSPHRASE;
  const expectedSignature = payfastSignature(received, passphrase);
  if (!safeEqual(receivedSignature, expectedSignature)) return { statusCode: 400, body: 'Invalid signature.' };

  const product = getProduct(order.productSlug);
  const paidAmount = Number(received.amount_gross).toFixed(2);
  if (!product || paidAmount !== amountInRands(product) || received.payment_status !== 'COMPLETE') {
    return { statusCode: 400, body: 'Payment is not complete.' };
  }

  const validationUrl = process.env.PAYFAST_LIVE === 'true'
    ? 'https://www.payfast.co.za/eng/query/validate'
    : 'https://sandbox.payfast.co.za/eng/query/validate';
  const validation = await fetch(validationUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: raw
  });
  const validationText = (await validation.text()).trim();
  if (!validation.ok || validationText !== 'VALID') {
    return { statusCode: 400, body: 'Payment validation failed.' };
  }

  await orderStore().setJSON(orderId, {
    ...order,
    status: 'completed',
    payfastPaymentId: received.pf_payment_id || null,
    completedAt: new Date().toISOString()
  });
  return { statusCode: 200, body: 'OK' };
};
