import { verifyWhatsAppCredentials } from '../../server/whatsapp.js';
import { db } from '../../server/db.js';
import { WhatsAppConnection } from '../../src/types.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fishcatch_super_secret_jwt_key_2026';

function isPersonalMode(): boolean {
  return process.env.PERSONAL_MODE !== 'false';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      status: 'Method Not Allowed',
      error: `Method ${req.method} not allowed. Use POST.`
    });
  }

  try {
    // 1. Authenticate Request
    let user: any = null;
    const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
    const token = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded?.id) {
          user = await db.findUserById(decoded.id);
        }
      } catch (e) {
        // Token invalid, fallback to personal user if allowed
      }
    }

    if (!user && isPersonalMode()) {
      user = {
        id: 'user_admin_platform',
        email: 'admin@fishcatch.io',
        name: 'Fishcatch Personal Admin',
        role: 'admin',
        business_id: 'bus_admin_platform'
      };
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        status: 'Unauthorized',
        error: 'Authentication token required.'
      });
    }

    const businessId = user.business_id || 'bus_admin_platform';

    // 2. Parse request body
    let body = req.body || {};
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    let phoneNumberId = body.phone_number_id || body.phoneNumberId;
    let accessToken = body.access_token || body.accessToken;
    let metaAppId = body.meta_app_id || body.metaAppId;
    let wabaId = body.waba_id || body.wabaId;
    let webhookVerifyToken = body.webhook_verify_token || body.webhookVerifyToken;

    // Load existing connection if available
    let connection = await db.getWhatsAppConnectionByBusinessId(businessId);

    if (!accessToken || accessToken.includes('••••')) {
      accessToken = connection?.access_token;
    }
    if (!phoneNumberId) {
      phoneNumberId = connection?.phone_number_id;
    }
    if (!metaAppId) {
      metaAppId = connection?.meta_app_id;
    }
    if (!wabaId) {
      wabaId = connection?.waba_id;
    }
    if (!webhookVerifyToken) {
      webhookVerifyToken = connection?.webhook_verify_token;
    }

    if (!phoneNumberId || !accessToken || accessToken.includes('••••')) {
      if (connection) {
        await db.upsertWhatsAppConnection({
          ...connection,
          status: 'Not Connected',
          error_message: 'Phone Number ID and Access Token are required to connect.'
        });
      }
      return res.status(400).json({
        success: false,
        status: 'Not Connected',
        error: 'Phone Number ID and Access Token are required.'
      });
    }

    // 3. Verify against Meta Graph API v21.0
    const verification = await verifyWhatsAppCredentials(phoneNumberId, accessToken);

    // 4. Save result
    const connToSave: WhatsAppConnection = {
      id: connection?.id || `wa_${businessId}`,
      business_id: businessId,
      meta_app_id: metaAppId || connection?.meta_app_id || '',
      waba_id: wabaId || connection?.waba_id || '',
      phone_number_id: phoneNumberId,
      phone_number: verification.display_phone_number || connection?.phone_number || '',
      display_name: verification.display_name || connection?.display_name || '',
      access_token: accessToken,
      webhook_verify_token: webhookVerifyToken || connection?.webhook_verify_token || 'fishcatch_verify_token_123',
      status: verification.success ? 'Connected' : 'Connection Error',
      last_verified_at: verification.success ? new Date().toISOString() : connection?.last_verified_at || null,
      error_message: verification.success ? null : (verification.error || 'Failed to verify WhatsApp credentials'),
      last_webhook_received_at: connection?.last_webhook_received_at || null,
      coexistence_enabled: connection?.coexistence_enabled || false,
      coexistence_mode: connection?.coexistence_mode || 'manual',
      quality_rating: verification.quality_rating || connection?.quality_rating || 'GREEN',
      safety_status: connection?.safety_status || 'GREEN',
      safety_paused: connection?.safety_paused || false,
      created_at: connection?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updated = await db.upsertWhatsAppConnection(connToSave);

    const maskedConnection = {
      ...updated,
      access_token: '••••••••••••••••'
    };

    if (verification.success) {
      return res.status(200).json({
        success: true,
        status: 'Connected',
        display_name: verification.display_name,
        phone_number: verification.display_phone_number,
        quality_rating: verification.quality_rating,
        connection: maskedConnection
      });
    } else {
      return res.status(400).json({
        success: false,
        status: 'Connection Error',
        error: verification.error,
        connection: maskedConnection
      });
    }
  } catch (err: any) {
    console.error('❌ Exception in /api/whatsapp/test Vercel handler:', err?.message || err);
    return res.status(500).json({
      success: false,
      status: 'Error',
      error: `Server error during verification: ${err?.message || String(err)}`
    });
  }
}
