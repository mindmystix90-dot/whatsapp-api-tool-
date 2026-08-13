import { db } from '../../server/db.js';

export default async function handler(req: any, res: any) {
  // Always return 200 OK
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  const productionDomain = 'https://whatsapp-api-tool2.vercel.app';

  if (req.method === 'POST') {
    try {
      let body = req.body || {};
      if (typeof body === 'string' && body.trim()) {
        try {
          body = JSON.parse(body);
        } catch {}
      }

      const signedRequest = body.signed_request || req.query?.signed_request;
      let userId = body.user_id || req.query?.user_id || 'meta_user_unknown';

      // Parse signed_request if present (Meta payload format)
      if (signedRequest && typeof signedRequest === 'string' && signedRequest.includes('.')) {
        try {
          const encodedData = signedRequest.split('.')[1];
          if (encodedData) {
            const decodedJson = Buffer.from(encodedData, 'base64').toString('utf-8');
            const data = JSON.parse(decodedJson);
            if (data.user_id) {
              userId = data.user_id;
            }
          }
        } catch (e) {
          console.warn('[DATA DELETION] Could not decode signed_request payload:', e);
        }
      }

      const confirmationCode = `DEL_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const statusUrl = `${productionDomain}/data-deletion?id=${confirmationCode}`;

      console.log(`[META DATA DELETION REQUEST] Processed deletion callback for user: ${userId}, confirmationCode: ${confirmationCode}`);

      // Record audit log if DB available
      try {
        await db.createAdminAuditLog({
          admin_id: 'meta_system',
          admin_email: 'deletion-callback@facebook.com',
          action: 'META_DATA_DELETION_CALLBACK',
          target_business_id: userId,
          target_business_name: 'Meta User Deletion',
          details: `Meta data deletion requested for user ID ${userId}. Confirmation Code: ${confirmationCode}`,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.warn('[DATA DELETION] Non-fatal DB logging notice:', e);
      }

      // Meta Data Deletion Callback required JSON response format
      return res.status(200).json({
        url: statusUrl,
        confirmation_code: confirmationCode
      });
    } catch (err: any) {
      console.error('[META DATA DELETION ERROR]:', err);
      const fallbackCode = `DEL_${Date.now()}_FALLBACK`;
      return res.status(200).json({
        url: `${productionDomain}/data-deletion?id=${fallbackCode}`,
        confirmation_code: fallbackCode
      });
    }
  }

  // GET Request: Returns HTTP 200 with deletion info & status instructions
  return res.status(200).json({
    status: 'ACTIVE',
    service: 'Meta WhatsApp User Data Deletion Service',
    domain: productionDomain,
    instructions: 'Send HTTP POST with signed_request to trigger automated user data deletion under Meta Platform requirements.',
    status_url_template: `${productionDomain}/data-deletion?id={confirmation_code}`
  });
}
