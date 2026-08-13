import app, { appReady } from '../server.js';

export default async function handler(req: any, res: any) {
  try {
    await appReady;
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel Serverless Function Init Error:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Server initialization failed',
        details: err?.message || String(err)
      });
    }
  }
}
