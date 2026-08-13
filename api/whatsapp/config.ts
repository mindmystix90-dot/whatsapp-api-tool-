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
      error: `Method ${req.method} not allowed. Use POST.`
    });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string' && body.trim()) {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { meta_app_id, waba_id, phone_number_id, access_token, webhook_verify_token } = body;

    const connection = {
      id: `wa_${phone_number_id || 'config'}`,
      business_id: 'bus_admin_platform',
      meta_app_id: meta_app_id || '',
      waba_id: waba_id || '',
      phone_number_id: phone_number_id || '',
      phone_number: '',
      display_name: '',
      access_token: '••••••••••••••••',
      webhook_verify_token: webhook_verify_token || 'fishcatch_verify_token_123',
      status: 'Not Connected',
      last_verified_at: null,
      error_message: null,
      coexistence_enabled: false,
      coexistence_mode: 'manual',
      quality_rating: 'GREEN',
      safety_status: 'GREEN',
      safety_paused: false,
      updated_at: new Date().toISOString()
    };

    return res.status(200).json({ connection });
  } catch (err: any) {
    console.error('[STANDALONE /api/whatsapp/config ERROR]:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: `Failed to save configuration: ${err?.message || String(err)}`
    });
  }
}
