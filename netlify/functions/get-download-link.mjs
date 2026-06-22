import { getStore } from '@netlify/blobs';
import { getProduct } from './products.mjs';
import { createDownloadToken, getSiteUrl, json, readOrder } from './shared.mjs';

export default async (request) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed.' });
  const orderId = new URL(request.url).searchParams.get('order');
  if (!orderId || !/^gcc-[a-z0-9-]+$/i.test(orderId)) return json(400, { error: 'Invalid order reference.' });
  const store = getStore('payfast-orders');
  const order = await readOrder(store, orderId);
  if (!order || order.status !== 'completed') return json(202, { status: 'waiting' });
  const product = getProduct(order.productSlug);
  if (!product) return json(500, { error: 'Product configuration is unavailable.' });
  const token = createDownloadToken(orderId, Date.now() + 30 * 60 * 1000);
  return json(200, { status: 'confirmed', productName: product.title, downloadUrl: `${getSiteUrl(request)}/api/download-file?token=${encodeURIComponent(token)}` });
};
