import { db } from '../../server/db.js';
import { resolveAuthenticatedUser } from '../../server/auth.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  try {
    const user = await resolveAuthenticatedUser(req);
    if (!user || !user.business_id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.'
      });
    }

    const businessId = user.business_id;

    if (req.method === 'GET') {
      const templates = await db.getTemplatesByBusinessId(businessId);
      return res.status(200).json({ templates });
    }

    if (req.method === 'POST') {
      let body = req.body || {};
      if (typeof body === 'string' && body.trim()) {
        try {
          body = JSON.parse(body);
        } catch {}
      }

      const { name, category, language, header_text, body_text, footer_text } = body;
      if (!name || !body_text) {
        return res.status(400).json({
          error: 'Template name and body text are required.'
        });
      }

      const templateNameClean = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      const newTemplate = await db.createTemplate({
        id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        business_id: businessId,
        name: templateNameClean,
        category: category || 'UTILITY',
        language: language || 'en_US',
        status: 'APPROVED',
        meta_template_id: `meta_tmpl_${Date.now()}`,
        header_text: header_text || '',
        body_text: body_text || '',
        footer_text: footer_text || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      return res.status(200).json({ template: newTemplate });
    }

    if (req.method === 'DELETE') {
      const urlParts = (req.url || '').split('?')[0].split('/');
      const templateId = urlParts[urlParts.length - 1] || req.query?.id;

      if (templateId && templateId !== 'templates') {
        await db.deleteTemplate(templateId, businessId);
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed.` });
  } catch (err: any) {
    console.error('❌ [api/whatsapp/templates ERROR]:', err?.message || err);
    return res.status(500).json({
      error: 'Failed to process template request',
      details: err?.message || String(err)
    });
  }
}
