import { db } from '../../server/db.js';
import { resolveAuthenticatedUser } from '../../server/auth.js';
import { sendWhatsAppTextMessage } from '../../server/whatsapp.js';

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
        message: `Method ${req.method} not allowed. Use POST.`
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
      } catch {}
    }

    const { recipientPhone, messageBody } = body;

    if (!recipientPhone || !messageBody) {
      return res.status(400).json({
        success: false,
        status: 'Bad Request',
        error: {
          code: 'MISSING_FIELDS',
          message: 'Recipient phone number and message text are required.'
        }
      });
    }

    const businessId = user.business_id;
    const existing = await db.getWhatsAppConnectionByBusinessId(businessId);

    let phoneNumberId = (body.phone_number_id || body.phoneNumberId || existing?.phone_number_id || '').toString().trim();
    let accessToken = (body.access_token || body.accessToken || '').toString().trim();

    if (!accessToken || accessToken.includes('••••')) {
      accessToken = existing?.access_token || '';
    }

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        status: 'Not Connected',
        error: {
          code: 'NOT_CONNECTED',
          message: 'WhatsApp is not connected or missing credentials. Please connect or test credentials first.'
        }
      });
    }

    // Format recipient phone number for Meta Graph API (digits only with country code)
    const cleanRecipient = recipientPhone.toString().trim().replace(/[^\d]/g, '');
    if (!cleanRecipient) {
      return res.status(400).json({
        success: false,
        status: 'Invalid Phone Number',
        error: {
          code: 'INVALID_RECIPIENT_PHONE',
          message: 'Recipient phone number must contain valid digits with international country code (e.g. 15551234567).'
        }
      });
    }

    const connection = {
      ...existing,
      id: existing?.id || `wa_${businessId}`,
      business_id: businessId,
      phone_number_id: phoneNumberId,
      access_token: accessToken,
      status: 'Connected' as const
    };

    const sendResult = await sendWhatsAppTextMessage(connection, cleanRecipient, messageBody.toString());

    if (sendResult.success) {
      return res.status(200).json({
        success: true,
        wa_message_id: sendResult.wa_message_id,
        message: `Test message sent successfully to ${cleanRecipient}`
      });
    } else {
      return res.status(400).json({
        success: false,
        error: sendResult.error || 'Failed to send test message'
      });
    }
  } catch (err: any) {
    console.error('[STANDALONE /api/whatsapp/send-test ERROR]:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: `Failed to send test message: ${err?.message || String(err)}`
    });
  }
}
