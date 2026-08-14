import { db } from '../../server/db.js';
import { resolveAuthenticatedUser } from '../../server/auth.js';
import { verifyWhatsAppCredentials } from '../../server/whatsapp.js';
import { WhatsAppConnectionStatus } from '../../src/types.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      status: 'Method Not Allowed',
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: `Method ${req.method} not allowed. Please use POST.`
      }
    });
  }

  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user || !user.business_id) {
      return res.status(401).json({
        success: false,
        status: 'Unauthorized',
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in.'
        }
      });
    }

    let body = req.body || {};
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          success: false,
          status: 'Bad Request',
          error: {
            code: 'INVALID_JSON',
            message: 'Invalid JSON request body.'
          }
        });
      }
    }

    const businessId = user.business_id;
    let existing = await db.getWhatsAppConnectionByBusinessId(businessId);

    let phoneNumberId = (body.phone_number_id || body.phoneNumberId || existing?.phone_number_id || '').toString().trim();
    let accessToken = (body.access_token || body.accessToken || '').toString().trim();

    if (!accessToken || accessToken.includes('••••')) {
      accessToken = existing?.access_token || '';
    }

    const metaAppId = (body.meta_app_id || body.metaAppId || existing?.meta_app_id || '3356483501181888').toString().trim();
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
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'Phone Number ID and Access Token are required to test connection.'
        }
      });
    }

    const verification = await verifyWhatsAppCredentials(phoneNumberId, accessToken);

    if (verification.success) {
      const connToSave = {
        id: existing?.id || `wa_${businessId}`,
        business_id: businessId,
        meta_app_id: metaAppId,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        phone_number: verification.display_phone_number || existing?.phone_number || phoneNumberId,
        display_name: verification.display_name || existing?.display_name || 'Meta WhatsApp Business',
        access_token: accessToken,
        webhook_verify_token: webhookVerifyToken,
        status: 'Connected' as WhatsAppConnectionStatus,
        last_verified_at: new Date().toISOString(),
        error_message: null,
        last_webhook_received_at: existing?.last_webhook_received_at || null,
        coexistence_enabled: existing?.coexistence_enabled || false,
        coexistence_mode: existing?.coexistence_mode || 'manual',
        quality_rating: (verification.quality_rating || 'GREEN') as any,
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
      const connToSave = {
        id: existing?.id || `wa_${businessId}`,
        business_id: businessId,
        meta_app_id: metaAppId,
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        phone_number: existing?.phone_number || phoneNumberId,
        display_name: existing?.display_name || 'Meta WhatsApp Business',
        access_token: accessToken,
        webhook_verify_token: webhookVerifyToken,
        status: 'Connection Error' as WhatsAppConnectionStatus,
        last_verified_at: existing?.last_verified_at || null,
        error_message: verification.error || 'Failed to verify WhatsApp credentials.',
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
        error: {
          code: 'VERIFICATION_FAILED',
          message: verification.error || 'Failed to verify WhatsApp credentials with Meta Graph API.'
        },
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
      error: {
        code: 'TEST_ROUTE_FATAL_ERROR',
        message: `Server error during verification: ${err?.message || String(err)}`
      }
    });
  }
}
