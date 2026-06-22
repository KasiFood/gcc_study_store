import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getStore } from '@netlify/blobs';
import { getProduct } from './products.mjs';
import { json, readDownloadToken, readOrder } from './shared.mjs';

const MIME_TYPES = { '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '.zip': 'application/zip' };

export default async (request) => {
  if (request.method !== 'GET') return json(405, { error: 'Method not allowed.' });
  const payload = readDownloadToken(new URL(request.url).searchParams.get('token'));
  if (!payload) return json(403, { error: 'This download link is invalid or has expired.' });
  const store = getStore('payfast-orders');
  const order = await readOrder(store, payload.orderId);
  const product = order && order.status === 'completed' && getProduct(order.productSlug);
  if (!product) return json(403, { error: 'Payment confirmation was not found.' });

  const directory = path.resolve(process.cwd(), 'private-downloads');
  const filePath = path.resolve(directory, product.file);
  if (!filePath.startsWith(`${directory}${path.sep}`)) return json(403, { error: 'Invalid download request.' });
  try {
    const file = await readFile(filePath);
    return new Response(file, { headers: { 'Content-Type': MIME_TYPES[path.extname(product.file).toLowerCase()] || 'application/octet-stream', 'Content-Disposition': `attachment; filename="${product.file}"`, 'Cache-Control': 'private, no-store' } });
  } catch {
    return json(404, { error: 'The purchased file is not available yet. Please contact support.' });
  }
};
