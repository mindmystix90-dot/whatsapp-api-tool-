import { Request, Response } from 'express';
import { db } from './db.js';
import { sendWhatsAppTextMessage } from './whatsapp.js';
import { generateAIReply } from './gemini.js';
import { Customer, Conversation, Message, Lead } from '../src/types.js';

/**
 * GET /api/whatsapp/webhook & /api/webhook/whatsapp - Meta Webhook Verification
 */
export async function handleWebhookVerification(req: Request, res: Response) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('📬 Meta Webhook Verification Request Received:', { mode, token, challenge });

  if (mode === 'subscribe' && token) {
    const defaultToken = process.env.META_DEFAULT_WEBHOOK_VERIFY_TOKEN || 'fishcatch_verify_token_123';
    let isMatched = token === defaultToken || token === 'fishcatch_verify_token_123';

    if (!isMatched) {
      try {
        const connections = await db.getAllWhatsAppConnections();
        isMatched = connections.some((c) => c.webhook_verify_token === token);
      } catch (err) {
        console.warn('⚠️ Could not query DB for verify token during webhook verification:', err);
      }
    }

    if (isMatched) {
      console.log('✅ Webhook verification successful! Returning challenge string.');
      return res.type('text/plain').status(200).send(String(challenge || ''));
    } else {
      console.warn('❌ Webhook verify token mismatch:', token);
      return res.status(403).send('Verify token mismatch');
    }
  }

  return res.status(400).send('Invalid verification request parameters');
}

/**
 * POST /api/whatsapp/webhook & /api/webhook/whatsapp - Meta Webhook Incoming Event
 */
export async function handleWebhookEvent(req: Request, res: Response) {
  const body = req.body;

  // Immediately respond 200 OK to Meta to avoid webhook retry timeouts
  res.status(200).send('EVENT_RECEIVED');

  if (body.object !== 'whatsapp_business_account') {
    return;
  }

  try {
    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value || {};
        const metadata = value.metadata || {};
        const phoneNumberId = metadata.phone_number_id;

        if (!phoneNumberId) continue;

        // Find matching WhatsApp Connection & Business in DB
        const connection = await db.getWhatsAppConnectionByPhoneNumberId(phoneNumberId);
        if (!connection) {
          console.warn(`⚠️ Received webhook for unknown WhatsApp Phone Number ID: ${phoneNumberId}`);
          continue;
        }

        // Update connection last_webhook_received_at
        await db.upsertWhatsAppConnection({
          ...connection,
          last_webhook_received_at: new Date().toISOString()
        });

        const business = await db.getBusinessById(connection.business_id);
        if (!business) {
          console.warn(`⚠️ Business not found for connection ${connection.id}`);
          continue;
        }

        const messages = value.messages || [];
        const contacts = value.contacts || [];

        for (const msg of messages) {
          if (!msg.id || !msg.from) continue;

          // Idempotency check: ignore if message ID already processed
          const existingMsg = await db.findMessageByWaId(msg.id);
          if (existingMsg) {
            console.log(`ℹ️ Duplicate message ${msg.id} ignored.`);
            continue;
          }

          // Extract customer details
          const waId = msg.from;
          const contact = contacts.find((c: any) => c.wa_id === waId) || {};
          const customerName = contact.profile?.name || `Customer ${waId.slice(-4)}`;
          const customerPhone = waId;
          const nowIso = new Date().toISOString();

          // Find or create customer
          let customer = await db.findCustomerByWaId(business.id, waId);
          if (!customer) {
            customer = await db.createCustomer({
              id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              business_id: business.id,
              wa_id: waId,
              phone_number: customerPhone,
              name: customerName,
              opt_in_status: 'opted_in',
              opt_in_source: 'Inbound WhatsApp Message',
              opt_in_timestamp: nowIso,
              opt_in_type: 'implicit_inbound',
              last_customer_message_at: nowIso,
              created_at: nowIso,
              updated_at: nowIso
            });
          } else {
            // Update last_customer_message_at for 24-hour window tracking
            await db.updateCustomer(customer.id, {
              last_customer_message_at: nowIso,
              name: contact.profile?.name || customer.name
            });
            customer.last_customer_message_at = nowIso;
            if (contact.profile?.name) customer.name = contact.profile.name;
          }

          // Extract message text body
          let messageBody = '';
          if (msg.type === 'text' && msg.text?.body) {
            messageBody = msg.text.body;
          } else if (msg.type === 'button' && msg.button?.text) {
            messageBody = msg.button.text;
          } else if (msg.type === 'interactive' && msg.interactive?.button_reply?.title) {
            messageBody = msg.interactive.button_reply.title;
          } else {
            messageBody = `[Received ${msg.type || 'media'} message]`;
          }

          // Fetch safety settings for business
          const safetySettings = (await db.getSafetySettingsByBusinessId(business.id)) || {
            auto_opt_out_keywords: ['STOP', 'UNSUBSCRIBE', 'REMOVE ME', 'DO NOT MESSAGE', 'NO MORE MESSAGES'],
            max_ai_replies_per_conversation: 15,
            human_takeover_on_opt_out: true
          };

          // Check for Opt-Out keywords
          const upperBody = messageBody.trim().toUpperCase();
          const isOptOutKeyword = safetySettings.auto_opt_out_keywords.some((kw: string) => upperBody === kw || upperBody.startsWith(kw));

          if (isOptOutKeyword) {
            console.log(`🛑 Opt-out keyword detected from ${customer.phone_number}: "${messageBody}"`);
            await db.updateCustomer(customer.id, {
              opt_in_status: 'opted_out',
              opt_in_timestamp: nowIso
            });
            customer.opt_in_status = 'opted_out';
          }

          // Check for Opt-In keyword if opted out
          if (customer.opt_in_status === 'opted_out' && (upperBody === 'START' || upperBody === 'UNSTOP' || upperBody === 'SUBSCRIBE')) {
            console.log(`✅ Opt-in keyword detected from ${customer.phone_number}: "${messageBody}"`);
            await db.updateCustomer(customer.id, {
              opt_in_status: 'opted_in',
              opt_in_timestamp: nowIso
            });
            customer.opt_in_status = 'opted_in';
          }

          // Find or create conversation
          let conv = await db.findConversationByCustomer(business.id, customer.id);
          if (!conv) {
            conv = await db.createConversation({
              id: `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              business_id: business.id,
              customer_id: customer.id,
              mode: isOptOutKeyword ? 'HUMAN' : 'AI',
              status: 'active',
              unread_count: 1,
              last_message: messageBody,
              last_message_at: nowIso,
              created_at: nowIso,
              updated_at: nowIso
            });
          } else {
            const updates: any = {
              unread_count: conv.unread_count + 1,
              last_message: messageBody,
              last_message_at: nowIso
            };
            if (isOptOutKeyword && safetySettings.human_takeover_on_opt_out) {
              updates.mode = 'HUMAN';
            }
            await db.updateConversation(conv.id, updates);
            conv = (await db.getConversationById(conv.id))!;
          }

          // Find or create lead
          let lead = await db.findLeadByCustomer(business.id, customer.id);
          if (!lead) {
            await db.createLead({
              id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              business_id: business.id,
              customer_id: customer.id,
              conversation_id: conv.id,
              customer_name: customer.name,
              wa_number: customer.phone_number,
              status: 'NEW',
              source: 'WhatsApp Direct',
              created_at: nowIso,
              updated_at: nowIso
            });
          }

          // Store incoming message
          const incomingMsgObj: Message = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            conversation_id: conv.id,
            business_id: business.id,
            customer_id: customer.id,
            sender_type: 'customer',
            body: messageBody,
            wa_message_id: msg.id,
            status: 'read',
            created_at: nowIso
          };
          await db.createMessage(incomingMsgObj);

          console.log(`📥 Processed incoming WhatsApp message from ${customer.name} (${customer.phone_number}): "${messageBody}"`);

          // Check AI eligibility:
          // 1. Customer is NOT opted out
          // 2. WhatsApp connection safety is NOT paused
          // 3. Conversation is in 'AI' mode
          // 4. AI settings enabled
          const aiSettings = await db.getAISettingsByBusinessId(business.id);

          if (customer.opt_in_status === 'opted_out') {
            console.log(`🛑 Customer ${customer.phone_number} is OPTED OUT. AI reply skipped.`);
            continue;
          }

          if (connection.safety_paused) {
            console.warn(`⚠️ WhatsApp connection safety is PAUSED for business ${business.id}. Skipping AI reply.`);
            continue;
          }

          if (conv.mode === 'AI' && aiSettings && aiSettings.enabled) {
            const recentMessages = await db.getMessagesByConversationId(conv.id);

            // Loop / limit protection: check count of AI replies in this conversation
            const aiReplyCount = recentMessages.filter((m) => m.sender_type === 'ai').length;
            const maxReplies = safetySettings.max_ai_replies_per_conversation || 15;

            if (aiReplyCount >= maxReplies) {
              console.warn(`⚠️ AI reply limit (${maxReplies}) reached for conversation ${conv.id}. Auto switching to HUMAN mode.`);
              await db.updateConversation(conv.id, { mode: 'HUMAN' });
              continue;
            }

            console.log(`🤖 AI mode active for conversation ${conv.id}. Generating reply with Gemini...`);

            try {
              const aiReplyText = await generateAIReply({
                business,
                aiSettings,
                customer,
                recentMessages,
                customerMessage: messageBody
              });

              console.log(`🤖 AI generated reply: "${aiReplyText}"`);

              // Send reply via Meta WhatsApp API
              const sendResult = await sendWhatsAppTextMessage(connection, customer.phone_number, aiReplyText);

              if (sendResult.success) {
                // Store outgoing AI message in DB
                await db.createMessage({
                  id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  conversation_id: conv.id,
                  business_id: business.id,
                  customer_id: customer.id,
                  sender_type: 'ai',
                  body: aiReplyText,
                  wa_message_id: sendResult.wa_message_id,
                  status: 'sent',
                  created_at: new Date().toISOString()
                });

                await db.updateConversation(conv.id, {
                  last_message: aiReplyText,
                  last_message_at: new Date().toISOString()
                });

                console.log(`✅ AI reply sent successfully to ${customer.phone_number}`);
              } else {
                console.error(`❌ Failed to send AI reply to WhatsApp: ${sendResult.error}`);
              }
            } catch (err: any) {
              console.error(`❌ AI reply generation error:`, err);
            }
          } else {
            console.log(`👤 Conversation ${conv.id} is in HUMAN mode or AI is disabled. Skipping auto-reply.`);
          }
        }
      }
    }
  } catch (err) {
    console.error('❌ Error processing webhook payload:', err);
  }
}
