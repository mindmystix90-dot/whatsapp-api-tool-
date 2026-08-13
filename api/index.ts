import app, { appReady } from '../server.js';

export default async function handler(req: any, res: any) {
  try {
    // Wait max 1.5 seconds for background admin seed check, but proceed regardless
    await Promise.race([
      appReady,
      new Promise((resolve) => setTimeout(resolve, 1500))
    ]).catch((err) => {
      console.warn('[Vercel Serverless] Background init warning:', err?.message || err);
    });

    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Function Error]:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Server error handling request',
        details: err?.message || String(err)
      });
    }
  }
}
