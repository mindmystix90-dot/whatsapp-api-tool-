import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getStorage, Storage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import {
  User,
  Business,
  WhatsAppConnection,
  Customer,
  Conversation,
  Message,
  Lead,
  AISettings,
  LeadStatus,
  WhatsAppConnectionStatus
} from '../src/types.js';

// Firestore Collection Names
export const COLLECTIONS = {
  USERS: 'users',
  BUSINESSES: 'businesses',
  WHATSAPP_CONNECTIONS: 'whatsappConnections',
  CUSTOMERS: 'customers',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  LEADS: 'leads',
  AI_SETTINGS: 'aiSettings',
  TEMPLATES: 'templates',
  SAFETY_SETTINGS: 'safetySettings',
  ADMIN_AUDIT_LOGS: 'adminAuditLogs'
} as const;

let isFirestoreConfigured = false;

function formatPrivateKey(key: string | undefined): string | undefined {
  if (!key) return undefined;
  let formatted = key.trim();
  if ((formatted.startsWith('"') && formatted.endsWith('"')) || (formatted.startsWith("'") && formatted.endsWith("'"))) {
    formatted = formatted.substring(1, formatted.length - 1).trim();
  }
  // If base64 encoded
  if (!formatted.includes('-----BEGIN PRIVATE KEY-----') && !formatted.includes('KEY')) {
    try {
      const decoded = Buffer.from(formatted, 'base64').toString('utf-8');
      if (decoded.includes('-----BEGIN PRIVATE KEY-----')) {
        formatted = decoded;
      }
    } catch {}
  }
  return formatted.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');
}

function initFirebaseAdmin(): App | null {
  try {
    if (getApps().length > 0) {
      isFirestoreConfigured = true;
      return getApps()[0]!;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    const privateKey = formatPrivateKey(privateKeyRaw);

    console.log('🔍 [FIREBASE ENV DIAGNOSTICS]:', {
      FIREBASE_PROJECT_ID: projectId ? `PRESENT (${projectId})` : 'MISSING',
      FIREBASE_CLIENT_EMAIL: clientEmail ? `PRESENT (${clientEmail.substring(0, 5)}...)` : 'MISSING',
      FIREBASE_PRIVATE_KEY: privateKeyRaw ? 'PRESENT' : 'MISSING',
      privateKeyLength: privateKey ? privateKey.length : 0,
      privateKeyHasBeginHeader: privateKey ? privateKey.includes('-----BEGIN PRIVATE KEY-----') : false,
      privateKeyHasEndHeader: privateKey ? privateKey.includes('-----END PRIVATE KEY-----') : false,
      hasServiceAccountJson: Boolean(serviceAccountJson)
    });

    // 1. Check FIREBASE_SERVICE_ACCOUNT_JSON
    if (serviceAccountJson) {
      try {
        let raw = serviceAccountJson.trim();
        if (!raw.startsWith('{') && !raw.startsWith('"')) {
          try {
            raw = Buffer.from(raw, 'base64').toString('utf-8');
          } catch {}
        }
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const pId = parsed.project_id || parsed.projectId;
        const cEmail = parsed.client_email || parsed.clientEmail;
        const pKey = formatPrivateKey(parsed.private_key || parsed.privateKey);

        if (pId && cEmail && pKey) {
          const app = initializeApp({
            credential: cert({
              projectId: pId,
              clientEmail: cEmail,
              privateKey: pKey
            }),
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${pId}.appspot.com`
          });
          isFirestoreConfigured = true;
          console.log(`🔥 Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON (${pId})`);
          return app;
        }
      } catch (e: any) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', e?.message || e);
      }
    }

    // 2. Check Individual Environment Variables
    if (projectId && clientEmail && privateKey) {
      try {
        const app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey
          }),
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`
        });
        isFirestoreConfigured = true;
        console.log(`🔥 Firebase Admin initialized via env variables (${projectId})`);
        return app;
      } catch (e: any) {
        console.error('❌ Failed to initialize Firebase Admin with env vars:', e?.message || e);
      }
    }

    // 3. Check GOOGLE_APPLICATION_CREDENTIALS or local service account JSON files
    const possiblePaths = [
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      path.join(process.cwd(), 'serviceAccountKey.json'),
      path.join(process.cwd(), 'service-account.json'),
      path.join(process.cwd(), 'serviceAccount.json'),
      path.join(process.cwd(), 'firebase-service-account.json'),
      path.join(process.cwd(), 'firebase-applet-config.json')
    ].filter((p): p is string => Boolean(p));

    for (const jsonPath of possiblePaths) {
      if (fs.existsSync(jsonPath)) {
        try {
          const raw = fs.readFileSync(jsonPath, 'utf-8');
          const parsed = JSON.parse(raw);
          const pId = parsed.project_id || parsed.projectId;
          const cEmail = parsed.client_email || parsed.clientEmail;
          const pKey = formatPrivateKey(parsed.private_key || parsed.privateKey);

          if (pId && cEmail && pKey) {
            const app = initializeApp({
              credential: cert({
                projectId: pId,
                clientEmail: cEmail,
                privateKey: pKey
              }),
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${pId}.appspot.com`
            });
            isFirestoreConfigured = true;
            console.log(`🔥 Firebase Admin initialized via service account file (${path.basename(jsonPath)} / ${pId})`);
            return app;
          }
        } catch (e: any) {
          console.warn(`⚠️ Could not parse service account file ${jsonPath}:`, e?.message || e);
        }
      }
    }

    // 4. GCP Container ADC Check (Cloud Run / App Engine with ADC)
    // CRITICAL: NEVER perform ADC metadata-server discovery on Vercel
    const isVercel = Boolean(process.env.VERCEL);
    const isGCPContainer = Boolean(
      !isVercel && (process.env.K_SERVICE || process.env.FUNCTION_NAME || process.env.CLOUD_RUN_JOB)
    );

    if (isGCPContainer && (projectId || process.env.GCLOUD_PROJECT)) {
      try {
        const app = initializeApp({
          projectId: projectId || process.env.GCLOUD_PROJECT
        });
        isFirestoreConfigured = true;
        console.log(`🔥 Firebase Admin initialized with GCP container ADC (${projectId || process.env.GCLOUD_PROJECT})`);
        return app;
      } catch (e: any) {
        console.warn('⚠️ GCP default Firebase Admin init skipped:', e?.message || e);
      }
    }

    console.error(
      '❌ [Firebase Admin Init] Service account credentials missing or incomplete. Please check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.'
    );
    isFirestoreConfigured = false;
    return null;
  } catch (err: any) {
    console.error('❌ [Firebase Admin Init Top-Level Error]:', err?.message || err);
    isFirestoreConfigured = false;
    return null;
  }
}

let cachedFirebaseApp: App | null | undefined = undefined;
let cachedFirestore: Firestore | null | undefined = undefined;
let cachedAuth: Auth | null | undefined = undefined;
let cachedStorage: Storage | null | undefined = undefined;

export function getFirebaseApp(): App | null {
  if (cachedFirebaseApp !== undefined) {
    return cachedFirebaseApp;
  }
  cachedFirebaseApp = initFirebaseAdmin();
  return cachedFirebaseApp;
}

export function getFirestoreInstance(): Firestore | null {
  if (cachedFirestore !== undefined) {
    return cachedFirestore;
  }
  const app = getFirebaseApp();
  cachedFirestore = app ? getFirestore(app) : null;
  return cachedFirestore;
}

export function getAuthInstance(): Auth | null {
  if (cachedAuth !== undefined) {
    return cachedAuth;
  }
  const app = getFirebaseApp();
  cachedAuth = app ? getAuth(app) : null;
  return cachedAuth;
}

export function getStorageInstance(): Storage | null {
  if (cachedStorage !== undefined) {
    return cachedStorage;
  }
  const app = getFirebaseApp();
  cachedStorage = app ? getStorage(app) : null;
  return cachedStorage;
}

export const firestore: Firestore | null = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getFirestoreInstance();
    if (!instance) return null;
    const val = Reflect.get(instance, prop);
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

export const firebaseAuth: Auth | null = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getAuthInstance();
    if (!instance) return null;
    const val = Reflect.get(instance, prop);
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

export const firebaseStorage: Storage | null = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getStorageInstance();
    if (!instance) return null;
    const val = Reflect.get(instance, prop);
    return typeof val === 'function' ? val.bind(instance) : val;
  }
});

function isVercelEnvironment(): boolean {
  return Boolean(process.env.VERCEL);
}

// Ephemeral memory fallback store ONLY for local development when credentials are not configured
interface EphemeralStore {
  users: User[];
  passwords: Record<string, string>;
  businesses: Business[];
  whatsappConnections: WhatsAppConnection[];
  customers: Customer[];
  conversations: Conversation[];
  messages: Message[];
  leads: Lead[];
  aiSettings: AISettings[];
}

class FirestoreDatabase {
  private mem: EphemeralStore = {
    users: [],
    passwords: {},
    businesses: [],
    whatsappConnections: [],
    customers: [],
    conversations: [],
    messages: [],
    leads: [],
    aiSettings: []
  };

  public isUsingFirestore(): boolean {
    return Boolean(isFirestoreConfigured && getFirestoreInstance() !== null);
  }

  private ensureDatabaseReady() {
    if (!this.isUsingFirestore()) {
      if (isVercelEnvironment()) {
        console.warn('⚠️ [Firebase Vercel Notice]: Firebase environment variables are missing. Using in-memory store for this request.');
      }
    }
  }

  // --- Users & Passwords ---
  public async findUserByEmail(email: string): Promise<User | undefined> {
    if (!email) return undefined;
    this.ensureDatabaseReady();
    const cleanEmail = email.trim().toLowerCase();

    if (this.isUsingFirestore()) {
      try {
        const snap = await firestore!
          .collection(COLLECTIONS.USERS)
          .where('email', '==', cleanEmail)
          .limit(1)
          .get();
        if (snap.empty) return undefined;
        const doc = snap.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          name: data.name,
          role: data.role,
          business_id: data.businessId || data.business_id,
          created_at: data.createdAt || data.created_at || new Date().toISOString()
        };
      } catch (err: any) {
        console.error('❌ Firestore findUserByEmail error:', err?.message || err);
        throw new Error(`Firestore user query failed: ${err?.message || String(err)}`);
      }
    }

    return this.mem.users.find((u) => u.email.toLowerCase() === cleanEmail);
  }

  public async findUserById(id: string): Promise<User | undefined> {
    if (!id) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      try {
        const doc = await firestore!.collection(COLLECTIONS.USERS).doc(id).get();
        if (!doc.exists) return undefined;
        const data = doc.data()!;
        return {
          id: doc.id,
          email: data.email,
          name: data.name,
          role: data.role,
          business_id: data.businessId || data.business_id,
          created_at: data.createdAt || data.created_at || new Date().toISOString()
        };
      } catch (err: any) {
        console.error('❌ Firestore findUserById error:', err?.message || err);
        throw new Error(`Firestore user read failed: ${err?.message || String(err)}`);
      }
    }

    return this.mem.users.find((u) => u.id === id);
  }

  public async getAllUsers(): Promise<User[]> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      try {
        const snap = await firestore!.collection(COLLECTIONS.USERS).get();
        return snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            email: data.email,
            name: data.name,
            role: data.role,
            business_id: data.businessId || data.business_id,
            created_at: data.createdAt || data.created_at || new Date().toISOString()
          };
        });
      } catch (err: any) {
        console.error('❌ Firestore getAllUsers error:', err?.message || err);
        throw new Error(`Firestore getAllUsers failed: ${err?.message || String(err)}`);
      }
    }

    return [...this.mem.users];
  }

  public async createUser(user: User, passwordHash: string): Promise<User> {
    this.ensureDatabaseReady();
    const businessId = user.business_id;

    if (this.isUsingFirestore()) {
      try {
        await firestore!.collection(COLLECTIONS.USERS).doc(user.id).set({
          id: user.id,
          email: user.email.toLowerCase(),
          name: user.name,
          role: user.role,
          businessId: businessId,
          business_id: businessId,
          passwordHash,
          createdAt: user.created_at
        });
        return user;
      } catch (err: any) {
        console.error('❌ Firestore createUser error:', err?.message || err);
        throw new Error(`Firestore createUser failed: ${err?.message || String(err)}`);
      }
    }

    this.mem.users.push(user);
    this.mem.passwords[user.id] = passwordHash;
    return user;
  }

  public async getPasswordHash(userId: string): Promise<string | undefined> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      try {
        const doc = await firestore!.collection(COLLECTIONS.USERS).doc(userId).get();
        if (!doc.exists) return undefined;
        return doc.data()?.passwordHash;
      } catch (err: any) {
        console.error('❌ Firestore getPasswordHash error:', err?.message || err);
        throw new Error(`Firestore getPasswordHash failed: ${err?.message || String(err)}`);
      }
    }

    return this.mem.passwords[userId];
  }

  // --- Businesses ---
  public async getBusinessById(id: string): Promise<Business | undefined> {
    if (!id) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const doc = await firestore!.collection(COLLECTIONS.BUSINESSES).doc(id).get();
      if (!doc.exists) return undefined;
      const data = doc.data()!;
      return {
        id: doc.id,
        user_id: data.userId || data.user_id,
        name: data.name || '',
        description: data.description || '',
        products_services: data.productsServices || data.products_services || '',
        prices: data.prices || '',
        faqs: data.faqs || '',
        business_hours: data.businessHours || data.business_hours || '',
        location: data.location || '',
        contact_info: data.contactInfo || data.contact_info || '',
        additional_info: data.additionalInfo || data.additional_info || '',
        created_at: data.createdAt || data.created_at || new Date().toISOString(),
        updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    }

    return this.mem.businesses.find((b) => b.id === id);
  }

  public async getBusinessByUserId(userId: string): Promise<Business | undefined> {
    if (!userId) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.BUSINESSES)
        .where('userId', '==', userId)
        .limit(1)
        .get();
      if (snap.empty) return undefined;
      const doc = snap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        user_id: data.userId || data.user_id,
        name: data.name || '',
        description: data.description || '',
        products_services: data.productsServices || data.products_services || '',
        prices: data.prices || '',
        faqs: data.faqs || '',
        business_hours: data.businessHours || data.business_hours || '',
        location: data.location || '',
        contact_info: data.contactInfo || data.contact_info || '',
        additional_info: data.additionalInfo || data.additional_info || '',
        created_at: data.createdAt || data.created_at || new Date().toISOString(),
        updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    }

    return this.mem.businesses.find((b) => b.user_id === userId);
  }

  public async getAllBusinesses(): Promise<Business[]> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!.collection(COLLECTIONS.BUSINESSES).get();
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          user_id: data.userId || data.user_id,
          name: data.name || '',
          description: data.description || '',
          products_services: data.productsServices || data.products_services || '',
          prices: data.prices || '',
          faqs: data.faqs || '',
          business_hours: data.businessHours || data.business_hours || '',
          location: data.location || '',
          contact_info: data.contactInfo || data.contact_info || '',
          additional_info: data.additionalInfo || data.additional_info || '',
          created_at: data.createdAt || data.created_at || new Date().toISOString(),
          updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
        };
      });
    }

    return [...this.mem.businesses];
  }

  public async createBusiness(business: Business): Promise<Business> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      await firestore!.collection(COLLECTIONS.BUSINESSES).doc(business.id).set({
        id: business.id,
        userId: business.user_id,
        businessId: business.id, // tenant isolation
        name: business.name,
        description: business.description,
        productsServices: business.products_services,
        prices: business.prices,
        faqs: business.faqs,
        businessHours: business.business_hours,
        location: business.location,
        contactInfo: business.contact_info,
        additionalInfo: business.additional_info,
        createdAt: business.created_at,
        updatedAt: business.updated_at
      });
      return business;
    }

    this.mem.businesses.push(business);
    return business;
  }

  public async updateBusiness(id: string, updates: Partial<Business>): Promise<Business | undefined> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const docRef = firestore!.collection(COLLECTIONS.BUSINESSES).doc(id);
      const existingDoc = await docRef.get();
      if (!existingDoc.exists) return undefined;

      const firestoreUpdates: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };

      if (updates.name !== undefined) firestoreUpdates.name = updates.name;
      if (updates.description !== undefined) firestoreUpdates.description = updates.description;
      if (updates.products_services !== undefined) firestoreUpdates.productsServices = updates.products_services;
      if (updates.prices !== undefined) firestoreUpdates.prices = updates.prices;
      if (updates.faqs !== undefined) firestoreUpdates.faqs = updates.faqs;
      if (updates.business_hours !== undefined) firestoreUpdates.businessHours = updates.business_hours;
      if (updates.location !== undefined) firestoreUpdates.location = updates.location;
      if (updates.contact_info !== undefined) firestoreUpdates.contactInfo = updates.contact_info;
      if (updates.additional_info !== undefined) firestoreUpdates.additionalInfo = updates.additional_info;

      await docRef.update(firestoreUpdates);
      return this.getBusinessById(id);
    }

    const idx = this.mem.businesses.findIndex((b) => b.id === id);
    if (idx === -1) return undefined;
    this.mem.businesses[idx] = {
      ...this.mem.businesses[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return this.mem.businesses[idx];
  }

  // --- WhatsApp Connections ---
  public async getWhatsAppConnectionByBusinessId(businessId: string): Promise<WhatsAppConnection | undefined> {
    if (!businessId) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      try {
        const snap = await firestore!
          .collection(COLLECTIONS.WHATSAPP_CONNECTIONS)
          .where('businessId', '==', businessId)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data();
          return {
            id: doc.id,
            business_id: data.businessId || data.business_id,
            meta_app_id: data.metaAppId || data.meta_app_id || '',
            waba_id: data.wabaId || data.waba_id || '',
            phone_number_id: data.phoneNumberId || data.phone_number_id || '',
            phone_number: data.phoneNumber || data.phone_number || '',
            display_name: data.displayName || data.display_name || '',
            access_token: data.accessToken || data.access_token || '',
            webhook_verify_token: data.webhookVerifyToken || data.webhook_verify_token || '',
            status: data.status || 'Not Connected',
            last_verified_at: data.lastVerifiedAt || data.last_verified_at || null,
            last_webhook_received_at: data.lastWebhookReceivedAt || data.last_webhook_received_at || null,
            error_message: data.errorMessage || data.error_message || null,
            coexistence_enabled: data.coexistenceEnabled ?? data.coexistence_enabled ?? false,
            coexistence_mode: data.coexistenceMode || data.coexistence_mode || 'none',
            quality_rating: data.qualityRating || data.quality_rating || 'GREEN',
            safety_status: data.safetyStatus || data.safety_status || 'GREEN',
            safety_paused: data.safetyPaused ?? data.safety_paused ?? false,
            safety_paused_reason: data.safetyPausedReason || data.safety_paused_reason || null,
            created_at: data.createdAt || data.created_at || new Date().toISOString(),
            updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
          };
        }
      } catch (err: any) {
        console.warn('⚠️ Firestore getWhatsAppConnectionByBusinessId error, falling back to memory store:', err?.message || err);
      }
    }

    return this.mem.whatsappConnections.find((w) => w.business_id === businessId);
  }

  public async getWhatsAppConnectionByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppConnection | undefined> {
    if (!phoneNumberId) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      try {
        const snap = await firestore!
          .collection(COLLECTIONS.WHATSAPP_CONNECTIONS)
          .where('phoneNumberId', '==', phoneNumberId)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const data = doc.data();
          return {
            id: doc.id,
            business_id: data.businessId || data.business_id,
            meta_app_id: data.metaAppId || data.meta_app_id || '',
            waba_id: data.wabaId || data.waba_id || '',
            phone_number_id: data.phoneNumberId || data.phone_number_id || '',
            phone_number: data.phoneNumber || data.phone_number || '',
            display_name: data.displayName || data.display_name || '',
            access_token: data.accessToken || data.access_token || '',
            webhook_verify_token: data.webhookVerifyToken || data.webhook_verify_token || '',
            status: data.status || 'Not Connected',
            last_verified_at: data.lastVerifiedAt || data.last_verified_at || null,
            last_webhook_received_at: data.lastWebhookReceivedAt || data.last_webhook_received_at || null,
            error_message: data.errorMessage || data.error_message || null,
            coexistence_enabled: data.coexistenceEnabled ?? data.coexistence_enabled ?? false,
            coexistence_mode: data.coexistenceMode || data.coexistence_mode || 'none',
            quality_rating: data.qualityRating || data.quality_rating || 'GREEN',
            safety_status: data.safetyStatus || data.safety_status || 'GREEN',
            safety_paused: data.safetyPaused ?? data.safety_paused ?? false,
            safety_paused_reason: data.safetyPausedReason || data.safety_paused_reason || null,
            created_at: data.createdAt || data.created_at || new Date().toISOString(),
            updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
          };
        }
      } catch (err: any) {
        console.warn('⚠️ Firestore getWhatsAppConnectionByPhoneNumberId error, falling back to memory store:', err?.message || err);
      }
    }

    return this.mem.whatsappConnections.find((w) => w.phone_number_id === phoneNumberId && phoneNumberId !== '');
  }

  public async getAllWhatsAppConnections(): Promise<WhatsAppConnection[]> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      try {
        const snap = await firestore!.collection(COLLECTIONS.WHATSAPP_CONNECTIONS).get();
        return snap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            business_id: data.businessId || data.business_id,
            meta_app_id: data.metaAppId || data.meta_app_id || '',
            waba_id: data.wabaId || data.waba_id || '',
            phone_number_id: data.phoneNumberId || data.phone_number_id || '',
            phone_number: data.phoneNumber || data.phone_number || '',
            display_name: data.displayName || data.display_name || '',
            access_token: data.accessToken || data.access_token || '',
            webhook_verify_token: data.webhookVerifyToken || data.webhook_verify_token || '',
            status: data.status || 'Not Connected',
            last_verified_at: data.lastVerifiedAt || data.last_verified_at || null,
            last_webhook_received_at: data.lastWebhookReceivedAt || data.last_webhook_received_at || null,
            error_message: data.errorMessage || data.error_message || null,
            coexistence_enabled: data.coexistenceEnabled ?? data.coexistence_enabled ?? false,
            coexistence_mode: data.coexistenceMode || data.coexistence_mode || 'none',
            quality_rating: data.qualityRating || data.quality_rating || 'GREEN',
            safety_status: data.safetyStatus || data.safety_status || 'GREEN',
            safety_paused: data.safetyPaused ?? data.safety_paused ?? false,
            safety_paused_reason: data.safetyPausedReason || data.safety_paused_reason || null,
            created_at: data.createdAt || data.created_at || new Date().toISOString(),
            updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
          };
        });
      } catch (err: any) {
        console.warn('⚠️ Firestore getAllWhatsAppConnections error, falling back to memory store:', err?.message || err);
      }
    }

    return [...this.mem.whatsappConnections];
  }

  public async upsertWhatsAppConnection(connection: WhatsAppConnection): Promise<WhatsAppConnection> {
    this.ensureDatabaseReady();
    const now = new Date().toISOString();
    const docId = connection.id || `wa_${connection.business_id}`;

    if (this.isUsingFirestore()) {
      try {
        await firestore!.collection(COLLECTIONS.WHATSAPP_CONNECTIONS).doc(docId).set(
          {
            id: docId,
            businessId: connection.business_id, // tenant isolation
            metaAppId: connection.meta_app_id ?? '',
            wabaId: connection.waba_id ?? '',
            phoneNumberId: connection.phone_number_id ?? '',
            phoneNumber: connection.phone_number ?? '',
            displayName: connection.display_name ?? '',
            accessToken: connection.access_token ?? '',
            webhookVerifyToken: connection.webhook_verify_token ?? 'fishcatch_verify_token_123',
            status: connection.status ?? 'Not Connected',
            lastVerifiedAt: connection.last_verified_at ?? null,
            lastWebhookReceivedAt: connection.last_webhook_received_at ?? null,
            errorMessage: connection.error_message ?? null,
            coexistenceEnabled: connection.coexistence_enabled ?? false,
            coexistenceMode: connection.coexistence_mode ?? 'none',
            qualityRating: connection.quality_rating ?? 'GREEN',
            safetyStatus: connection.safety_status ?? 'GREEN',
            safetyPaused: connection.safety_paused ?? false,
            safetyPausedReason: connection.safety_paused_reason ?? null,
            createdAt: connection.created_at || now,
            updatedAt: now
          },
          { merge: true }
        );
        const saved = await this.getWhatsAppConnectionByBusinessId(connection.business_id);
        if (saved) return saved;
      } catch (err: any) {
        console.warn('⚠️ Firestore upsertWhatsAppConnection error, falling back to memory store:', err?.message || err);
      }
    }

    const idx = this.mem.whatsappConnections.findIndex((w) => w.business_id === connection.business_id);
    if (idx !== -1) {
      this.mem.whatsappConnections[idx] = {
        ...this.mem.whatsappConnections[idx],
        ...connection,
        updated_at: now
      };
    } else {
      this.mem.whatsappConnections.push({ ...connection, id: docId, updated_at: now });
    }
    return (await this.getWhatsAppConnectionByBusinessId(connection.business_id))!;
  }

  // --- AI Settings ---
  public async getAISettingsByBusinessId(businessId: string): Promise<AISettings | undefined> {
    if (!businessId) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.AI_SETTINGS)
        .where('businessId', '==', businessId)
        .limit(1)
        .get();
      if (snap.empty) return undefined;
      const doc = snap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        business_id: data.businessId || data.business_id,
        enabled: data.enabled ?? true,
        agent_name: data.agentName || data.agent_name || 'Lead AI Assistant',
        system_instructions: data.systemInstructions || data.system_instructions || '',
        tone: data.tone || 'Friendly & Professional',
        language_preference: data.languagePreference || data.language_preference || 'Match Customer Language',
        human_handoff_rules: data.humanHandoffRules || data.human_handoff_rules || '',
        created_at: data.createdAt || data.created_at || new Date().toISOString(),
        updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    }

    return this.mem.aiSettings.find((a) => a.business_id === businessId);
  }

  public async upsertAISettings(settings: AISettings): Promise<AISettings> {
    this.ensureDatabaseReady();
    const now = new Date().toISOString();
    const docId = settings.id || `ai_${settings.business_id}`;

    if (this.isUsingFirestore()) {
      await firestore!.collection(COLLECTIONS.AI_SETTINGS).doc(docId).set(
        {
          id: docId,
          businessId: settings.business_id, // tenant isolation
          enabled: settings.enabled,
          agentName: settings.agent_name,
          systemInstructions: settings.system_instructions,
          tone: settings.tone,
          languagePreference: settings.language_preference,
          humanHandoffRules: settings.human_handoff_rules,
          createdAt: settings.created_at || now,
          updatedAt: now
        },
        { merge: true }
      );
      return (await this.getAISettingsByBusinessId(settings.business_id))!;
    }

    const idx = this.mem.aiSettings.findIndex((a) => a.business_id === settings.business_id);
    if (idx !== -1) {
      this.mem.aiSettings[idx] = {
        ...this.mem.aiSettings[idx],
        ...settings,
        updated_at: now
      };
    } else {
      this.mem.aiSettings.push({ ...settings, id: docId, updated_at: now });
    }
    return (await this.getAISettingsByBusinessId(settings.business_id))!;
  }

  // --- Customers ---
  public async getCustomerById(id: string): Promise<Customer | undefined> {
    if (!id) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const doc = await firestore!.collection(COLLECTIONS.CUSTOMERS).doc(id).get();
      if (!doc.exists) return undefined;
      const data = doc.data()!;
      return {
        id: doc.id,
        business_id: data.businessId || data.business_id,
        wa_id: data.waId || data.wa_id,
        phone_number: data.phoneNumber || data.phone_number,
        name: data.name,
        profile_pic_url: data.profilePicUrl || data.profile_pic_url,
        opt_in_status: data.optInStatus || data.opt_in_status || 'opted_in',
        opt_in_source: data.optInSource || data.opt_in_source || 'WhatsApp Direct',
        opt_in_timestamp: data.optInTimestamp || data.opt_in_timestamp || data.createdAt || new Date().toISOString(),
        opt_in_type: data.optInType || data.opt_in_type || 'implicit_inbound',
        last_customer_message_at: data.lastCustomerMessageAt || data.last_customer_message_at || null,
        created_at: data.createdAt || data.created_at || new Date().toISOString(),
        updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    }

    return this.mem.customers.find((c) => c.id === id);
  }

  public async findCustomerByWaId(businessId: string, waId: string): Promise<Customer | undefined> {
    if (!businessId || !waId) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.CUSTOMERS)
        .where('businessId', '==', businessId)
        .where('waId', '==', waId)
        .limit(1)
        .get();
      if (snap.empty) return undefined;
      const doc = snap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        business_id: data.businessId || data.business_id,
        wa_id: data.waId || data.wa_id,
        phone_number: data.phoneNumber || data.phone_number,
        name: data.name,
        profile_pic_url: data.profilePicUrl || data.profile_pic_url,
        opt_in_status: data.optInStatus || data.opt_in_status || 'opted_in',
        opt_in_source: data.optInSource || data.opt_in_source || 'WhatsApp Direct',
        opt_in_timestamp: data.optInTimestamp || data.opt_in_timestamp || data.createdAt || new Date().toISOString(),
        opt_in_type: data.optInType || data.opt_in_type || 'implicit_inbound',
        last_customer_message_at: data.lastCustomerMessageAt || data.last_customer_message_at || null,
        created_at: data.createdAt || data.created_at || new Date().toISOString(),
        updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    }

    return this.mem.customers.find((c) => c.business_id === businessId && c.wa_id === waId);
  }

  public async getCustomersByBusinessId(businessId: string): Promise<Customer[]> {
    if (!businessId) return [];
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.CUSTOMERS)
        .where('businessId', '==', businessId)
        .get();

      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          business_id: data.businessId || data.business_id,
          wa_id: data.waId || data.wa_id,
          phone_number: data.phoneNumber || data.phone_number,
          name: data.name,
          profile_pic_url: data.profilePicUrl || data.profile_pic_url,
          opt_in_status: data.optInStatus || data.opt_in_status || 'opted_in',
          opt_in_source: data.optInSource || data.opt_in_source || 'WhatsApp Direct',
          opt_in_timestamp: data.optInTimestamp || data.opt_in_timestamp || data.createdAt || new Date().toISOString(),
          opt_in_type: data.optInType || data.opt_in_type || 'implicit_inbound',
          last_customer_message_at: data.lastCustomerMessageAt || data.last_customer_message_at || null,
          created_at: data.createdAt || data.created_at || new Date().toISOString(),
          updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
        } as Customer;
      });
    }

    return this.mem.customers.filter((c) => c.business_id === businessId);
  }

  public async getAllCustomers(): Promise<Customer[]> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!.collection(COLLECTIONS.CUSTOMERS).get();
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          business_id: data.businessId || data.business_id,
          wa_id: data.waId || data.wa_id,
          phone_number: data.phoneNumber || data.phone_number,
          name: data.name,
          profile_pic_url: data.profilePicUrl || data.profile_pic_url,
          opt_in_status: data.optInStatus || data.opt_in_status || 'opted_in',
          opt_in_source: data.optInSource || data.opt_in_source || 'WhatsApp Direct',
          opt_in_timestamp: data.optInTimestamp || data.opt_in_timestamp || data.createdAt || new Date().toISOString(),
          opt_in_type: data.optInType || data.opt_in_type || 'implicit_inbound',
          last_customer_message_at: data.lastCustomerMessageAt || data.last_customer_message_at || null,
          created_at: data.createdAt || data.created_at || new Date().toISOString(),
          updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
        } as Customer;
      });
    }

    return [...this.mem.customers];
  }

  public async createCustomer(customer: Customer): Promise<Customer> {
    this.ensureDatabaseReady();
    const now = new Date().toISOString();
    if (this.isUsingFirestore()) {
      await firestore!.collection(COLLECTIONS.CUSTOMERS).doc(customer.id).set({
        id: customer.id,
        businessId: customer.business_id, // tenant isolation
        waId: customer.wa_id,
        phoneNumber: customer.phone_number,
        name: customer.name,
        profilePicUrl: customer.profile_pic_url || null,
        optInStatus: customer.opt_in_status || 'opted_in',
        optInSource: customer.opt_in_source || 'WhatsApp Inbound',
        optInTimestamp: customer.opt_in_timestamp || now,
        optInType: customer.opt_in_type || 'implicit_inbound',
        lastCustomerMessageAt: customer.last_customer_message_at || null,
        createdAt: customer.created_at || now,
        updatedAt: customer.updated_at || now
      });
      return customer;
    }

    this.mem.customers.push({
      ...customer,
      opt_in_status: customer.opt_in_status || 'opted_in',
      opt_in_source: customer.opt_in_source || 'WhatsApp Inbound',
      opt_in_timestamp: customer.opt_in_timestamp || now,
      opt_in_type: customer.opt_in_type || 'implicit_inbound'
    });
    return customer;
  }

  public async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const docRef = firestore!.collection(COLLECTIONS.CUSTOMERS).doc(id);
      const existing = await docRef.get();
      if (!existing.exists) return undefined;

      const firestoreUpdates: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (updates.name !== undefined) firestoreUpdates.name = updates.name;
      if (updates.profile_pic_url !== undefined) firestoreUpdates.profilePicUrl = updates.profile_pic_url;
      if (updates.opt_in_status !== undefined) firestoreUpdates.optInStatus = updates.opt_in_status;
      if (updates.opt_in_source !== undefined) firestoreUpdates.optInSource = updates.opt_in_source;
      if (updates.opt_in_timestamp !== undefined) firestoreUpdates.optInTimestamp = updates.opt_in_timestamp;
      if (updates.opt_in_type !== undefined) firestoreUpdates.optInType = updates.opt_in_type;
      if (updates.last_customer_message_at !== undefined) firestoreUpdates.lastCustomerMessageAt = updates.last_customer_message_at;

      await docRef.update(firestoreUpdates);
      return this.getCustomerById(id);
    }

    const idx = this.mem.customers.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.mem.customers[idx] = {
      ...this.mem.customers[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return this.mem.customers[idx];
  }

  // --- Conversations ---
  public async getConversationsByBusinessId(businessId: string): Promise<Conversation[]> {
    if (!businessId) return [];
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.CONVERSATIONS)
        .where('businessId', '==', businessId)
        .get();

      const convs = await Promise.all(
        snap.docs.map(async (doc) => {
          const data = doc.data();
          const customer = await this.getCustomerById(data.customerId || data.customer_id);
          return {
            id: doc.id,
            business_id: data.businessId || data.business_id,
            customer_id: data.customerId || data.customer_id,
            customer,
            mode: data.mode || 'AI',
            status: data.status || 'active',
            unread_count: data.unreadCount ?? data.unread_count ?? 0,
            last_message: data.lastMessage || data.last_message || '',
            last_message_at: data.lastMessageAt || data.last_message_at || new Date().toISOString(),
            created_at: data.createdAt || data.created_at || new Date().toISOString(),
            updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
          } as Conversation;
        })
      );

      return convs.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
    }

    const convs = this.mem.conversations.filter((c) => c.business_id === businessId);
    return convs
      .map((c) => ({
        ...c,
        customer: this.mem.customers.find((cust) => cust.id === c.customer_id)
      }))
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
  }

  public async getConversationById(id: string): Promise<Conversation | undefined> {
    if (!id) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const doc = await firestore!.collection(COLLECTIONS.CONVERSATIONS).doc(id).get();
      if (!doc.exists) return undefined;
      const data = doc.data()!;
      const customer = await this.getCustomerById(data.customerId || data.customer_id);
      return {
        id: doc.id,
        business_id: data.businessId || data.business_id,
        customer_id: data.customerId || data.customer_id,
        customer,
        mode: data.mode || 'AI',
        status: data.status || 'active',
        unread_count: data.unreadCount ?? data.unread_count ?? 0,
        last_message: data.lastMessage || data.last_message || '',
        last_message_at: data.lastMessageAt || data.last_message_at || new Date().toISOString(),
        created_at: data.createdAt || data.created_at || new Date().toISOString(),
        updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    }

    const conv = this.mem.conversations.find((c) => c.id === id);
    if (!conv) return undefined;
    return {
      ...conv,
      customer: this.mem.customers.find((cust) => cust.id === conv.customer_id)
    };
  }

  public async findConversationByCustomer(businessId: string, customerId: string): Promise<Conversation | undefined> {
    if (!businessId || !customerId) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.CONVERSATIONS)
        .where('businessId', '==', businessId)
        .where('customerId', '==', customerId)
        .limit(1)
        .get();
      if (snap.empty) return undefined;
      return this.getConversationById(snap.docs[0].id);
    }

    return this.mem.conversations.find((c) => c.business_id === businessId && c.customer_id === customerId);
  }

  public async createConversation(conv: Conversation): Promise<Conversation> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      await firestore!.collection(COLLECTIONS.CONVERSATIONS).doc(conv.id).set({
        id: conv.id,
        businessId: conv.business_id, // tenant isolation
        customerId: conv.customer_id,
        mode: conv.mode,
        status: conv.status,
        unreadCount: conv.unread_count,
        lastMessage: conv.last_message,
        lastMessageAt: conv.last_message_at,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at
      });
      return (await this.getConversationById(conv.id))!;
    }

    this.mem.conversations.push(conv);
    return conv;
  }

  public async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation | undefined> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const docRef = firestore!.collection(COLLECTIONS.CONVERSATIONS).doc(id);
      const existing = await docRef.get();
      if (!existing.exists) return undefined;

      const firestoreUpdates: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (updates.mode !== undefined) firestoreUpdates.mode = updates.mode;
      if (updates.status !== undefined) firestoreUpdates.status = updates.status;
      if (updates.unread_count !== undefined) firestoreUpdates.unreadCount = updates.unread_count;
      if (updates.last_message !== undefined) firestoreUpdates.lastMessage = updates.last_message;
      if (updates.last_message_at !== undefined) firestoreUpdates.lastMessageAt = updates.last_message_at;

      await docRef.update(firestoreUpdates);
      return this.getConversationById(id);
    }

    const idx = this.mem.conversations.findIndex((c) => c.id === id);
    if (idx === -1) return undefined;
    this.mem.conversations[idx] = {
      ...this.mem.conversations[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    return this.getConversationById(id);
  }

  // --- Messages ---
  public async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    if (!conversationId) return [];
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.MESSAGES)
        .where('conversationId', '==', conversationId)
        .get();

      const msgs = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          conversation_id: data.conversationId || data.conversation_id,
          business_id: data.businessId || data.business_id,
          customer_id: data.customerId || data.customer_id,
          sender_type: data.senderType || data.sender_type,
          body: data.body,
          wa_message_id: data.waMessageId || data.wa_message_id,
          status: data.status,
          created_at: data.createdAt || data.created_at || new Date().toISOString()
        } as Message;
      });

      return msgs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return this.mem.messages
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  public async createMessage(message: Message): Promise<Message> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      await firestore!.collection(COLLECTIONS.MESSAGES).doc(message.id).set({
        id: message.id,
        conversationId: message.conversation_id,
        businessId: message.business_id, // tenant isolation
        customerId: message.customer_id,
        senderType: message.sender_type,
        body: message.body,
        waMessageId: message.wa_message_id || null,
        status: message.status,
        createdAt: message.created_at
      });
      return message;
    }

    this.mem.messages.push(message);
    return message;
  }

  public async findMessageByWaId(waMessageId: string): Promise<Message | undefined> {
    if (!waMessageId) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.MESSAGES)
        .where('waMessageId', '==', waMessageId)
        .limit(1)
        .get();
      if (snap.empty) return undefined;
      const doc = snap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        conversation_id: data.conversationId || data.conversation_id,
        business_id: data.businessId || data.business_id,
        customer_id: data.customerId || data.customer_id,
        sender_type: data.senderType || data.sender_type,
        body: data.body,
        wa_message_id: data.waMessageId || data.wa_message_id,
        status: data.status,
        created_at: data.createdAt || data.created_at || new Date().toISOString()
      };
    }

    return this.mem.messages.find((m) => m.wa_message_id === waMessageId);
  }

  // --- Leads ---
  public async getLeadsByBusinessId(businessId: string): Promise<Lead[]> {
    if (!businessId) return [];
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.LEADS)
        .where('businessId', '==', businessId)
        .get();

      const leads = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          business_id: data.businessId || data.business_id,
          customer_id: data.customerId || data.customer_id,
          conversation_id: data.conversationId || data.conversation_id,
          customer_name: data.customerName || data.customer_name,
          wa_number: data.waNumber || data.wa_number,
          status: data.status,
          source: data.source,
          created_at: data.createdAt || data.created_at || new Date().toISOString(),
          updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
        } as Lead;
      });

      return leads.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    return this.mem.leads
      .filter((l) => l.business_id === businessId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  public async getLeadById(id: string): Promise<Lead | undefined> {
    if (!id) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const doc = await firestore!.collection(COLLECTIONS.LEADS).doc(id).get();
      if (!doc.exists) return undefined;
      const data = doc.data()!;
      return {
        id: doc.id,
        business_id: data.businessId || data.business_id,
        customer_id: data.customerId || data.customer_id,
        conversation_id: data.conversationId || data.conversation_id,
        customer_name: data.customerName || data.customer_name,
        wa_number: data.waNumber || data.wa_number,
        status: data.status,
        source: data.source,
        created_at: data.createdAt || data.created_at || new Date().toISOString(),
        updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    }

    return this.mem.leads.find((l) => l.id === id);
  }

  public async findLeadByCustomer(businessId: string, customerId: string): Promise<Lead | undefined> {
    if (!businessId || !customerId) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.LEADS)
        .where('businessId', '==', businessId)
        .where('customerId', '==', customerId)
        .limit(1)
        .get();
      if (snap.empty) return undefined;
      const doc = snap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        business_id: data.businessId || data.business_id,
        customer_id: data.customerId || data.customer_id,
        conversation_id: data.conversationId || data.conversation_id,
        customer_name: data.customerName || data.customer_name,
        wa_number: data.waNumber || data.wa_number,
        status: data.status,
        source: data.source,
        created_at: data.createdAt || data.created_at || new Date().toISOString(),
        updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    }

    return this.mem.leads.find((l) => l.business_id === businessId && l.customer_id === customerId);
  }

  public async createLead(lead: Lead): Promise<Lead> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      await firestore!.collection(COLLECTIONS.LEADS).doc(lead.id).set({
        id: lead.id,
        businessId: lead.business_id, // tenant isolation
        customerId: lead.customer_id,
        conversationId: lead.conversation_id,
        customerName: lead.customer_name,
        waNumber: lead.wa_number,
        status: lead.status,
        source: lead.source,
        createdAt: lead.created_at,
        updatedAt: lead.updated_at
      });
      return lead;
    }

    this.mem.leads.push(lead);
    return lead;
  }

  public async updateLeadStatus(id: string, status: LeadStatus): Promise<Lead | undefined> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const docRef = firestore!.collection(COLLECTIONS.LEADS).doc(id);
      const existing = await docRef.get();
      if (!existing.exists) return undefined;

      await docRef.update({
        status,
        updatedAt: new Date().toISOString()
      });

      return this.getLeadById(id);
    }

    const idx = this.mem.leads.findIndex((l) => l.id === id);
    if (idx === -1) return undefined;
    this.mem.leads[idx] = {
      ...this.mem.leads[idx],
      status,
      updated_at: new Date().toISOString()
    };
    return this.mem.leads[idx];
  }

  // --- Templates ---
  public async getTemplatesByBusinessId(businessId: string): Promise<any[]> {
    if (!businessId) return [];
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.TEMPLATES)
        .where('businessId', '==', businessId)
        .get();

      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          business_id: data.businessId || data.business_id,
          name: data.name,
          category: data.category,
          language: data.language || 'en_US',
          status: data.status || 'APPROVED',
          meta_template_id: data.metaTemplateId || data.meta_template_id || '',
          header_text: data.headerText || data.header_text || '',
          body_text: data.bodyText || data.body_text || '',
          footer_text: data.footerText || data.footer_text || '',
          created_at: data.createdAt || data.created_at || new Date().toISOString(),
          updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
        };
      });
    }

    return (this.mem as any).templates?.filter((t: any) => t.business_id === businessId) || [];
  }

  public async createTemplate(template: any): Promise<any> {
    this.ensureDatabaseReady();
    const now = new Date().toISOString();
    const docId = template.id || `tmpl_${Date.now()}`;

    if (this.isUsingFirestore()) {
      await firestore!.collection(COLLECTIONS.TEMPLATES).doc(docId).set({
        id: docId,
        businessId: template.business_id, // tenant isolation
        name: template.name,
        category: template.category || 'UTILITY',
        language: template.language || 'en_US',
        status: template.status || 'APPROVED',
        metaTemplateId: template.meta_template_id || '',
        headerText: template.header_text || '',
        bodyText: template.body_text || '',
        footerText: template.footer_text || '',
        createdAt: template.created_at || now,
        updatedAt: template.updated_at || now
      });
      return { ...template, id: docId };
    }

    if (!(this.mem as any).templates) (this.mem as any).templates = [];
    const newTmpl = { ...template, id: docId, created_at: now, updated_at: now };
    (this.mem as any).templates.push(newTmpl);
    return newTmpl;
  }

  public async deleteTemplate(id: string, businessId: string): Promise<boolean> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      await firestore!.collection(COLLECTIONS.TEMPLATES).doc(id).delete();
      return true;
    }

    if ((this.mem as any).templates) {
      (this.mem as any).templates = (this.mem as any).templates.filter((t: any) => t.id !== id);
    }
    return true;
  }

  // --- Safety Settings ---
  public async getSafetySettingsByBusinessId(businessId: string): Promise<any | undefined> {
    if (!businessId) return undefined;
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.SAFETY_SETTINGS)
        .where('businessId', '==', businessId)
        .limit(1)
        .get();
      if (snap.empty) return undefined;
      const doc = snap.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        business_id: data.businessId || data.business_id,
        ai_enabled: data.aiEnabled ?? data.ai_enabled ?? true,
        human_takeover_on_opt_out: data.humanTakeoverOnOptOut ?? data.human_takeover_on_opt_out ?? true,
        max_ai_replies_per_conversation: data.maxAiRepliesPerConversation ?? data.max_ai_replies_per_conversation ?? 15,
        enforce_24h_window: data.enforce24hWindow ?? data.enforce_24h_window ?? true,
        auto_opt_out_keywords: data.autoOptOutKeywords || data.auto_opt_out_keywords || ['STOP', 'UNSUBSCRIBE', 'REMOVE ME', 'DO NOT MESSAGE', 'NO MORE MESSAGES'],
        safety_pause_on_error_threshold: data.safetyPauseOnErrorThreshold ?? data.safety_pause_on_error_threshold ?? 5,
        created_at: data.createdAt || data.created_at || new Date().toISOString(),
        updated_at: data.updatedAt || data.updated_at || new Date().toISOString()
      };
    }

    return (this.mem as any).safetySettings?.find((s: any) => s.business_id === businessId);
  }

  public async upsertSafetySettings(settings: any): Promise<any> {
    this.ensureDatabaseReady();
    const now = new Date().toISOString();
    const docId = settings.id || `safety_${settings.business_id}`;

    if (this.isUsingFirestore()) {
      await firestore!.collection(COLLECTIONS.SAFETY_SETTINGS).doc(docId).set(
        {
          id: docId,
          businessId: settings.business_id, // tenant isolation
          aiEnabled: settings.ai_enabled ?? true,
          humanTakeoverOnOptOut: settings.human_takeover_on_opt_out ?? true,
          maxAiRepliesPerConversation: settings.max_ai_replies_per_conversation ?? 15,
          enforce24hWindow: settings.enforce_24h_window ?? true,
          autoOptOutKeywords: settings.auto_opt_out_keywords || ['STOP', 'UNSUBSCRIBE', 'REMOVE ME', 'DO NOT MESSAGE', 'NO MORE MESSAGES'],
          safetyPauseOnErrorThreshold: settings.safety_pause_on_error_threshold ?? 5,
          createdAt: settings.created_at || now,
          updatedAt: now
        },
        { merge: true }
      );
      return (await this.getSafetySettingsByBusinessId(settings.business_id))!;
    }

    if (!(this.mem as any).safetySettings) (this.mem as any).safetySettings = [];
    const idx = (this.mem as any).safetySettings.findIndex((s: any) => s.business_id === settings.business_id);
    if (idx !== -1) {
      (this.mem as any).safetySettings[idx] = { ...(this.mem as any).safetySettings[idx], ...settings, updated_at: now };
    } else {
      (this.mem as any).safetySettings.push({ ...settings, id: docId, created_at: now, updated_at: now });
    }
    return (await this.getSafetySettingsByBusinessId(settings.business_id))!;
  }

  // --- Admin Audit Logs ---
  public async createAdminAuditLog(log: any): Promise<any> {
    this.ensureDatabaseReady();
    const now = new Date().toISOString();
    const docId = log.id || `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    if (this.isUsingFirestore()) {
      await firestore!.collection(COLLECTIONS.ADMIN_AUDIT_LOGS).doc(docId).set({
        id: docId,
        adminId: log.admin_id,
        adminEmail: log.admin_email,
        action: log.action,
        targetBusinessId: log.target_business_id,
        targetBusinessName: log.target_business_name || '',
        details: log.details || '',
        timestamp: log.timestamp || now
      });
      return { ...log, id: docId, timestamp: now };
    }

    if (!(this.mem as any).adminAuditLogs) (this.mem as any).adminAuditLogs = [];
    const entry = { ...log, id: docId, timestamp: now };
    (this.mem as any).adminAuditLogs.push(entry);
    return entry;
  }

  public async getAdminAuditLogs(): Promise<any[]> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!.collection(COLLECTIONS.ADMIN_AUDIT_LOGS).get();
      return snap.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            admin_id: data.adminId || data.admin_id,
            admin_email: data.adminEmail || data.admin_email,
            action: data.action,
            target_business_id: data.targetBusinessId || data.target_business_id,
            target_business_name: data.targetBusinessName || data.target_business_name || '',
            details: data.details || '',
            timestamp: data.timestamp || new Date().toISOString()
          };
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return ((this.mem as any).adminAuditLogs || []).sort(
      (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // --- Global / Business Messages ---
  public async getMessagesByBusinessId(businessId: string): Promise<Message[]> {
    if (!businessId) return [];
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!
        .collection(COLLECTIONS.MESSAGES)
        .where('businessId', '==', businessId)
        .get();

      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          conversation_id: data.conversationId || data.conversation_id,
          business_id: data.businessId || data.business_id,
          customer_id: data.customerId || data.customer_id,
          sender_type: data.senderType || data.sender_type,
          body: data.body,
          wa_message_id: data.waMessageId || data.wa_message_id,
          status: data.status,
          is_template: data.isTemplate || data.is_template || false,
          template_name: data.templateName || data.template_name || '',
          created_at: data.createdAt || data.created_at || new Date().toISOString()
        } as Message;
      });
    }

    return this.mem.messages.filter((m) => m.business_id === businessId);
  }

  public async getAllMessages(): Promise<Message[]> {
    this.ensureDatabaseReady();

    if (this.isUsingFirestore()) {
      const snap = await firestore!.collection(COLLECTIONS.MESSAGES).get();
      return snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          conversation_id: data.conversationId || data.conversation_id,
          business_id: data.businessId || data.business_id,
          customer_id: data.customerId || data.customer_id,
          sender_type: data.senderType || data.sender_type,
          body: data.body,
          wa_message_id: data.waMessageId || data.wa_message_id,
          status: data.status,
          is_template: data.isTemplate || data.is_template || false,
          template_name: data.templateName || data.template_name || '',
          created_at: data.createdAt || data.created_at || new Date().toISOString()
        } as Message;
      });
    }

    return [...this.mem.messages];
  }
}

export const db = new FirestoreDatabase();
