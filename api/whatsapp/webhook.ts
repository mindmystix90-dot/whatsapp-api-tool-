export default async function handler(req: any, res: any) {
  const method = req.method || 'GET';

  // =========================================================================
  // GET: Meta WhatsApp Webhook Verification
  // CRITICAL: MUST BE 100% ISOLATED FROM FIREBASE, FIRESTORE, APP.TS, & HEAVY MODULES
  // =========================================================================
  if (method === 'GET') {
    const query = req.query || {};
    const mode = query['hub.mode'] || query['mode'];
    const token = query['hub.verify_token'] || query['verify_token'];
    const challenge = query['hub.challenge'] || query['challenge'];

    console.log('[VERCEL WEBHOOK] GET Verification Request:', { mode, token, challenge });

    if (mode === 'subscribe' && token) {
      const defaultToken = process.env.META_DEFAULT_WEBHOOK_VERIFY_TOKEN || 'fishcatch_verify_token_123';
      const isMatched = token === defaultToken || token === 'fishcatch_verify_token_123';

      if (isMatched) {
        console.log('[VERCEL WEBHOOK] Verification successful! Returning challenge:', challenge);
        res.setHeader('Content-Type', 'text/plain');
        return res.status(200).send(String(challenge || ''));
      } else {
        console.warn('[VERCEL WEBHOOK] Verify token mismatch:', token);
        return res.status(403).send('Verify token mismatch');
      }
    }

    return res.status(400).send('Invalid verification request parameters');
  }

  // =========================================================================
  // POST: Meta WhatsApp Incoming Webhook Event
  // Loads processing logic dynamically when needed
  // =========================================================================
  if (method === 'POST') {
    try {
      const { handleWebhookEvent } = await import('../../server/webhook.js');
      return await handleWebhookEvent(req, res);
    } catch (err: any) {
      console.error('[VERCEL WEBHOOK] Error processing POST event:', err?.message || err);
      if (!res.headersSent) {
        return res.status(200).send('EVENT_RECEIVED');
      }
    }
  }

  return res.status(405).send('Method Not Allowed');
}
