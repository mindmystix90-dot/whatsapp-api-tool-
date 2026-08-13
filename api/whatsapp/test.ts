import { db } from '../../server/db.js';
import { WhatsAppConnectionStatus } from '../../src/types.js';

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
      status: 'Method Not Allowed',
      error: `Method ${req.method} not allowed. Please use POST.`
    });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          success: false,
          status: 'Bad Request',
          error: 'Invalid JSON request body.'
        });
      }
    }

    const businessId = 'bus_admin_platform';
    let existing = await db.getWhatsAppConnectionByBusinessId(businessId);

    let phoneNumberId = (body.phone_number_id || body.phoneNumberId || existing?.phone_number_id || '').toString().trim();
    let accessToken = (body.access_token || body.accessToken || '').toString().trim();

    if (!accessToken || accessToken.includes('••••')) {
      accessToken = existing?.access_token || '';
    }

    const metaAppId = (body.meta_app_id || body.metaAppId || existing?.meta_app_id || '').toString().trim();
    const wabaId = (body.waba_id || body.wabaId || existing?.waba_id || '').toString().trim();
    const webhookVerifyToken = (body.webhook_verify_token || body.webhookVerifyToken || existing?.webhook_verify_token || 'fishcatch_verify_token_123').toString().trim();

    if (!phoneNumberId || !accessToken) {
      if (existing) {
        await db.upsertWhatsAppConnection({
          ...existing,
          status: 'Not Connected',
          error_message: 'Phone Number ID and Access Token are required.'
        });
      }
      return res.status(400).json({
        success: false,
        status: 'Not Connected',
        error: 'Phone Number ID and Access Token are required.'
      });
    }

    // Call Meta Graph API directly
    const cleanPhoneId = encodeURIComponent(phoneNumberId);
    const metaUrl = `https://graph.facebook.com/v21.0/${cleanPhoneId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`;

    const metaRes = await fetch(metaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const metaData = await metaRes.json().catch(() => ({}));

    if (metaRes.ok && metaData.id) {
      const connToSave = {
        id: existing?.id || `wa_${businessId}`,
        business_id: businessId,
        meta_app_id: metaAppId,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        phone_number: metaData.display_phone_number || phoneNumberId,
        display_name: metaData.verified_name || metaData.display_phone_number || 'Meta WhatsApp Business',
        access_token: accessToken,
        webhook_verify_token: webhookVerifyToken,
        status: 'Connected' as WhatsAppConnectionStatus,
        last_verified_at: new Date().toISOString(),
        error_message: null,
        last_webhook_received_at: existing?.last_webhook_received_at || null,
        coexistence_enabled: existing?.coexistence_enabled || false,
        coexistence_mode: existing?.coexistence_mode || 'manual',
        quality_rating: metaData.quality_rating || 'GREEN',
        safety_status: existing?.safety_status || 'GREEN',
        safety_paused: false,
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const saved = await db.upsertWhatsAppConnection(connToSave);

      return res.status(200).json({
        success: true,
        status: 'Connected',
        display_name: saved.display_name,
        phone_number: saved.phone_number,
        quality_rating: saved.quality_rating,
        connection: {
          ...saved,
          access_token: '••••••••••••••••'
        }
      });
    } else {
      const metaErrorMsg = metaData?.error?.message || `Meta Graph API returned HTTP ${metaRes.status}`;

      const connToSave = {
        id: existing?.id || `wa_${businessId}`,
        business_id: businessId,
        meta_app_id: metaAppId,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        phone_number: existing?.phone_number || '',
        display_name: existing?.display_name || '',
        access_token: accessToken,
        webhook_verify_token: webhookVerifyToken,
        status: 'Connection Error' as WhatsAppConnectionStatus,
        last_verified_at: existing?.last_verified_at || null,
        error_message: metaErrorMsg,
        last_webhook_received_at: existing?.last_webhook_received_at || null,
        coexistence_enabled: existing?.coexistence_enabled || false,
        coexistence_mode: existing?.coexistence_mode || 'manual',
        quality_rating: existing?.quality_rating || 'GREEN',
        safety_status: existing?.safety_status || 'GREEN',
        safety_paused: false,
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const saved = await db.upsertWhatsAppConnection(connToSave);

      return res.status(400).json({
        success: false,
        status: 'Connection Error',
        error: metaErrorMsg,
        connection: {
          ...saved,
          access_token: '••••••••••••••••'
        }
      });
    }
  } catch (err: any) {
    console.error('[STANDALONE /api/whatsapp/test ERROR]:', err?.message || err);
    return res.status(500).json({
      success: false,
      status: 'Error',
      error: `Verification error: ${err?.message || String(err)}`
    });
  }
}
