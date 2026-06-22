const fs = require('fs/promises');
const path = require('path');
const { getProduct } = require('./products');
const { json, orderStore, readDownloadToken } = require('./shared');

const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.zip': 'application/zip'
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' });
  const token = event.queryStringParameters && event.queryStringParameters.token;
  const payload = readDownloadToken(token);
  if (!payload) return json(403, { error: 'This download link is invalid or has expired.' });

  const order = await orderStore().get(payload.orderId, { type: 'json' });
  const product = order && order.status === 'completed' && getProduct(order.productSlug);
  if (!product) return json(403, { error: 'Payment confirmation was not found.' });

  const directory = path.resolve(process.cwd(), 'private-downloads');
  const filePath = path.resolve(directory, product.file);
  if (!filePath.startsWith(`${directory}${path.sep}`)) return json(403, { error: 'Invalid download request.' });
  try {
    const file = await fs.readFile(filePath);
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        'Content-Type': MIME_TYPES[path.extname(product.file).toLowerCase()] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${product.file}"`,
        'Cache-Control': 'private, no-store'
      },
      body: file.toString('base64')
    };
  } catch {
    return json(404, { error: 'The purchased file is not available yet. Please contact support.' });
  }
};
