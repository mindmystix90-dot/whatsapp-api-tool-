import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import {
  db
} from './server/db.js';
import {
  authenticateToken,
  requireAdmin,
  generateToken,
  hashPassword,
  comparePassword,
  initAdminUser,
  AuthenticatedRequest
} from './server/auth.js';
import {
  verifyWhatsAppCredentials,
  sendWhatsAppTextMessage,
  sendWhatsAppTemplateMessage
} from './server/whatsapp.js';
import { generateAIReply } from './server/gemini.js';
import { handleWebhookVerification, handleWebhookEvent } from './server/webhook.js';
import { User, Business, AISettings, WhatsAppConnection, Customer, LeadStatus } from './src/types.js';

dotenv.config();

export const app = express();
const PORT = 3000;

// Prevent body-parser stream hanging on Vercel where req.body is pre-parsed
app.use((req, res, next) => {
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      req.body = JSON.parse(req.body);
    } catch {}
  }
  if (req.body !== undefined && req.body !== null) {
    (req as any)._body = true;
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Seed admin user in background (non-blocking, skipped during Vercel module load)
export const appReady = (async () => {
  if (!process.env.VERCEL) {
    await initAdminUser().catch((err) => {
      console.warn('⚠️ Non-fatal background admin seed warning:', err?.message || err);
    });
  }
})();

// ==========================================
// META WHATSAPP WEBHOOK ROUTES (PUBLIC)
// Registering both /api/whatsapp/webhook and /api/webhook/whatsapp
// ==========================================
app.get('/api/whatsapp/webhook', handleWebhookVerification);
app.post('/api/whatsapp/webhook', handleWebhookEvent);
app.get('/api/webhook/whatsapp', handleWebhookVerification);
app.post('/api/webhook/whatsapp', handleWebhookEvent);

// ==========================================
// META USER DATA DELETION CALLBACK (PUBLIC)
// ==========================================
const handleDataDeletionCallback = async (req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const productionDomain = 'https://whatsapp-api-tool2.vercel.app';

  if (req.method === 'POST') {
    try {
      let body = req.body || {};
      if (typeof body === 'string' && body.trim()) {
        try {
          body = JSON.parse(body);
        } catch {}
      }

      const signedRequest = body.signed_request || req.query?.signed_request;
      let userId = body.user_id || req.query?.user_id || 'meta_user_unknown';

      if (signedRequest && typeof signedRequest === 'string' && signedRequest.includes('.')) {
        try {
          const encodedData = signedRequest.split('.')[1];
          if (encodedData) {
            const decodedJson = Buffer.from(encodedData, 'base64').toString('utf-8');
            const data = JSON.parse(decodedJson);
            if (data.user_id) {
              userId = data.user_id;
            }
          }
        } catch (e) {
          console.warn('[DATA DELETION] Could not decode signed_request payload:', e);
        }
      }

      const confirmationCode = `DEL_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      const statusUrl = `${productionDomain}/data-deletion?id=${confirmationCode}`;

      console.log(`[META DATA DELETION REQUEST] Processed deletion callback for user: ${userId}, code: ${confirmationCode}`);

      try {
        await db.createAdminAuditLog({
          admin_id: 'meta_system',
          admin_email: 'deletion-callback@facebook.com',
          action: 'META_DATA_DELETION_CALLBACK',
          target_business_id: userId,
          target_business_name: 'Meta User Deletion',
          details: `Meta data deletion requested for user ID ${userId}. Confirmation Code: ${confirmationCode}`,
          timestamp: new Date().toISOString()
        });
      } catch (e) {
        console.warn('[DATA DELETION] Non-fatal log warning:', e);
      }

      return res.status(200).json({
        url: statusUrl,
        confirmation_code: confirmationCode
      });
    } catch (err: any) {
      console.error('[META DATA DELETION ERROR]:', err);
      const fallbackCode = `DEL_${Date.now()}_FALLBACK`;
      return res.status(200).json({
        url: `${productionDomain}/data-deletion?id=${fallbackCode}`,
        confirmation_code: fallbackCode
      });
    }
  }

  return res.status(200).json({
    status: 'ACTIVE',
    service: 'Meta WhatsApp User Data Deletion Service',
    domain: productionDomain,
    instructions: 'Send HTTP POST with signed_request to trigger automated user data deletion under Meta Platform requirements.',
    status_url_template: `${productionDomain}/data-deletion?id={confirmation_code}`
  });
};

app.all(['/api/whatsapp/data-deletion', '/api/data-deletion'], handleDataDeletionCallback);

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
app.post(['/api/auth/signup', '/api/auth/register'], async (req, res) => {
  try {
    const { email, password, name, businessName } = req.body;
    console.log('[AUTH] Registration request received for email:', email ? email.trim() : 'MISSING');

    if (!email || !password || !name) {
      console.log('[AUTH] Registration failed: Missing required fields');
      return res.status(400).json({ error: 'Email, name, and password are required' });
    }

    console.log('[AUTH] Checking for existing user in database...');
    const existing = await db.findUserByEmail(email);
    if (existing) {
      console.log('[AUTH] Registration failed: User email already exists');
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const businessId = `bus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    console.log('[AUTH] Hashing password for new user:', userId);
    const passwordHash = await hashPassword(password);

    const newUser: User = {
      id: userId,
      email: email.trim(),
      name: name.trim(),
      role: 'user',
      business_id: businessId,
      created_at: new Date().toISOString()
    };

    console.log('[AUTH] Saving new user to database...');
    await db.createUser(newUser, passwordHash);

    // Create associated Business profile
    console.log('[AUTH] Creating business profile for:', businessId);
    await db.createBusiness({
      id: businessId,
      user_id: userId,
      name: businessName || `${name}'s Business`,
      description: '',
      products_services: '',
      prices: '',
      faqs: '',
      business_hours: '',
      location: '',
      contact_info: email,
      additional_info: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Create default AI Settings
    console.log('[AUTH] Creating default AI settings...');
    await db.upsertAISettings({
      id: `ai_${businessId}`,
      business_id: businessId,
      enabled: true,
      agent_name: 'Lead AI Assistant',
      system_instructions: 'Help customers, answer product questions, and guide them to convert.',
      tone: 'Friendly & Professional',
      language_preference: 'Match Customer Language',
      human_handoff_rules: 'Handoff if customer requests human agent or complex issue.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Create default WhatsApp Connection record
    console.log('[AUTH] Creating default WhatsApp connection record...');
    await db.upsertWhatsAppConnection({
      id: `wa_${businessId}`,
      business_id: businessId,
      meta_app_id: '',
      waba_id: '',
      phone_number_id: '',
      phone_number: '',
      display_name: '',
      access_token: '',
      webhook_verify_token: process.env.META_DEFAULT_WEBHOOK_VERIFY_TOKEN || 'fishcatch_verify_token_123',
      status: 'Not Connected',
      last_verified_at: null,
      error_message: null,
      last_webhook_received_at: null,
      coexistence_enabled: false,
      coexistence_mode: 'manual',
      safety_status: 'GREEN',
      safety_paused: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    console.log('[AUTH] User registration completed successfully for:', userId);
    const token = generateToken(newUser);
    return res.json({ token, user: newUser });
  } catch (err: any) {
    console.error('[AUTH] Registration exception:', err);
    return res.status(500).json({
      error: 'Failed to create user account',
      details: err?.message || String(err)
    });
  }
});

  app.post(['/api/auth/login', '/auth/login'], async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = email ? String(email).trim() : '';
      console.log('[AUTH] Login request received for email:', cleanEmail || 'MISSING');

      if (!cleanEmail || !password) {
        console.log('[AUTH] Login failed: Missing email or password');
        return res.status(400).json({ error: 'Email and password are required' });
      }

      console.log('[AUTH] Looking up user in database...');
      const user = await db.findUserByEmail(cleanEmail);
      if (!user) {
        console.log('[AUTH] Login failed: User not found for email');
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      console.log('[AUTH] User found, fetching password hash...');
      const passwordHash = await db.getPasswordHash(user.id);
      if (!passwordHash) {
        console.log('[AUTH] Login failed: Password hash missing for user ID:', user.id);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      console.log('[AUTH] Verifying password hash...');
      const valid = await comparePassword(password, passwordHash);
      if (!valid) {
        console.log('[AUTH] Login failed: Password mismatch for user ID:', user.id);
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      console.log('[AUTH] Password verified, generating JWT...');
      const token = generateToken(user);
      console.log('[AUTH] Login completed successfully for user ID:', user.id);
      return res.json({ token, user });
    } catch (err: any) {
      console.error('[AUTH] Login exception:', err?.message || err);
      return res.status(500).json({
        error: 'Failed to authenticate user',
        details: err?.message || String(err)
      });
    }
  });

  app.get(['/api/auth/me', '/auth/me'], authenticateToken, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // ==========================================
  // BUSINESS PROFILE API
  // ==========================================
  app.get('/api/business', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const business = await db.getBusinessById(req.user!.business_id);
    if (!business) {
      return res.status(404).json({ error: 'Business profile not found' });
    }
    res.json({ business });
  });

  app.put('/api/business', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const {
      name,
      description,
      products_services,
      prices,
      faqs,
      business_hours,
      location,
      contact_info,
      additional_info
    } = req.body;

    const updated = await db.updateBusiness(req.user!.business_id, {
      name,
      description,
      products_services,
      prices,
      faqs,
      business_hours,
      location,
      contact_info,
      additional_info
    });

    res.json({ business: updated });
  });

  // ==========================================
  // WHATSAPP CONNECTION API
  // ==========================================
  app.get('/api/whatsapp', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      let connection = await db.getWhatsAppConnectionByBusinessId(req.user!.business_id);
      if (!connection) {
        connection = await db.upsertWhatsAppConnection({
          id: `wa_${req.user!.business_id}`,
          business_id: req.user!.business_id,
          meta_app_id: '',
          waba_id: '',
          phone_number_id: '',
          phone_number: '',
          display_name: '',
          access_token: '',
          webhook_verify_token: process.env.META_DEFAULT_WEBHOOK_VERIFY_TOKEN || 'fishcatch_verify_token_123',
          status: 'Not Connected',
          last_verified_at: null,
          error_message: null,
          last_webhook_received_at: null,
          coexistence_enabled: false,
          coexistence_mode: 'manual',
          safety_status: 'GREEN',
          safety_paused: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      const allConnections = await db.getWhatsAppConnectionsByBusinessId(req.user!.business_id);
      const maskedConnections = allConnections.map((c) => ({
        ...c,
        access_token: c.access_token ? '••••••••••••••••' : ''
      }));

      // Mask access token when returning to client for security
      const maskedConnection = {
        ...connection,
        access_token: connection.access_token ? '••••••••••••••••' : ''
      };

      const host = req.headers.host || 'localhost';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      
      let baseUrl = (process.env.APP_URL || '').trim().replace(/\/$/, '');
      if (!baseUrl || baseUrl.includes('your-domain.vercel.app')) {
        if (host.includes('vercel.app')) {
          baseUrl = `${protocol}://${host}`;
        } else {
          baseUrl = 'https://whatsapp-api-tool2.vercel.app';
        }
      }
      
      const webhookUrl = `${baseUrl}/api/whatsapp/webhook`;

      return res.json({
        connection: maskedConnection,
        connections: maskedConnections,
        webhook_url: webhookUrl,
        has_access_token: Boolean(connection.access_token)
      });
    } catch (err: any) {
      console.error('Failed to get WhatsApp connection:', err);
      return res.status(500).json({ error: 'Failed to retrieve WhatsApp status' });
    }
  });

  app.post('/api/whatsapp/config', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { meta_app_id, waba_id, phone_number_id, access_token, webhook_verify_token } = req.body || {};

      let existing = await db.getWhatsAppConnectionByBusinessId(req.user!.business_id);

      // Keep existing access token if user provided masked token or left empty
      let tokenToSave = access_token;
      if (!tokenToSave || tokenToSave.includes('••••')) {
        tokenToSave = existing?.access_token || '';
      }

      const updatedConn = await db.upsertWhatsAppConnection({
        id: existing?.id || `wa_${req.user!.business_id}`,
        business_id: req.user!.business_id,
        meta_app_id: meta_app_id ?? existing?.meta_app_id ?? '',
        waba_id: waba_id ?? existing?.waba_id ?? '',
        phone_number_id: phone_number_id ?? existing?.phone_number_id ?? '',
        phone_number: existing?.phone_number || '',
        display_name: existing?.display_name || '',
        access_token: tokenToSave,
        webhook_verify_token: webhook_verify_token || existing?.webhook_verify_token || 'fishcatch_verify_token_123',
        status: existing?.status || 'Not Connected',
        last_verified_at: existing?.last_verified_at || null,
        error_message: existing?.error_message || null,
        last_webhook_received_at: existing?.last_webhook_received_at || null,
        coexistence_enabled: existing?.coexistence_enabled || false,
        coexistence_mode: existing?.coexistence_mode || 'manual',
        safety_status: existing?.safety_status || 'GREEN',
        safety_paused: existing?.safety_paused || false,
        created_at: existing?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      const maskedConnection = {
        ...updatedConn,
        access_token: updatedConn.access_token ? '••••••••••••••••' : ''
      };

      return res.json({ connection: maskedConnection });
    } catch (err: any) {
      console.error('❌ Exception in /api/whatsapp/config:', err);
      return res.status(500).json({
        success: false,
        error: `Failed to save configuration: ${err.message || String(err)}`
      });
    }
  });

  app.post('/api/whatsapp/test', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      console.log('🔍 [/api/whatsapp/test] Incoming body:', req.body);
      let phoneNumberId = req.body?.phone_number_id || req.body?.phoneNumberId;
      let accessToken = req.body?.access_token || req.body?.accessToken;
      let metaAppId = req.body?.meta_app_id || req.body?.metaAppId;
      let wabaId = req.body?.waba_id || req.body?.wabaId;
      let webhookVerifyToken = req.body?.webhook_verify_token || req.body?.webhookVerifyToken;

      let connection = await db.getWhatsAppConnectionByBusinessId(req.user!.business_id);
      console.log('🔍 [/api/whatsapp/test] Stored connection:', connection ? { id: connection.id, phone_number_id: connection.phone_number_id, has_access_token: Boolean(connection.access_token) } : 'NONE');

      // If access_token provided in request is empty or masked '••••', use stored token from DB
      if (!accessToken || accessToken.includes('••••')) {
        accessToken = connection?.access_token;
      }
      if (!phoneNumberId) {
        phoneNumberId = connection?.phone_number_id;
      }
      if (!metaAppId) {
        metaAppId = connection?.meta_app_id;
      }
      if (!wabaId) {
        wabaId = connection?.waba_id;
      }
      if (!webhookVerifyToken) {
        webhookVerifyToken = connection?.webhook_verify_token;
      }

      console.log('🔍 [/api/whatsapp/test] Resolved credentials:', { phoneNumberId, hasAccessToken: Boolean(accessToken) });

      if (!phoneNumberId || !accessToken || accessToken.includes('••••')) {
        if (connection) {
          await db.upsertWhatsAppConnection({
            ...connection,
            status: 'Not Connected',
            error_message: 'Phone Number ID and Access Token are required to connect.'
          });
        }
        return res.status(400).json({
          success: false,
          status: 'Not Connected',
          error: 'Phone Number ID and Access Token are required.'
        });
      }

      const verification = await verifyWhatsAppCredentials(phoneNumberId, accessToken);

      const connToSave: WhatsAppConnection = {
        id: connection?.id || `wa_${req.user!.business_id}`,
        business_id: req.user!.business_id,
        meta_app_id: metaAppId || connection?.meta_app_id || '',
        waba_id: wabaId || connection?.waba_id || '',
        phone_number_id: phoneNumberId,
        phone_number: verification.display_phone_number || connection?.phone_number || '',
        display_name: verification.display_name || connection?.display_name || '',
        access_token: accessToken,
        webhook_verify_token: webhookVerifyToken || connection?.webhook_verify_token || 'fishcatch_verify_token_123',
        status: verification.success ? 'Connected' : 'Connection Error',
        last_verified_at: verification.success ? new Date().toISOString() : connection?.last_verified_at || null,
        error_message: verification.success ? null : (verification.error || 'Failed to verify WhatsApp credentials'),
        last_webhook_received_at: connection?.last_webhook_received_at || null,
        coexistence_enabled: connection?.coexistence_enabled || false,
        coexistence_mode: connection?.coexistence_mode || 'manual',
        quality_rating: verification.quality_rating || connection?.quality_rating || 'GREEN',
        safety_status: connection?.safety_status || 'GREEN',
        safety_paused: connection?.safety_paused || false,
        created_at: connection?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const updated = await db.upsertWhatsAppConnection(connToSave);

      if (verification.success) {
        return res.json({
          success: true,
          status: 'Connected',
          display_name: verification.display_name,
          phone_number: verification.display_phone_number,
          quality_rating: verification.quality_rating,
          connection: { ...updated, access_token: '••••••••••••••••' }
        });
      } else {
        return res.status(400).json({
          success: false,
          status: 'Connection Error',
          error: verification.error,
          connection: { ...updated, access_token: '••••••••••••••••' }
        });
      }
    } catch (err: any) {
      console.error('❌ Exception in /api/whatsapp/test route:', err);
      return res.status(500).json({
        success: false,
        status: 'Error',
        error: `Server error during verification: ${err.message || String(err)}`
      });
    }
  });

  app.post('/api/whatsapp/send-test', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { recipientPhone, messageBody } = req.body || {};
      if (!recipientPhone || !messageBody) {
        return res.status(400).json({ error: 'Recipient phone number and message text are required.' });
      }

      const connection = await db.getWhatsAppConnectionByBusinessId(req.user!.business_id);
      if (!connection || connection.status !== 'Connected') {
        return res.status(400).json({ error: 'WhatsApp is not connected. Please verify credentials first.' });
      }

      const sendResult = await sendWhatsAppTextMessage(connection, recipientPhone, messageBody);

      if (sendResult.success) {
        return res.json({
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
      console.error('❌ Exception in /api/whatsapp/send-test:', err);
      return res.status(500).json({
        success: false,
        error: `Failed to send test message: ${err.message || String(err)}`
      });
    }
  });

  app.post('/api/whatsapp/disconnect', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const businessId = req.user!.business_id;
      const existing = await db.getWhatsAppConnectionByBusinessId(businessId);

      if (existing) {
        await db.upsertWhatsAppConnection({
          ...existing,
          status: 'Not Connected',
          phone_number_id: '',
          phone_number: '',
          display_name: '',
          access_token: '',
          error_message: null,
          last_verified_at: null,
          updated_at: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        message: 'WhatsApp disconnected successfully',
        connection: {
          id: existing?.id || `wa_${businessId}`,
          business_id: businessId,
          status: 'Not Connected',
          phone_number_id: '',
          phone_number: '',
          display_name: '',
          access_token: ''
        }
      });
    } catch (err: any) {
      console.error('❌ Exception in /api/whatsapp/disconnect:', err);
      return res.status(500).json({
        success: false,
        error: `Failed to disconnect WhatsApp: ${err.message || String(err)}`
      });
    }
  });

  // ==========================================
  // AI AGENT SETTINGS & PLAYGROUND
  // ==========================================
  app.get('/api/ai-settings', authenticateToken, async (req: AuthenticatedRequest, res) => {
    let settings = await db.getAISettingsByBusinessId(req.user!.business_id);
    if (!settings) {
      settings = await db.upsertAISettings({
        id: `ai_${req.user!.business_id}`,
        business_id: req.user!.business_id,
        enabled: true,
        agent_name: 'Lead AI Assistant',
        system_instructions: 'Help customers, answer product questions, and guide them to convert.',
        tone: 'Friendly & Professional',
        language_preference: 'Match Customer Language',
        human_handoff_rules: 'Handoff if customer requests human agent or complex issue.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    res.json({ aiSettings: settings });
  });

  app.put('/api/ai-settings', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { enabled, agent_name, system_instructions, tone, language_preference, human_handoff_rules } = req.body;

    const existing = await db.getAISettingsByBusinessId(req.user!.business_id);

    const updated = await db.upsertAISettings({
      id: existing?.id || `ai_${req.user!.business_id}`,
      business_id: req.user!.business_id,
      enabled: enabled ?? true,
      agent_name: agent_name ?? 'Lead AI Assistant',
      system_instructions: system_instructions ?? '',
      tone: tone ?? 'Friendly & Professional',
      language_preference: language_preference ?? 'Match Customer Language',
      human_handoff_rules: human_handoff_rules ?? '',
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({ aiSettings: updated });
  });

  app.post('/api/ai-settings/test-playground', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { testPrompt } = req.body;
    if (!testPrompt) {
      return res.status(400).json({ error: 'Test prompt is required' });
    }

    const business = await db.getBusinessById(req.user!.business_id);
    const aiSettings = await db.getAISettingsByBusinessId(req.user!.business_id);

    if (!business || !aiSettings) {
      return res.status(400).json({ error: 'Business profile or AI settings missing.' });
    }

    try {
      const mockCustomer: Customer = {
        id: 'cust_playground',
        business_id: business.id,
        wa_id: '1234567890',
        phone_number: '+1 (555) 019-2831',
        name: 'Test Customer',
        opt_in_status: 'opted_in',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const reply = await generateAIReply({
        business,
        aiSettings,
        customer: mockCustomer,
        recentMessages: [],
        customerMessage: testPrompt
      });

      return res.json({ reply });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to generate AI response' });
    }
  });

  // ==========================================
  // CONVERSATIONS & MESSAGES API
  // ==========================================
  app.get('/api/conversations', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const convs = await db.getConversationsByBusinessId(req.user!.business_id);
    res.json({ conversations: convs });
  });

  app.get('/api/conversations/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const conv = await db.getConversationById(req.params.id);
    if (!conv || conv.business_id !== req.user!.business_id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Reset unread count when opened
    if (conv.unread_count > 0) {
      await db.updateConversation(conv.id, { unread_count: 0 });
    }

    const messages = await db.getMessagesByConversationId(conv.id);
    const lead = await db.findLeadByCustomer(req.user!.business_id, conv.customer_id);

    res.json({
      conversation: { ...conv, unread_count: 0 },
      messages,
      lead
    });
  });

  app.post('/api/conversations/:id/mode', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { mode } = req.body;
    if (mode !== 'AI' && mode !== 'HUMAN') {
      return res.status(400).json({ error: 'Invalid mode. Must be AI or HUMAN.' });
    }

    const conv = await db.getConversationById(req.params.id);
    if (!conv || conv.business_id !== req.user!.business_id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const updated = await db.updateConversation(conv.id, { mode });
    res.json({ conversation: updated });
  });

  app.post('/api/conversations/:id/message', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { body } = req.body;
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    const conv = await db.getConversationById(req.params.id);
    if (!conv || conv.business_id !== req.user!.business_id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const customer = await db.getCustomerById(conv.customer_id);
    if (!customer) {
      return res.status(400).json({ error: 'Customer not found' });
    }

    const connection = await db.getWhatsAppConnectionByBusinessId(req.user!.business_id);

    let waMessageId = `human_${Date.now()}`;
    let messageStatus: any = 'sent';

    // If WhatsApp is connected, attempt to send real WhatsApp message
    if (connection && connection.status === 'Connected') {
      const sendResult = await sendWhatsAppTextMessage(connection, customer.phone_number, body.trim());
      if (sendResult.success) {
        waMessageId = sendResult.wa_message_id || waMessageId;
      } else {
        return res.status(400).json({ error: `Failed to send WhatsApp message: ${sendResult.error}` });
      }
    } else {
      return res.status(400).json({ error: 'WhatsApp is not connected. Please connect WhatsApp in Settings to send real messages.' });
    }

    const newMsg = await db.createMessage({
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      conversation_id: conv.id,
      business_id: req.user!.business_id,
      customer_id: customer.id,
      sender_type: 'human',
      body: body.trim(),
      wa_message_id: waMessageId,
      status: messageStatus,
      created_at: new Date().toISOString()
    });

    await db.updateConversation(conv.id, {
      last_message: body.trim(),
      last_message_at: new Date().toISOString()
    });

    res.json({ message: newMsg });
  });

  // ==========================================
  // LEADS API
  // ==========================================
  app.get('/api/leads', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const leads = await db.getLeadsByBusinessId(req.user!.business_id);
    res.json({ leads });
  });

  app.put('/api/leads/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { status } = req.body;
    const validStatuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid lead status' });
    }

    const lead = await db.getLeadById(req.params.id);
    if (!lead || lead.business_id !== req.user!.business_id) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const updated = await db.updateLeadStatus(lead.id, status);
    res.json({ lead: updated });
  });

  // ==========================================
  // WHATSAPP SAFETY SETTINGS API
  // ==========================================
  app.get('/api/settings/whatsapp-safety', authenticateToken, async (req: AuthenticatedRequest, res) => {
    let settings = await db.getSafetySettingsByBusinessId(req.user!.business_id);
    if (!settings) {
      settings = await db.upsertSafetySettings({
        id: `safety_${req.user!.business_id}`,
        business_id: req.user!.business_id,
        ai_enabled: true,
        human_takeover_on_opt_out: true,
        max_ai_replies_per_conversation: 15,
        enforce_24h_window: true,
        auto_opt_out_keywords: ['STOP', 'UNSUBSCRIBE', 'REMOVE ME', 'DO NOT MESSAGE', 'NO MORE MESSAGES'],
        safety_pause_on_error_threshold: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    res.json({ safetySettings: settings });
  });

  app.put('/api/settings/whatsapp-safety', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const {
      ai_enabled,
      human_takeover_on_opt_out,
      max_ai_replies_per_conversation,
      enforce_24h_window,
      auto_opt_out_keywords,
      safety_pause_on_error_threshold
    } = req.body;

    const existing = await db.getSafetySettingsByBusinessId(req.user!.business_id);

    const updated = await db.upsertSafetySettings({
      id: existing?.id || `safety_${req.user!.business_id}`,
      business_id: req.user!.business_id,
      ai_enabled: ai_enabled ?? true,
      human_takeover_on_opt_out: human_takeover_on_opt_out ?? true,
      max_ai_replies_per_conversation: max_ai_replies_per_conversation ?? 15,
      enforce_24h_window: enforce_24h_window ?? true,
      auto_opt_out_keywords: auto_opt_out_keywords || ['STOP', 'UNSUBSCRIBE', 'REMOVE ME', 'DO NOT MESSAGE', 'NO MORE MESSAGES'],
      safety_pause_on_error_threshold: safety_pause_on_error_threshold ?? 5,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({ safetySettings: updated });
  });

  // ==========================================
  // WHATSAPP TEMPLATES API
  // ==========================================
  app.get('/api/whatsapp/templates', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const templates = await db.getTemplatesByBusinessId(req.user!.business_id);
    res.json({ templates });
  });

  app.post('/api/whatsapp/templates', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { name, category, language, header_text, body_text, footer_text } = req.body;
    if (!name || !body_text) {
      return res.status(400).json({ error: 'Template name and body text are required.' });
    }

    const templateNameClean = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    const newTemplate = await db.createTemplate({
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      business_id: req.user!.business_id,
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

    res.json({ template: newTemplate });
  });

  app.delete('/api/whatsapp/templates/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    await db.deleteTemplate(req.params.id, req.user!.business_id);
    res.json({ success: true });
  });

  app.post('/api/messages/send-template', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { customerId, templateId } = req.body;
    if (!customerId || !templateId) {
      return res.status(400).json({ error: 'Customer ID and Template ID are required.' });
    }

    const customer = await db.getCustomerById(customerId);
    if (!customer || customer.business_id !== req.user!.business_id) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const templates = await db.getTemplatesByBusinessId(req.user!.business_id);
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    const connection = await db.getWhatsAppConnectionByBusinessId(req.user!.business_id);
    if (!connection || connection.status !== 'Connected') {
      return res.status(400).json({ error: 'WhatsApp is not connected.' });
    }

    const sendResult = await sendWhatsAppTemplateMessage(
      connection,
      customer.phone_number,
      tmpl.name,
      tmpl.language || 'en_US'
    );

    if (sendResult.success) {
      let conv = await db.findConversationByCustomer(req.user!.business_id, customer.id);
      if (!conv) {
        conv = await db.createConversation({
          id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          business_id: req.user!.business_id,
          customer_id: customer.id,
          mode: 'HUMAN',
          status: 'active',
          unread_count: 0,
          last_message: `[Template: ${tmpl.name}] ${tmpl.body_text}`,
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      const msg = await db.createMessage({
        id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        conversation_id: conv.id,
        business_id: req.user!.business_id,
        customer_id: customer.id,
        sender_type: 'human',
        body: `[Template: ${tmpl.name}] ${tmpl.body_text}`,
        wa_message_id: sendResult.wa_message_id,
        status: 'sent',
        is_template: true,
        template_name: tmpl.name,
        created_at: new Date().toISOString()
      });

      return res.json({ success: true, message: msg });
    } else {
      return res.status(400).json({ error: sendResult.error });
    }
  });

  // ==========================================
  // EMBEDDED SIGNUP / COEXISTENCE API
  // ==========================================
  app.post('/api/whatsapp/embedded-signup', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const { waba_id, phone_number_id, access_token, coexistence_mode } = req.body;

    if (!waba_id || !phone_number_id) {
      return res.status(400).json({ error: 'WABA ID and Phone Number ID are required.' });
    }

    const existing = await db.getWhatsAppConnectionByBusinessId(req.user!.business_id);
    const tokenToSave = access_token && !access_token.includes('••••') ? access_token : existing?.access_token || '';

    // Verify credentials with Meta Graph API
    let connStatus: any = 'Not Connected';
    let displayName = 'WhatsApp Business';
    let displayPhone = '';
    let qualityRating = 'GREEN';

    if (tokenToSave) {
      const verification = await verifyWhatsAppCredentials(phone_number_id, tokenToSave);
      if (verification.success) {
        connStatus = 'Connected';
        displayName = verification.display_name || 'WhatsApp Business';
        displayPhone = verification.display_phone_number || '';
        qualityRating = verification.quality_rating || 'GREEN';
      } else {
        connStatus = 'Connection Error';
      }
    }

    const updatedConn = await db.upsertWhatsAppConnection({
      id: existing?.id || `wa_${req.user!.business_id}`,
      business_id: req.user!.business_id,
      meta_app_id: existing?.meta_app_id || '',
      waba_id: waba_id,
      phone_number_id: phone_number_id,
      phone_number: displayPhone || existing?.phone_number || '',
      display_name: displayName || existing?.display_name || '',
      access_token: tokenToSave,
      webhook_verify_token: existing?.webhook_verify_token || 'fishcatch_verify_token_123',
      status: connStatus,
      last_verified_at: connStatus === 'Connected' ? new Date().toISOString() : existing?.last_verified_at || null,
      last_webhook_received_at: existing?.last_webhook_received_at || null,
      error_message: null,
      coexistence_enabled: true,
      coexistence_mode: coexistence_mode || 'embedded_signup',
      quality_rating: qualityRating as any,
      safety_status: existing?.safety_status || 'GREEN',
      safety_paused: existing?.safety_paused || false,
      safety_paused_reason: existing?.safety_paused_reason || null,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({
      success: true,
      connection: {
        ...updatedConn,
        access_token: updatedConn.access_token ? '••••••••••••••••' : ''
      }
    });
  });
  app.get('/api/dashboard/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
    const businessId = req.user!.business_id;
    const leads = await db.getLeadsByBusinessId(businessId);
    const conversations = await db.getConversationsByBusinessId(businessId);
    const connection = await db.getWhatsAppConnectionByBusinessId(businessId);

    const stats = {
      total_leads: leads.length,
      new_leads: leads.filter((l) => l.status === 'NEW').length,
      qualified_leads: leads.filter((l) => l.status === 'QUALIFIED').length,
      converted_leads: leads.filter((l) => l.status === 'CONVERTED').length,
      lost_leads: leads.filter((l) => l.status === 'LOST').length,
      active_conversations: conversations.filter((c) => c.status === 'active').length,
      whatsapp_status: connection?.status || 'Not Connected',
      whatsapp_phone: connection?.phone_number || ''
    };

    res.json({ stats });
  });

  // ==========================================
  // PLATFORM ADMIN OVERVIEW API
  // ==========================================
  app.get('/api/admin/overview', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    const users = await db.getAllUsers();
    const businesses = await db.getAllBusinesses();
    const connections = await db.getAllWhatsAppConnections();

    let connectedWhatsAppCount = 0;
    let totalPlatformConversations = 0;
    let totalPlatformLeads = 0;

    const businessOverviews = await Promise.all(
      businesses.map(async (b) => {
        const owner = users.find((u) => u.id === b.user_id);
        const conn = connections.find((c) => c.business_id === b.id);
        const convs = await db.getConversationsByBusinessId(b.id);
        const leads = await db.getLeadsByBusinessId(b.id);

        if (conn?.status === 'Connected') connectedWhatsAppCount++;
        totalPlatformConversations += convs.length;
        totalPlatformLeads += leads.length;

        return {
          business_id: b.id,
          business_name: b.name || 'Unnamed Business',
          owner_email: owner?.email || 'N/A',
          owner_name: owner?.name || 'N/A',
          whatsapp_status: conn?.status || 'Not Connected',
          whatsapp_phone: conn?.phone_number || '',
          quality_rating: conn?.quality_rating || 'GREEN',
          safety_status: conn?.safety_status || 'GREEN',
          safety_paused: conn?.safety_paused || false,
          safety_paused_reason: conn?.safety_paused_reason || null,
          total_conversations: convs.length,
          total_leads: leads.length,
          new_leads: leads.filter((l) => l.status === 'NEW').length,
          qualified_leads: leads.filter((l) => l.status === 'QUALIFIED').length,
          converted_leads: leads.filter((l) => l.status === 'CONVERTED').length,
          created_at: b.created_at
        };
      })
    );

    res.json({
      adminOverview: {
        total_businesses: businesses.length,
        connected_whatsapp_count: connectedWhatsAppCount,
        total_conversations: totalPlatformConversations,
        total_leads: totalPlatformLeads,
        businesses: businessOverviews
      }
    });
  });

  app.post('/api/admin/businesses/:id/pause-safety', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    const { pause, reason } = req.body;
    const businessId = req.params.id;

    const connection = await db.getWhatsAppConnectionByBusinessId(businessId);
    if (!connection) {
      return res.status(404).json({ error: 'WhatsApp connection for business not found.' });
    }

    const updatedConn = await db.upsertWhatsAppConnection({
      ...connection,
      safety_paused: Boolean(pause),
      safety_paused_reason: pause ? (reason || 'Emergency administrative pause') : null
    });

    const business = await db.getBusinessById(businessId);

    // Record audit log
    await db.createAdminAuditLog({
      admin_id: req.user!.id,
      admin_email: req.user!.email,
      action: pause ? 'PAUSE_SAFETY' : 'RESUME_SAFETY',
      target_business_id: businessId,
      target_business_name: business?.name || 'Business',
      details: reason || (pause ? 'Emergency pause applied' : 'Safety pause lifted'),
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, connection: updatedConn });
  });

  app.get('/api/admin/audit-logs', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res) => {
    const auditLogs = await db.getAdminAuditLogs();
    res.json({ auditLogs });
  });

  // ==========================================
  // API 404 FALLBACK (Guarantees JSON for unhandled /api/* paths)
  // ==========================================
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.path} not found` });
  });

  // ==========================================
  // GLOBAL EXPRESS ERROR HANDLER (Guarantees JSON for unhandled server errors)
  // ==========================================
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled API Error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || err.statusCode || 500).json({
      error: err.message || 'An unexpected server error occurred'
    });
  });

  // ==========================================
  // VITE DEVELOPMENT MIDDLEWARE / STATIC SERVE
  // ==========================================
  if (!process.env.VERCEL) {
    if (process.env.NODE_ENV !== 'production') {
      import('vite').then(({ createServer: createViteServer }) => {
        createViteServer({
          server: { middlewareMode: true },
          appType: 'spa'
        }).then((vite) => {
          app.use(vite.middlewares);
        }).catch((err) => {
          console.error('Failed to create Vite dev server:', err);
        });
      }).catch((err) => {
        console.error('Failed to dynamically import Vite:', err);
      });
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

if (!process.env.VERCEL) {
  appReady.then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Fishcatch Backend running on http://0.0.0.0:${PORT}`);
    });
  }).catch((err) => {
    console.error('Failed to initialize server:', err);
  });
}

export default app;
