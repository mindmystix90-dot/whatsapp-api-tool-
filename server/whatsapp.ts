import { WhatsAppConnection } from '../src/types';

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
 * Verify Meta WhatsApp Cloud API credentials server-side against Graph API v21.0
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

  const cleanPhoneId = phoneNumberId.trim();
  const cleanToken = accessToken.trim();

  try {
    const url = `https://graph.facebook.com/v21.0/${cleanPhoneId}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        'Content-Type': 'application/json'
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
      quality_rating: data.quality_rating || 'UNKNOWN'
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
    const url = `https://graph.facebook.com/v21.0/${connection.phone_number_id}/messages`;
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
    const url = `https://graph.facebook.com/v21.0/${connection.phone_number_id}/messages`;
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
