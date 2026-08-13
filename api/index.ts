console.log('[VERCEL] function module loading');

import app, { appReady } from '../server';

console.log('[VERCEL] server imported');

export default async function handler(req: any, res: any) {
  try {
    console.log('[VERCEL] handler started');

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;

    console.log('[VERCEL] SAFE FIREBASE DIAGNOSTICS:', {
      'FIREBASE_PROJECT_ID exists': Boolean(projectId),
      'FIREBASE_CLIENT_EMAIL exists': Boolean(clientEmail),
      'FIREBASE_PRIVATE_KEY exists': Boolean(privateKeyRaw),
      'FIREBASE_PRIVATE_KEY length': privateKeyRaw ? privateKeyRaw.length : 0
    });

    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json');
    }

    const rawUrl = req.url || '';
    const forwardedUri = req.headers ? (req.headers['x-forwarded-uri'] || req.headers['x-original-url']) : null;

    if (forwardedUri && typeof forwardedUri === 'string' && forwardedUri.startsWith('/api')) {
      req.url = forwardedUri;
    }

    console.log('[VERCEL] request URL:', req.url);
    console.log('[VERCEL] request body detected:', Boolean(req.body), typeof req.body);
    console.log('[VERCEL] express handler started');

    await Promise.race([
      appReady,
      new Promise((resolve) => setTimeout(resolve, 500))
    ]).catch(() => {});

    return await new Promise((resolve) => {
      res.on('finish', resolve);
      res.on('close', resolve);

      app(req, res, (err: any) => {
        if (err && !res.headersSent) {
          console.error('[VERCEL] Express Handler Error:', err?.message || err);
          res.status(err?.status || err?.statusCode || 500).json({
            error: 'Internal server error',
            details: err?.message || String(err)
          });
        }
        resolve(null);
      });
    });
  } catch (err: any) {
    console.error('[VERCEL] Top-Level Catch:', err?.message || err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Server error handling request',
        details: err?.message || String(err)
      });
    }
  }
}
