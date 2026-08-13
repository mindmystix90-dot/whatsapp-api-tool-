import { sendWhatsAppTextMessage } from '../../server/whatsapp.js';
import { db } from '../../server/db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fishcatch_super_secret_jwt_key_2026';

function isPersonalMode(): boolean {
  return process.env.PERSONAL_MODE !== 'false';
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: `Method ${req.method} not allowed` });
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

    const { recipientPhone, messageBody } = body;
    if (!recipientPhone || !messageBody) {
      return res.status(400).json({ error: 'Recipient phone number and message text are required.' });
    }

    const connection = await db.getWhatsAppConnectionByBusinessId(businessId);
    if (!connection || connection.status !== 'Connected') {
      return res.status(400).json({ error: 'WhatsApp is not connected. Please verify credentials first.' });
    }

    const sendResult = await sendWhatsAppTextMessage(connection, recipientPhone, messageBody);

    if (sendResult.success) {
      return res.status(200).json({
        success: true,
        wa_message_id: sendResult.wa_message_id,
        message: `Test message sent successfully to ${recipientPhone}`
      });
    } else {
      return res.status(400).json({
        success: false,
        error: sendResult.error
      });
    }
  } catch (err: any) {
    console.error('❌ Exception in /api/whatsapp/send-test Vercel handler:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: `Failed to send test message: ${err?.message || String(err)}`
    });
  }
}
