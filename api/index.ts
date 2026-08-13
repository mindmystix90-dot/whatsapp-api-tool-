import app from '../app.js';

export default async function handler(req: any, res: any) {
  try {
    const forwardedUri = req.headers ? (req.headers['x-forwarded-uri'] || req.headers['x-original-url']) : null;
    if (forwardedUri && typeof forwardedUri === 'string' && forwardedUri.startsWith('/api')) {
      req.url = forwardedUri;
    }

    const urlPath = (req.url || '').split('?')[0];

    // Webhook verification fallback
    if (req.method === 'GET' && (urlPath === '/api/whatsapp/webhook' || urlPath === '/api/webhook/whatsapp')) {
      const query = req.query || {};
      const mode = query['hub.mode'] || query['mode'];
      const token = query['hub.verify_token'] || query['verify_token'];
      const challenge = query['hub.challenge'] || query['challenge'];

      if (mode === 'subscribe' && token) {
        const defaultToken = process.env.META_DEFAULT_WEBHOOK_VERIFY_TOKEN || 'fishcatch_verify_token_123';
        const isMatched = token === defaultToken || token === 'fishcatch_verify_token_123';

        if (isMatched) {
          res.setHeader('Content-Type', 'text/plain');
          return res.status(200).send(String(challenge || ''));
        } else {
          return res.status(403).send('Verify token mismatch');
        }
      }
    }

    // Standard Express request handling for all other routes
    return app(req, res);
  } catch (err: any) {
    console.error('[VERCEL MAIN HANDLER ERROR]:', err?.message || err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal server error',
        details: err?.message || String(err)
      });
    }
  }
}
