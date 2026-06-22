const { getProduct } = require('./products');
const { createDownloadToken, getSiteUrl, json, orderStore } = require('./shared');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' });
  const orderId = event.queryStringParameters && event.queryStringParameters.order;
  if (!orderId || !/^gcc-[a-z0-9-]+$/i.test(orderId)) return json(400, { error: 'Invalid order reference.' });

  const order = await orderStore().get(orderId, { type: 'json' });
  if (!order || order.status !== 'completed') return json(202, { status: 'waiting' });

  const product = getProduct(order.productSlug);
  if (!product) return json(500, { error: 'Product configuration is unavailable.' });
  const expiresAt = Date.now() + (30 * 60 * 1000);
  const token = createDownloadToken(orderId, expiresAt);
  return json(200, {
    status: 'confirmed',
    productName: product.title,
    downloadUrl: `${getSiteUrl(event)}/api/download-file?token=${encodeURIComponent(token)}`,
    expiresAt
  });
};
