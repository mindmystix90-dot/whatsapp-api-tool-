import { db } from '../../server/db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  try {
    const businessId = 'bus_admin_platform';
    let connection = await db.getWhatsAppConnectionByBusinessId(businessId);

    if (!connection) {
      connection = await db.upsertWhatsAppConnection({
        id: `wa_${businessId}`,
        business_id: businessId,
        meta_app_id: '3356483501181888',
        waba_id: '',
        phone_number_id: '',
        phone_number: '',
        display_name: '',
        access_token: '',
        webhook_verify_token: process.env.META_DEFAULT_WEBHOOK_VERIFY_TOKEN || 'fishcatch_verify_token_123',
        status: 'Not Connected',
        last_verified_at: null,
        error_message: null,
        last_webhook_received_at: null,
        coexistence_enabled: false,
        coexistence_mode: 'manual',
        safety_status: 'GREEN',
        safety_paused: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    const allConnections = await db.getWhatsAppConnectionsByBusinessId(businessId);
    const maskedConnections = allConnections.map((c) => ({
      ...c,
      access_token: c.access_token ? '••••••••••••••••' : ''
    }));

    const maskedConnection = {
      ...connection,
      access_token: connection.access_token ? '••••••••••••••••' : ''
    };

    const host = req.headers?.host || 'localhost';
    const protocol = req.headers?.['x-forwarded-proto'] || 'https';

    let baseUrl = (process.env.APP_URL || '').trim().replace(/\/$/, '');
    if (!baseUrl || baseUrl.includes('your-domain.vercel.app')) {
      if (host.includes('vercel.app')) {
        baseUrl = `${protocol}://${host}`;
      } else {
        baseUrl = 'https://whatsapp-api-tool2.vercel.app';
      }
    }

    const webhookUrl = `${baseUrl}/api/whatsapp/webhook`;

    return res.status(200).json({
      success: true,
      connection: maskedConnection,
      connections: maskedConnections,
      webhook_url: webhookUrl,
      has_access_token: Boolean(connection.access_token)
    });
  } catch (err: any) {
    console.error('[STANDALONE /api/whatsapp ERROR]:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve WhatsApp status',
      details: err?.message || String(err)
    });
  }
}
