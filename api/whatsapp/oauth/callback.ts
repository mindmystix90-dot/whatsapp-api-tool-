export default async function handler(req: any, res: any) {
  const code = (req.query?.code || '').toString().trim();
  const error = (req.query?.error || req.query?.error_message || '').toString().trim();

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (error) {
    return res.status(400).send(`
      <!Debug HTML>
      <html>
        <head><title>Meta Authentication Error</title></head>
        <body style="font-family: system-ui, sans-serif; padding: 30px; background: #fff1f2; color: #9f1239;">
          <h2>WhatsApp Meta OAuth Error</h2>
          <p>${error}</p>
          <button onclick="window.close()" style="padding: 8px 16px; cursor: pointer;">Close Window</button>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'WA_OAUTH_RESPONSE', success: false, error: ${JSON.stringify(error)} }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }

  return res.status(200).send(`
    <!DOCTYPE html>
    <html>
      <head><title>Meta WhatsApp OAuth Complete</title></head>
      <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc;">
        <div style="text-align: center; padding: 24px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <h3 style="color: #0f172a; margin-top: 0;">Authorization Complete</h3>
          <p style="color: #64748b; font-size: 14px;">Returning to Fishcatch AI WhatsApp Manager...</p>
        </div>
        <script>
          const authCode = ${JSON.stringify(code)};
          if (window.opener) {
            window.opener.postMessage({ type: 'WA_OAUTH_RESPONSE', success: true, code: authCode }, '*');
            setTimeout(() => window.close(), 1200);
          } else {
            window.location.href = '/whatsapp';
          }
        </script>
      </body>
    </html>
  `);
}
