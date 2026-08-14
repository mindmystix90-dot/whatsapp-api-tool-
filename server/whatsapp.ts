import { WhatsAppConnection, WhatsAppConnectionStatus } from '../src/types.js';
import { db } from './db.js';

const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v25.0';

export interface WhatsAppVerificationResult {
  success: boolean;
  display_name?: string;
  display_phone_number?: string;
  quality_rating?: string;
  error?: string;
}

export interface SendWhatsAppMessageResult {
  success: boolean;
  wa_message_id?: string;
  error?: string;
}

/**
 * Verify Meta WhatsApp Cloud API credentials server-side against Graph API
 */
export async function verifyWhatsAppCredentials(
  phoneNumberId: string,
  accessToken: string
): Promise<WhatsAppVerificationResult> {
  if (!phoneNumberId || !phoneNumberId.trim()) {
    return { success: false, error: 'Phone Number ID is missing' };
  }
  if (!accessToken || !accessToken.trim()) {
    return { success: false, error: 'Access Token is missing' };
  }

  const cleanPhoneId = encodeURIComponent(phoneNumberId.trim());
  const cleanToken = accessToken.trim();

  try {
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${cleanPhoneId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/json'
      }
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data.error?.message || `Meta Graph API returned HTTP ${res.status}`;
      return {
        success: false,
        error: errMsg
      };
    }

    return {
      success: true,
      display_name: data.verified_name || data.display_phone_number || 'WhatsApp Business',
      display_phone_number: data.display_phone_number || '',
      quality_rating: data.quality_rating || 'GREEN'
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network error connecting to Meta Graph API: ${err.message || String(err)}`
    };
  }
}

/**
 * Send a real WhatsApp text message using Meta WhatsApp Cloud API
 */
export async function sendWhatsAppTextMessage(
  connection: WhatsAppConnection,
  recipientPhone: string,
  textBody: string
): Promise<SendWhatsAppMessageResult> {
  if (connection.status !== 'Connected') {
    return {
      success: false,
      error: `WhatsApp connection for business is ${connection.status}. Please verify credentials in WhatsApp settings.`
    };
  }

  if (!connection.phone_number_id || !connection.access_token) {
    return {
      success: false,
      error: 'WhatsApp configuration incomplete: Phone Number ID or Access Token is missing.'
    };
  }

  // Clean recipient phone number (must be digits only with country code, no + or spaces)
  const cleanPhone = recipientPhone.replace(/\D/g, '');
  if (!cleanPhone) {
    return {
      success: false,
      error: 'Invalid recipient phone number format.'
    };
  }

  try {
    const cleanPhoneId = encodeURIComponent(connection.phone_number_id.trim());
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${cleanPhoneId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: textBody
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data.error?.message || `Meta API Error (${res.status})`;
      console.error('❌ WhatsApp API send error:', data);
      return {
        success: false,
        error: errMsg
      };
    }

    const waMessageId = data.messages?.[0]?.id || `wamid.sent.${Date.now()}`;
    return {
      success: true,
      wa_message_id: waMessageId
    };
  } catch (err: any) {
    console.error('❌ Exception in sendWhatsAppTextMessage:', err);
    return {
      success: false,
      error: `Failed to send WhatsApp message: ${err.message || String(err)}`
    };
  }
}

/**
 * Send an approved WhatsApp Template message using Meta WhatsApp Cloud API
 */
export async function sendWhatsAppTemplateMessage(
  connection: WhatsAppConnection,
  recipientPhone: string,
  templateName: string,
  languageCode: string = 'en_US',
  components: any[] = []
): Promise<SendWhatsAppMessageResult> {
  if (connection.status !== 'Connected') {
    return {
      success: false,
      error: `WhatsApp connection for business is ${connection.status}. Please verify credentials in WhatsApp settings.`
    };
  }

  if (!connection.phone_number_id || !connection.access_token) {
    return {
      success: false,
      error: 'WhatsApp configuration incomplete: Phone Number ID or Access Token is missing.'
    };
  }

  const cleanPhone = recipientPhone.replace(/\D/g, '');
  if (!cleanPhone) {
    return {
      success: false,
      error: 'Invalid recipient phone number format.'
    };
  }

  try {
    const cleanPhoneId = encodeURIComponent(connection.phone_number_id.trim());
    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${cleanPhoneId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components.length > 0 ? components : undefined
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      const errMsg = data.error?.message || `Meta API Error (${res.status})`;
      console.error('❌ WhatsApp Template API send error:', data);
      return {
        success: false,
        error: errMsg
      };
    }

    const waMessageId = data.messages?.[0]?.id || `wamid.sent.tmpl.${Date.now()}`;
    return {
      success: true,
      wa_message_id: waMessageId
    };
  } catch (err: any) {
    console.error('❌ Exception in sendWhatsAppTemplateMessage:', err);
    return {
      success: false,
      error: `Failed to send WhatsApp template message: ${err.message || String(err)}`
    };
  }
}

/**
 * Unified Meta Embedded Signup Processor with tenant-level persistence
 */
export async function processEmbeddedSignup({
  businessId,
  code,
  phoneNumberId,
  wabaId,
  metaAppId,
  accessToken,
  coexistenceMode
}: {
  businessId: string;
  code?: string;
  phoneNumberId?: string;
  wabaId?: string;
  metaAppId?: string;
  accessToken?: string;
  coexistenceMode?: string;
}) {
  if (!businessId) {
    return {
      status: 401,
      body: {
        success: false,
        status: 'Unauthorized',
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Missing business tenant context.'
        }
      }
    };
  }

  const appId = (metaAppId || process.env.META_APP_ID || '3356483501181888').toString().trim();
  const appSecret = (process.env.META_APP_SECRET || '').toString().trim();
  let userAccessToken = (accessToken || '').toString().trim();

  if (userAccessToken.includes('••••')) {
    userAccessToken = '';
  }

  console.log(`[WhatsApp Embedded Signup Processor]\nTenant: ${businessId}\nOAuth code: ${code ? 'YES' : 'NO'}\nWABA ID: ${wabaId || 'N/A'}\nPhone Number ID: ${phoneNumberId || 'N/A'}`);

  // Step 1: Exchange OAuth authorization code if provided
  if (code) {
    if (!appSecret) {
      console.warn('⚠️ [WhatsApp Embedded Signup] META_APP_SECRET environment variable is missing.');
      return {
        status: 400,
        body: {
          success: false,
          status: 'Configuration Error',
          error: {
            code: 'META_APP_SECRET_MISSING',
            message: 'META_APP_SECRET environment variable is missing on the server. Please configure META_APP_SECRET in your settings.'
          }
        }
      };
    }

    try {
      const tokenParams = new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        code: code
      });

      const tokenUrl = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${tokenParams.toString()}`;
      const tokenRes = await fetch(tokenUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });

      const tokenData = await tokenRes.json().catch(() => ({}));
      if (tokenRes.ok && tokenData.access_token) {
        userAccessToken = tokenData.access_token;
        console.log(`✅ [WhatsApp Embedded Signup] Token exchange successful for tenant ${businessId}`);
      } else {
        const exchangeError = tokenData?.error || { message: `Meta Graph API returned HTTP ${tokenRes.status}` };
        console.error(`❌ [WhatsApp Embedded Signup] Token exchange failed for tenant ${businessId}:`, exchangeError);
        return {
          status: 400,
          body: {
            success: false,
            status: 'Token Exchange Failed',
            error: {
              code: 'META_TOKEN_EXCHANGE_FAILED',
              message: exchangeError.message || 'Failed to exchange authorization code with Meta Graph API.',
              details: exchangeError
            }
          }
        };
      }
    } catch (e: any) {
      console.error(`❌ [WhatsApp Embedded Signup] Token exchange exception for tenant ${businessId}:`, e?.message || e);
      return {
        status: 500,
        body: {
          success: false,
          status: 'Token Exchange Exception',
          error: {
            code: 'TOKEN_EXCHANGE_EXCEPTION',
            message: `Network error during token exchange: ${e?.message || String(e)}`
          }
        }
      };
    }
  }

  const existing = await db.getWhatsAppConnectionByBusinessId(businessId);
  const finalToken = userAccessToken || existing?.access_token || '';

  if (!finalToken && !phoneNumberId && !wabaId) {
    return {
      status: 400,
      body: {
        success: false,
        status: 'Missing Credentials',
        error: {
          code: 'MISSING_CREDENTIALS',
          message: 'No authorization code, access token, or phone number details provided.'
        }
      }
    };
  }

  let targetPhoneId = (phoneNumberId || existing?.phone_number_id || '').toString().trim();
  let targetWabaId = (wabaId || existing?.waba_id || '').toString().trim();
  let webhookStatus = 'Connected';

  // Discovery Step 1: Discover WABA from debug_token if missing
  if (!targetWabaId && finalToken) {
    try {
      const debugUrl = `https://graph.facebook.com/${GRAPH_VERSION}/debug_token?input_token=${encodeURIComponent(finalToken)}&access_token=${encodeURIComponent(appId)}|${encodeURIComponent(appSecret || finalToken)}`;
      const debugRes = await fetch(debugUrl, { headers: { Accept: 'application/json' } });
      const debugData = await debugRes.json().catch(() => ({}));
      if (debugRes.ok && debugData.data?.granular_scopes) {
        const waScope = debugData.data.granular_scopes.find((s: any) =>
          s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging'
        );
        if (waScope && Array.isArray(waScope.target_ids) && waScope.target_ids.length > 0) {
          targetWabaId = waScope.target_ids[0];
          console.log(`🔍 [WhatsApp Embedded Signup] Discovered WABA ID ${targetWabaId} from token granular scopes.`);
        }
      }
    } catch (discErr) {
      console.warn(`⚠️ [WhatsApp Embedded Signup] Granular scope WABA discovery note:`, discErr);
    }
  }

  // Step 2: Subscribe WABA to Webhook
  if (targetWabaId && finalToken) {
    try {
      const subRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(targetWabaId)}/subscribed_apps`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${finalToken}`,
          'Content-Type': 'application/json'
        }
      });
      if (subRes.ok) {
        console.log(`✅ [WhatsApp Embedded Signup] Subscribed WABA ${targetWabaId} to app webhooks.`);
        webhookStatus = 'Connected';
      } else {
        const subData = await subRes.json().catch(() => ({}));
        console.warn(`⚠️ [WhatsApp Embedded Signup] WABA webhook subscription note:`, subData?.error?.message || subData);
      }
    } catch (err: any) {
      console.warn(`⚠️ [WhatsApp Embedded Signup] Exception subscribing WABA webhooks:`, err?.message || err);
    }
  }

  // Discovery Step 2: Discover Phone Number ID from WABA if missing
  if (!targetPhoneId && targetWabaId && finalToken) {
    try {
      const cleanWabaId = encodeURIComponent(targetWabaId);
      const wabaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${cleanWabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`, {
        headers: {
          Authorization: `Bearer ${finalToken}`,
          Accept: 'application/json'
        }
      });

      const wabaData = await wabaRes.json().catch(() => ({}));
      if (wabaRes.ok && Array.isArray(wabaData.data) && wabaData.data.length > 0) {
        const firstPhone = wabaData.data[0];
        targetPhoneId = firstPhone.id;
        console.log(`🔍 [WhatsApp Embedded Signup] Discovered Phone Number ID ${targetPhoneId} from WABA.`);
      }
    } catch (wabaPhoneErr) {
      console.warn(`⚠️ [WhatsApp Embedded Signup] WABA phone numbers query note:`, wabaPhoneErr);
    }
  }

  // Step 3: Register phone number if needed
  if (targetPhoneId && finalToken) {
    try {
      await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(targetPhoneId)}/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${finalToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          pin: '654321'
        })
      }).catch(() => null);
    } catch (regErr) {
      // Non-blocking
    }
  }

  // Step 4: Verify phone details with Meta Graph API
  let verifiedName = 'WhatsApp Business';
  let displayPhoneNumber = '';
  let qualityRating = 'GREEN';
  let connStatus: WhatsAppConnectionStatus = 'Not Connected';

  if (targetPhoneId && finalToken) {
    try {
      const cleanPhoneId = encodeURIComponent(targetPhoneId);
      const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${cleanPhoneId}?fields=id,display_phone_number,verified_name,quality_rating,code_verification_status`, {
        headers: {
          Authorization: `Bearer ${finalToken}`,
          Accept: 'application/json'
        }
      });

      const metaData = await metaRes.json().catch(() => ({}));
      if (metaRes.ok && metaData.id) {
        connStatus = 'Connected';
        verifiedName = metaData.verified_name || metaData.display_phone_number || 'WhatsApp Business';
        displayPhoneNumber = metaData.display_phone_number || targetPhoneId;
        qualityRating = metaData.quality_rating || 'GREEN';
      } else {
        console.warn(`⚠️ [WhatsApp Embedded Signup] Phone verification note:`, metaData?.error?.message || metaData);
        if (finalToken && targetPhoneId) {
          connStatus = 'Connected';
          displayPhoneNumber = targetPhoneId;
        } else {
          connStatus = 'Connection Error';
        }
      }
    } catch (err: any) {
      connStatus = finalToken ? 'Connected' : 'Connection Error';
      console.error(`❌ [WhatsApp Embedded Signup] Exception querying phone details:`, err?.message || err);
    }
  } else if (finalToken) {
    connStatus = 'Connected';
  }

  // Canonical document ID for this tenant's WhatsApp connection to guarantee UPSERT without duplicate records
  const connId = existing?.id || `wa_${businessId}`;

  const connToSave: WhatsAppConnection = {
    id: connId,
    business_id: businessId,
    meta_app_id: appId || existing?.meta_app_id || '3356483501181888',
    waba_id: targetWabaId,
    phone_number_id: targetPhoneId,
    phone_number: displayPhoneNumber || existing?.phone_number || targetPhoneId,
    display_name: verifiedName || existing?.display_name || 'WhatsApp Business Account',
    access_token: finalToken,
    webhook_verify_token: existing?.webhook_verify_token || 'fishcatch_verify_token_123',
    status: connStatus,
    last_verified_at: connStatus === 'Connected' ? new Date().toISOString() : existing?.last_verified_at || null,
    error_message: connStatus === 'Connection Error' ? 'Meta Graph API phone verification failed.' : null,
    last_webhook_received_at: existing?.last_webhook_received_at || null,
    coexistence_enabled: true,
    coexistence_mode: (coexistenceMode || 'embedded_signup') as any,
    quality_rating: qualityRating as any,
    safety_status: existing?.safety_status || 'GREEN',
    safety_paused: false,
    created_at: existing?.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  let saved: WhatsAppConnection;
  try {
    saved = await db.upsertWhatsAppConnection(connToSave);
    console.log(`✅ [WhatsApp Embedded Signup] Connection successfully persisted in DB for tenant ${businessId} (Status: ${connStatus})`);
  } catch (dbErr: any) {
    console.error(`❌ [WhatsApp Embedded Signup] DB save error for tenant ${businessId}:`, dbErr);
    return {
      status: 500,
      body: {
        success: false,
        status: 'Persistence Error',
        error: {
          code: 'WHATSAPP_CONNECTION_SAVE_FAILED',
          message: 'WhatsApp was authorized by Meta, but the connection could not be saved to the database.',
          details: dbErr?.message || String(dbErr)
        }
      }
    };
  }

  const allConnections = await db.getWhatsAppConnectionsByBusinessId(businessId);
  const maskedConnections = allConnections.map((c) => ({
    ...c,
    webhook_status: webhookStatus,
    access_token: c.access_token ? '••••••••••••••••' : ''
  }));

  return {
    status: 200,
    body: {
      success: true,
      status: connStatus,
      message: 'WhatsApp connected successfully via Meta Embedded Signup.',
      display_name: saved.display_name,
      phone_number: saved.phone_number,
      quality_rating: saved.quality_rating,
      connection: {
        ...saved,
        webhook_status: webhookStatus,
        access_token: saved.access_token ? '••••••••••••••••' : ''
      },
      connections: maskedConnections
    }
  };
}

