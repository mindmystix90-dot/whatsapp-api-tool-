import app, { appReady } from '../server';

export default async function handler(req: any, res: any) {
  try {
    // Ensure default Content-Type is application/json
    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json');
    }

    // Wait max 2 seconds for background admin seed check, but proceed regardless
    await Promise.race([
      appReady,
      new Promise((resolve) => setTimeout(resolve, 2000))
    ]).catch((err) => {
      console.warn('[Vercel Serverless] Background init warning:', err?.message || err);
    });

    // Execute Express app and handle any uncaught async errors
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
    console.error('[Vercel Serverless Top-Level Error]:', err?.message || err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Server error handling request',
        details: err?.message || String(err)
      });
    }
  }
}

