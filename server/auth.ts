import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { Customer, StaffUser, UserRole } from '../src/types';

const SECRET = process.env.SESSION_SECRET || 'cruze_ultra_secure_session_token_key_2026';

export interface TokenPayload {
  id: string;
  role: UserRole;
  username: string;
  email?: string;
  exp: number;
}

export function generateToken(payload: Omit<TokenPayload, 'exp'>, expiresInHours = 72): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Date.now() + expiresInHours * 60 * 60 * 1000,
  };
  const str = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SECRET).update(str).digest('base64url');
  return `${str}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload: TokenPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  customer?: Customer;
  staffUser?: StaffUser;
  adminUsername?: string;
}

export function requireCustomerAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Customer login required' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || payload.role !== 'customer') {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  const customer = storage.getCustomerById(payload.id);
  if (!customer) {
    return res.status(401).json({ error: 'Customer account not found' });
  }

  if (customer.status === 'deactivated') {
    return res.status(403).json({ error: 'Account has been deactivated. Please contact support.' });
  }

  const { passwordHash, salt, ...safeCustomer } = customer as any;
  req.customer = safeCustomer;
  next();
}

export function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || payload.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin privilege required' });
  }

  const staff = storage.getStaffUserByUsername(payload.username);
  if (!staff || staff.role !== 'admin') {
    return res.status(403).json({ error: 'Invalid admin credentials' });
  }

  req.staffUser = staff;
  req.adminUsername = staff.username;
  next();
}

export function requireChefAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Chef authentication required' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || (payload.role !== 'chef' && payload.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden: Chef privilege required' });
  }

  const staff = storage.getStaffUserByUsername(payload.username);
  if (!staff || (staff.role !== 'chef' && staff.role !== 'admin')) {
    return res.status(403).json({ error: 'Invalid chef credentials' });
  }

  req.staffUser = staff;
  next();
}

export function requireDeliveryAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Delivery authentication required' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || (payload.role !== 'delivery' && payload.role !== 'admin')) {
    return res.status(403).json({ error: 'Forbidden: Delivery privilege required' });
  }

  const staff = storage.getStaffUserByUsername(payload.username);
  if (!staff || (staff.role !== 'delivery' && staff.role !== 'admin')) {
    return res.status(403).json({ error: 'Invalid delivery credentials' });
  }

  req.staffUser = staff;
  next();
}
