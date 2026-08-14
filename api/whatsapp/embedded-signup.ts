import { resolveAuthenticatedUser } from '../../server/auth.js';
import { processEmbeddedSignup } from '../../server/whatsapp.js';

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

    const { code, phone_number_id, waba_id, meta_app_id, access_token, coexistence_mode } = body;

    const result = await processEmbeddedSignup({
      businessId: user.business_id,
      code,
      phoneNumberId: phone_number_id,
      wabaId: waba_id,
      metaAppId: meta_app_id,
      accessToken: access_token,
      coexistenceMode: coexistence_mode
    });

    return res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('❌ [WhatsApp Embedded Signup Fatal Exception]:', err?.message || err);
    return res.status(500).json({
      success: false,
      status: 'Error',
      error: {
        code: 'EMBEDDED_SIGNUP_FATAL_ERROR',
        message: `Embedded Signup processing failed: ${err?.message || String(err)}`
      }
    });
  }
}
