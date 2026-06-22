import { getStore } from '@netlify/blobs';
import { amountInRands, getProduct } from './products.mjs';
import { payfastSignature, readOrder, safeEqual, writeOrder } from './shared.mjs';

export default async (request) => {
  if (request.method !== 'POST') return new Response('Method not allowed.', { status: 405 });
  const raw = await request.text();
  const received = Object.fromEntries(new URLSearchParams(raw));
  const receivedSignature = received.signature;
  delete received.signature;
  const orderId = received.m_payment_id;
  if (!orderId || !receivedSignature) return new Response('Missing payment information.', { status: 400 });

  const store = getStore('payfast-orders');
  const order = await readOrder(store, orderId);
  if (!order) return new Response('Unknown payment.', { status: 400 });
  if (!safeEqual(receivedSignature, payfastSignature(received, process.env.PAYFAST_PASSPHRASE))) {
    return new Response('Invalid signature.', { status: 400 });
  }

  const product = getProduct(order.productSlug);
  if (!product || Number(received.amount_gross).toFixed(2) !== amountInRands(product) || received.payment_status !== 'COMPLETE') {
    return new Response('Payment is not complete.', { status: 400 });
  }

  const validationUrl = process.env.PAYFAST_LIVE === 'true' ? 'https://www.payfast.co.za/eng/query/validate' : 'https://sandbox.payfast.co.za/eng/query/validate';
  const validation = await fetch(validationUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: raw });
  if (!validation.ok || (await validation.text()).trim() !== 'VALID') return new Response('Payment validation failed.', { status: 400 });

  await writeOrder(store, orderId, { ...order, status: 'completed', payfastPaymentId: received.pf_payment_id || null, completedAt: new Date().toISOString() });
  return new Response('OK');
};
