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
      error: `Method ${req.method} not allowed`
    });
  }

  try {
    let user: any = null;
    const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization'];
    const token = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        if (decoded?.id) {
          user = await db.findUserById(decoded.id);
        }
      } catch (e) {}
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
      return res.status(401).json({ error: 'Authentication token required' });
    }

    const businessId = user.business_id || 'bus_admin_platform';

    let body = req.body || {};
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { meta_app_id, waba_id, phone_number_id, access_token, webhook_verify_token } = body;

    let existing = await db.getWhatsAppConnectionByBusinessId(businessId);

    let tokenToSave = access_token;
    if (!tokenToSave || tokenToSave.includes('••••')) {
      tokenToSave = existing?.access_token || '';
    }

    const updatedConn = await db.upsertWhatsAppConnection({
      id: existing?.id || `wa_${businessId}`,
      business_id: businessId,
      meta_app_id: meta_app_id ?? existing?.meta_app_id ?? '',
      waba_id: waba_id ?? existing?.waba_id ?? '',
      phone_number_id: phone_number_id ?? existing?.phone_number_id ?? '',
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
      safety_status: existing?.safety_status || 'GREEN',
      safety_paused: existing?.safety_paused || false,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const maskedConnection = {
      ...updatedConn,
      access_token: updatedConn.access_token ? '••••••••••••••••' : ''
    };

    return res.status(200).json({ connection: maskedConnection });
  } catch (err: any) {
    console.error('❌ Exception in /api/whatsapp/config Vercel handler:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: `Failed to save configuration: ${err?.message || String(err)}`
    });
  }
}
