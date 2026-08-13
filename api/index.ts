import app, { appReady } from '../server';

export default async function handler(req: any, res: any) {
  try {
    // Ensure default Content-Type is application/json
    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json');
    }

    // Normalize URL for Vercel rewrites if needed
    const rawUrl = req.url || '';
    const forwardedUri = req.headers ? (req.headers['x-forwarded-uri'] || req.headers['x-matched-path']) : null;
    console.log(`[VERCEL HANDLER] ${req.method} ${rawUrl} | Forwarded: ${forwardedUri || 'N/A'}`);

    if (forwardedUri && typeof forwardedUri === 'string' && forwardedUri.startsWith('/api')) {
      req.url = forwardedUri;
    }

    // Wait max 1.5s for appReady background admin seed, but proceed regardless
    await Promise.race([
      appReady,
      new Promise((resolve) => setTimeout(resolve, 1500))
    ]).catch((err) => {
      console.warn('[Vercel Serverless] Background init warning:', err?.message || err);
    });

    // Execute Express app and handle response completion
    return await new Promise((resolve) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      
      app(req, res, (err: any) => {
        if (err && !res.headersSent) {
          console.error('[Vercel Express Handler Error]:', err?.message || err);
          res.status(err?.status || err?.statusCode || 500).json({
            error: 'Internal server error',
            details: err?.message || String(err)
          });
        }
        resolve(null);
      });
    });
  } catch (err: any) {
    console.error('[Vercel Serverless Top-Level Catch]:', err?.message || err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Server error handling request',
        details: err?.message || String(err)
      });
    }
  }
}


