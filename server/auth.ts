import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { User, Role } from '../src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fishcatch_super_secret_jwt_key_2026';

export function isPersonalMode(): boolean {
  // Only enable personal single-user mode if explicitly configured
  return process.env.PERSONAL_MODE === 'true';
}

export async function getPersonalUser(): Promise<User> {
  const adminEmail = 'admin@fishcatch.io';
  try {
    let user = await db.findUserByEmail(adminEmail);
    if (!user) {
      await initAdminUser();
      user = await db.findUserByEmail(adminEmail);
    }
    if (user) {
      return user;
    }
  } catch (err) {
    console.warn('⚠️ Could not fetch personal user from DB, using fallback user object:', err);
  }

  // Fallback personal admin user object
  return {
    id: 'user_admin_platform',
    email: 'admin@fishcatch.io',
    name: 'Fishcatch Personal Admin',
    role: 'admin',
    business_id: 'bus_admin_platform',
    created_at: new Date().toISOString()
  };
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      business_id: user.business_id
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export async function resolveAuthenticatedUser(req: any): Promise<User | null> {
  if (req?.user) return req.user;

  let authHeader = req?.headers?.authorization || req?.headers?.Authorization;
  if (!authHeader && typeof req?.headers?.get === 'function') {
    authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  }

  const token = authHeader && typeof authHeader === 'string' ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded?.id) {
        const user = await db.findUserById(decoded.id);
        if (user) {
          req.user = user;
          return user;
        }
      }
    } catch (err) {
      // Invalid/expired token; proceed to check if personal mode applies
    }
  }

  if (isPersonalMode()) {
    try {
      const personalUser = await getPersonalUser();
      req.user = personalUser;
      return personalUser;
    } catch (err) {
      console.error('Error resolving personal user:', err);
    }
  }

  return null;
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const user = await resolveAuthenticatedUser(req);
  if (user) {
    req.user = user;
    return next();
  }
  return res.status(401).json({ error: 'Authentication token required' });
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Platform Admin privileges required' });
  }
  next();
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Seed default platform admin if not exists
export async function initAdminUser() {
  try {
    const adminEmail = 'admin@fishcatch.io';
    const existing = await db.findUserByEmail(adminEmail);
    if (!existing) {
      const userId = 'user_admin_platform';
      const businessId = 'bus_admin_platform';
      const passwordHash = await hashPassword('admin123');

      const adminUser: User = {
        id: userId,
        email: adminEmail,
        name: 'Fishcatch Admin',
        role: 'admin',
        business_id: businessId,
        created_at: new Date().toISOString()
      };

      await db.createUser(adminUser, passwordHash);

      await db.createBusiness({
        id: businessId,
        user_id: userId,
        name: 'Fishcatch Admin HQ',
        description: 'Platform management and global operations',
        products_services: 'Fishcatch Lead Management SaaS',
        prices: '$49/mo Starter, $149/mo Pro',
        faqs: 'Q: What is Fishcatch? A: Official WhatsApp AI lead handling platform.',
        business_hours: '24/7 Global',
        location: 'San Francisco / Global Cloud',
        contact_info: 'support@fishcatch.io',
        additional_info: 'Platform owner organization account.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await db.upsertAISettings({
        id: 'ai_admin_platform',
        business_id: businessId,
        enabled: true,
        agent_name: 'Fishcatch Admin AI',
        system_instructions: 'You are Fishcatch platform support AI.',
        tone: 'Professional & Helpful',
        language_preference: 'English',
        human_handoff_rules: 'Handoff on billing or technical platform errors.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await db.upsertWhatsAppConnection({
        id: 'wa_admin_platform',
        business_id: businessId,
        meta_app_id: '',
        waba_id: '',
        phone_number_id: '',
        phone_number: '',
        display_name: 'Fishcatch Admin',
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

      console.log('✅ Seeded default platform admin: admin@fishcatch.io / admin123');
    }
  } catch (err) {
    console.error('⚠️ Warning: initAdminUser skipped due to initialization error:', err);
  }
}
