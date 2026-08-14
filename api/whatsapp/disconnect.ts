import { db } from '../../server/db.js';
import { resolveAuthenticatedUser } from '../../server/auth.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed. Use POST.` });
  }

  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user || !user.business_id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.'
      });
    }

    const businessId = user.business_id;
    const existing = await db.getWhatsAppConnectionByBusinessId(businessId);

    if (existing) {
      await db.upsertWhatsAppConnection({
        ...existing,
        status: 'Not Connected',
        phone_number_id: '',
        phone_number: '',
        display_name: '',
        access_token: '',
        error_message: null,
        last_verified_at: null,
        updated_at: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true,
      message: 'WhatsApp disconnected successfully',
      connection: {
        id: existing?.id || `wa_${businessId}`,
        business_id: businessId,
        status: 'Not Connected',
        phone_number_id: '',
        phone_number: '',
        display_name: '',
        access_token: '',
        meta_app_id: existing?.meta_app_id || '',
        waba_id: existing?.waba_id || '',
        webhook_verify_token: existing?.webhook_verify_token || 'fishcatch_verify_token_123'
      }
    });
  } catch (err: any) {
    console.error('[STANDALONE /api/whatsapp/disconnect ERROR]:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: `Failed to disconnect WhatsApp: ${err?.message || String(err)}`
    });
  }
}
