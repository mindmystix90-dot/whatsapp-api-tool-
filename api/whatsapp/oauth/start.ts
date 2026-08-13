export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).json({ ok: true });
  }

  try {
    const metaAppId = (req.query?.app_id || process.env.META_APP_ID || '').toString().trim();
    
    const host = req.headers.host || 'localhost';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    let baseUrl = `${protocol}://${host}`;
    if (host.includes('vercel.app')) {
      baseUrl = `https://${host}`;
    }

    const redirectUri = `${baseUrl}/api/whatsapp/oauth/callback`;
    const scopes = 'whatsapp_business_management,whatsapp_business_messaging';
    
    const oauthUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(metaAppId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=fishcatch_wa_oauth`;

    return res.status(200).json({
      success: true,
      app_id: metaAppId,
      redirect_uri: redirectUri,
      oauth_url: oauthUrl
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Failed to start OAuth: ${err?.message || String(err)}`
    });
  }
}
