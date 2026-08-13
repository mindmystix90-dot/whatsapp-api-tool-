import { db } from '../../server/db.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed. Use POST.`
    });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { meta_app_id, waba_id, phone_number_id, access_token, webhook_verify_token } = body;
    const businessId = 'bus_admin_platform';

    let existing = await db.getWhatsAppConnectionByBusinessId(businessId);

    // Keep existing access token if user provided masked token or empty
    let tokenToSave = (access_token || '').toString().trim();
    if (!tokenToSave || tokenToSave.includes('••••')) {
      tokenToSave = existing?.access_token || '';
    }

    const cleanPhoneId = (phone_number_id || existing?.phone_number_id || '').toString().trim();

    const connToSave = {
      id: existing?.id || `wa_${businessId}`,
      business_id: businessId,
      meta_app_id: meta_app_id ?? existing?.meta_app_id ?? '',
      waba_id: waba_id ?? existing?.waba_id ?? '',
      phone_number_id: cleanPhoneId,
      phone_number: existing?.phone_number || '',
      display_name: existing?.display_name || '',
      access_token: tokenToSave,
      webhook_verify_token: webhook_verify_token || existing?.webhook_verify_token || 'fishcatch_verify_token_123',
      status: existing?.status || 'Not Connected',
      last_verified_at: existing?.last_verified_at || null,
      error_message: existing?.error_message || null,
      last_webhook_received_at: existing?.last_webhook_received_at || null,
      coexistence_enabled: existing?.coexistence_enabled || false,
      coexistence_mode: existing?.coexistence_mode || 'manual',
      quality_rating: existing?.quality_rating || 'GREEN',
      safety_status: existing?.safety_status || 'GREEN',
      safety_paused: existing?.safety_paused || false,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const saved = await db.upsertWhatsAppConnection(connToSave);

    const maskedConnection = {
      ...saved,
      access_token: saved.access_token ? '••••••••••••••••' : ''
    };

    return res.status(200).json({
      success: true,
      message: 'WhatsApp configuration saved',
      connection: maskedConnection
    });
  } catch (err: any) {
    console.error('[STANDALONE /api/whatsapp/config ERROR]:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: `Failed to save configuration: ${err?.message || String(err)}`
    });
  }
}
