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
  const adminEmail = (process.env.PERSONAL_ADMIN_EMAIL || process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  if (adminEmail) {
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
      console.warn('⚠️ Could not fetch personal user from DB:', err);
    }
  }

  // Fallback personal admin user object
  return {
    id: 'user_personal_mode',
    email: adminEmail || 'personal@fishcatch.local',
    name: 'Personal Admin',
    role: 'admin',
    business_id: 'bus_personal_mode',
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

// Seed default platform admin if environment variables are provided
export async function initAdminUser() {
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    // No hard-coded credentials; only seed if explicitly configured via environment variables
    return;
  }

  try {
    const existing = await db.findUserByEmail(adminEmail);
    if (!existing) {
      const userId = `user_admin_${Buffer.from(adminEmail).toString('hex').slice(0, 12)}`;
      const businessId = `bus_admin_${Buffer.from(adminEmail).toString('hex').slice(0, 12)}`;
      const passwordHash = await hashPassword(adminPassword);

      const adminUser: User = {
        id: userId,
        email: adminEmail,
        name: process.env.INITIAL_ADMIN_NAME || 'Platform Admin',
        role: 'admin',
        business_id: businessId,
        created_at: new Date().toISOString()
      };

      await db.createUser(adminUser, passwordHash);

      await db.createBusiness({
        id: businessId,
        user_id: userId,
        name: `${process.env.INITIAL_ADMIN_NAME || 'Platform Admin'} HQ`,
        description: 'Platform management and global operations',
        products_services: 'Fishcatch Lead Management SaaS',
        prices: 'Custom',
        faqs: 'Q: What is Fishcatch? A: Official WhatsApp AI lead handling platform.',
        business_hours: '24/7 Global',
        location: 'Global Cloud',
        contact_info: adminEmail,
        additional_info: 'Platform owner organization account.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      await db.upsertAISettings({
        id: `ai_${businessId}`,
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

      console.log(`✅ Configured platform admin from environment: ${adminEmail}`);
    }
  } catch (err: any) {
    console.error('⚠️ Warning: initAdminUser skipped due to error:', err?.message || err);
  }
}
