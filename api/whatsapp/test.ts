export default async function handler(req: any, res: any) {
  // Set JSON content-type header for all responses
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Handle CORS / preflight if needed
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
    // Safely parse body
    let body = req.body || {};
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch (parseError) {
        return res.status(400).json({
          success: false,
          status: 'Bad Request',
          error: 'Invalid JSON request body.'
        });
      }
    }

    const phoneNumberId = (body.phone_number_id || body.phoneNumberId || '').toString().trim();
    const accessToken = (body.access_token || body.accessToken || '').toString().trim();

    if (!phoneNumberId || !accessToken || accessToken.includes('••••')) {
      return res.status(400).json({
        success: false,
        status: 'Not Connected',
        error: 'Phone Number ID and Access Token are required.'
      });
    }

    // Call Meta Graph API directly with zero external dependencies
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
      return res.status(200).json({
        success: true,
        status: 'Connected',
        display_name: metaData.verified_name || metaData.display_phone_number || 'Meta WhatsApp Business',
        phone_number: metaData.display_phone_number || phoneNumberId,
        quality_rating: metaData.quality_rating || 'GREEN',
        connection: {
          id: `wa_${phoneNumberId}`,
          phone_number_id: phoneNumberId,
          display_name: metaData.verified_name || metaData.display_phone_number || 'Meta WhatsApp Business',
          phone_number: metaData.display_phone_number || phoneNumberId,
          status: 'Connected',
          quality_rating: metaData.quality_rating || 'GREEN',
          access_token: '••••••••••••••••'
        }
      });
    } else {
      const metaErrorMsg = metaData?.error?.message || `Meta Graph API returned HTTP ${metaRes.status}`;
      return res.status(400).json({
        success: false,
        status: 'Connection Error',
        error: metaErrorMsg,
        connection: {
          id: `wa_${phoneNumberId}`,
          phone_number_id: phoneNumberId,
          status: 'Connection Error',
          error_message: metaErrorMsg,
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
