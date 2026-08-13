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
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed. Use POST.` });
  }

  try {
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
        error: 'Recipient phone number and message text are required.'
      });
    }

    const businessId = 'bus_admin_platform';
    const existing = await db.getWhatsAppConnectionByBusinessId(businessId);

    let phoneNumberId = (body.phone_number_id || body.phoneNumberId || existing?.phone_number_id || '').toString().trim();
    let accessToken = (body.access_token || body.accessToken || '').toString().trim();

    if (!accessToken || accessToken.includes('••••')) {
      accessToken = existing?.access_token || '';
    }

    if (!phoneNumberId || !accessToken) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp is not connected or missing credentials. Please test credentials first.'
      });
    }

    // Format recipient phone number for Meta Graph API (e.g. remove +, spaces, dashes)
    let cleanRecipient = recipientPhone.toString().trim().replace(/[^\d]/g, '');

    const cleanPhoneId = encodeURIComponent(phoneNumberId);
    const metaUrl = `https://graph.facebook.com/v21.0/${cleanPhoneId}/messages`;

    console.log(`💬 [/api/whatsapp/send-test] Sending message via Meta API to ${cleanRecipient} using PhoneId: ${phoneNumberId}`);

    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanRecipient,
        type: 'text',
        text: { body: messageBody.toString() }
      })
    });

    const metaData = await metaRes.json().catch(() => ({}));

    if (metaRes.ok && metaData.messages?.[0]?.id) {
      const waMsgId = metaData.messages[0].id;
      console.log(`✅ [/api/whatsapp/send-test] Message sent successfully. WA ID: ${waMsgId}`);
      return res.status(200).json({
        success: true,
        wa_message_id: waMsgId,
        message: `Test message sent successfully to ${recipientPhone}`
      });
    } else {
      const errorMsg = metaData?.error?.message || `Meta Graph API returned HTTP ${metaRes.status}`;
      console.error(`❌ [/api/whatsapp/send-test] Meta API Error:`, metaData);
      return res.status(400).json({
        success: false,
        error: `Meta Cloud API Error: ${errorMsg}`
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
