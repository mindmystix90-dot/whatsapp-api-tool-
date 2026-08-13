export type Role = 'user' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  business_id: string;
  created_at: string;
}

export interface Business {
  id: string;
  user_id: string;
  name: string;
  description: string;
  products_services: string;
  prices: string;
  faqs: string;
  business_hours: string;
  location: string;
  contact_info: string;
  additional_info: string;
  created_at: string;
  updated_at: string;
}

export type WhatsAppConnectionStatus = 'Not Connected' | 'Connected' | 'Connection Error';
export type SafetyHealthStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface WhatsAppConnection {
  id: string;
  business_id: string;
  meta_app_id: string;
  waba_id: string;
  phone_number_id: string;
  phone_number: string;
  display_name: string;
  access_token: string;
  webhook_verify_token: string;
  status: WhatsAppConnectionStatus;
  last_verified_at: string | null;
  last_webhook_received_at: string | null;
  error_message: string | null;
  coexistence_enabled: boolean;
  coexistence_mode: 'embedded_signup' | 'manual' | 'none';
  quality_rating?: string;
  safety_status: SafetyHealthStatus;
  safety_paused: boolean;
  safety_paused_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export type OptInStatus = 'opted_in' | 'opted_out' | 'pending';

export interface Customer {
  id: string;
  business_id: string;
  wa_id: string;
  phone_number: string;
  name: string;
  profile_pic_url?: string;
  opt_in_status: OptInStatus;
  opt_in_source?: string;
  opt_in_timestamp?: string;
  opt_in_type?: string;
  last_customer_message_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type ConversationMode = 'AI' | 'HUMAN';
export type ConversationStatus = 'active' | 'closed';

export interface Conversation {
  id: string;
  business_id: string;
  customer_id: string;
  customer?: Customer;
  mode: ConversationMode;
  status: ConversationStatus;
  unread_count: number;
  last_message: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export type MessageSenderType = 'customer' | 'ai' | 'human';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversation_id: string;
  business_id: string;
  customer_id: string;
  sender_type: MessageSenderType;
  body: string;
  wa_message_id?: string;
  status: MessageStatus;
  is_template?: boolean;
  template_name?: string;
  created_at: string;
}

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';

export interface Lead {
  id: string;
  business_id: string;
  customer_id: string;
  conversation_id: string;
  customer_name: string;
  wa_number: string;
  status: LeadStatus;
  source: string;
  created_at: string;
  updated_at: string;
}

export interface AISettings {
  id: string;
  business_id: string;
  enabled: boolean;
  agent_name: string;
  system_instructions: string;
  tone: string;
  language_preference: string;
  human_handoff_rules: string;
  created_at: string;
  updated_at: string;
}

export type TemplateStatus = 'APPROVED' | 'PENDING' | 'REJECTED';
export type TemplateCategory = 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';

export interface WhatsAppTemplate {
  id: string;
  business_id: string;
  name: string;
  category: TemplateCategory;
  language: string;
  status: TemplateStatus;
  meta_template_id?: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
  created_at: string;
  updated_at: string;
}

export interface SafetySettings {
  id: string;
  business_id: string;
  ai_enabled: boolean;
  human_takeover_on_opt_out: boolean;
  max_ai_replies_per_conversation: number;
  enforce_24h_window: boolean;
  auto_opt_out_keywords: string[];
  safety_pause_on_error_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  target_business_id: string;
  target_business_name?: string;
  details: string;
  timestamp: string;
}

export interface DashboardStats {
  total_leads: number;
  new_leads: number;
  qualified_leads: number;
  converted_leads: number;
  lost_leads: number;
  active_conversations: number;
  ai_handled_messages: number;
  human_handled_messages: number;
  whatsapp_status: WhatsAppConnectionStatus;
  whatsapp_phone: string;
  safety_status: SafetyHealthStatus;
  opt_outs_count: number;
}

export interface AdminBusinessOverview {
  business_id: string;
  business_name: string;
  owner_email: string;
  owner_name: string;
  whatsapp_status: WhatsAppConnectionStatus;
  whatsapp_phone: string;
  total_conversations: number;
  total_leads: number;
  new_leads: number;
  qualified_leads: number;
  converted_leads: number;
  safety_status: SafetyHealthStatus;
  safety_paused: boolean;
  created_at: string;
}

export interface AdminOverview {
  total_businesses: number;
  active_businesses: number;
  connected_whatsapp_count: number;
  disconnected_whatsapp_count: number;
  total_customers: number;
  total_conversations: number;
  total_leads: number;
  new_leads: number;
  qualified_leads: number;
  converted_leads: number;
  messages_received: number;
  messages_sent: number;
  ai_conversations: number;
  human_conversations: number;
  businesses: AdminBusinessOverview[];
}

export interface AdminBusinessDetail {
  business: Business;
  connection: WhatsAppConnection | null;
  ai_settings: AISettings | null;
  safety_settings: SafetySettings | null;
  leads: Lead[];
  conversations: Conversation[];
  templates: WhatsAppTemplate[];
  stats: {
    total_messages: number;
    ai_messages: number;
    human_messages: number;
    opt_outs: number;
    delivery_failures: number;
  };
}

