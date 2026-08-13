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

    const { recipientPhone, messageBody, phone_number_id, access_token } = body;

    if (!recipientPhone || !messageBody) {
      return res.status(400).json({
        success: false,
        error: 'Recipient phone number and message text are required.'
      });
    }

    if (!phone_number_id || !access_token || access_token.includes('••••')) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp is not connected or missing credentials. Please test credentials first.'
      });
    }

    const cleanPhoneId = encodeURIComponent(phone_number_id.toString().trim());
    const metaUrl = `https://graph.facebook.com/v21.0/${cleanPhoneId}/messages`;

    const metaRes = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token.toString().trim()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: recipientPhone.toString().trim(),
        type: 'text',
        text: { body: messageBody.toString() }
      })
    });

    const metaData = await metaRes.json().catch(() => ({}));

    if (metaRes.ok && metaData.messages?.[0]?.id) {
      return res.status(200).json({
        success: true,
        wa_message_id: metaData.messages[0].id,
        message: `Test message sent successfully to ${recipientPhone}`
      });
    } else {
      const errorMsg = metaData?.error?.message || `Meta Graph API returned HTTP ${metaRes.status}`;
      return res.status(400).json({
        success: false,
        error: errorMsg
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
