import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'node:path';
import fs from 'node:fs';

import { storage, verifyPassword, hashPassword } from './server/storage';
import { calculateHaversineDistanceKm, formatDistanceDisplay } from './src/utils/distance';
import {
  generateToken,
  requireCustomerAuth,
  requireAdminAuth,
  requireChefAuth,
  requireDeliveryAuth,
  AuthenticatedRequest,
  verifyToken,
} from './server/auth';
import { Order, OrderStatus, ChefStatus, DeliveryStatus } from './src/types';
import {
  getRazorpayClient,
  getRazorpayKeyId,
  isRazorpayConfigured,
  getMissingRazorpayVars,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from './server/razorpay';

// Real-time Server-Sent Events (SSE) Client Registry
interface SSEClient {
  id: string;
  res: Response;
  role?: string;
}
const sseClients: Map<string, SSEClient> = new Map();

export function broadcastEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [id, client] of sseClients.entries()) {
    try {
      client.res.write(payload);
    } catch {
      sseClients.delete(id);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Initialize persistent database storage
  await storage.initStorage();

  // Middlewares - capture rawBody for Razorpay webhook HMAC verification
  app.use(
    express.json({
      limit: '15mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf-8');
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // CORS and API Header Security
  app.use((req: Request, res: Response, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Ensure uploads directory exists
  const UPLOADS_DIR = path.join(process.cwd(), 'data', 'uploads');
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Health check
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      restaurant: 'Kitchen Cruze',
      version: '1.0.0',
      database: storage.getDatabaseStatus(),
      timestamp: new Date().toISOString(),
    });
  });

  // Database status endpoint
  app.get('/api/database/status', (req: Request, res: Response) => {
    res.json(storage.getDatabaseStatus());
  });

  // --------------------------------------------------------------------------
  // REAL-TIME SERVER-SENT EVENTS (SSE)
  // --------------------------------------------------------------------------
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = 'sse-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    sseClients.set(clientId, { id: clientId, res });

    // Send initial handshake
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch {
        clearInterval(heartbeat);
        sseClients.delete(clientId);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(clientId);
    });
  });

  // --------------------------------------------------------------------------
  // IMAGE UPLOAD & FILE MANAGER API
  // --------------------------------------------------------------------------
  app.get('/api/uploads', (req: Request, res: Response) => {
    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        return res.json([]);
      }
      const files = fs.readdirSync(UPLOADS_DIR);
      const items = files
        .filter((f) => !f.startsWith('.'))
        .map((filename) => {
          const fullPath = path.join(UPLOADS_DIR, filename);
          const stat = fs.statSync(fullPath);
          return {
            filename,
            url: `/uploads/${filename}`,
            size: stat.size,
            createdAt: stat.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/upload', (req: Request, res: Response) => {
    try {
      const { dataUrl, filename } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: 'dataUrl is required' });
      }

      // Check format
      const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: 'Invalid base64 Data URL format' });
      }

      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], 'base64');

      // Max 10MB
      if (buffer.length > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image size exceeds 10MB limit' });
      }

      let extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
      if (extension.includes('svg')) extension = 'svg';
      if (extension.includes('webp')) extension = 'webp';

      const cleanBase = typeof filename === 'string' && filename.length > 0
        ? filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25)
        : 'dish';

      const safeName = `${cleanBase}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${extension}`;
      const filePath = path.join(UPLOADS_DIR, safeName);

      fs.writeFileSync(filePath, buffer);
      res.json({
        url: `/uploads/${safeName}`,
        filename: safeName,
        size: buffer.length,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/uploads/:filename', (req: Request, res: Response) => {
    try {
      const filename = path.basename(req.params.filename);
      const target = path.join(UPLOADS_DIR, filename);
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
      res.json({ success: true, filename });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // RESTAURANT SETTINGS API
  // --------------------------------------------------------------------------
  app.get('/api/settings', (req: Request, res: Response) => {
    try {
      const settings = storage.getSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/settings', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.updateSettings(req.body);
      storage.addAuditLog(req.adminUsername || 'Admin', 'admin', 'SETTINGS_UPDATED', 'Updated restaurant configuration');
      broadcastEvent('SETTINGS_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/settings/payments', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.updateSettings({ payments: req.body });
      storage.addAuditLog(req.adminUsername || 'Admin', 'admin', 'PAYMENT_SETTINGS_UPDATED', 'Updated payment methods and gateway details');
      broadcastEvent('SETTINGS_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/settings/address', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { address, location } = req.body;
      const targetAddress = (address || location?.address || '').trim();
      if (!targetAddress) {
        return res.status(400).json({ error: 'Restaurant address cannot be empty' });
      }

      const currentSettings = storage.getSettings();
      const updated = storage.updateSettings({
        address: targetAddress,
        location: {
          ...(currentSettings.location || {}),
          ...(location || {}),
          address: targetAddress,
        },
      });

      storage.addAuditLog(
        req.adminUsername || 'Admin',
        'admin',
        'RESTAURANT_ADDRESS_UPDATED',
        `Changed restaurant physical address to: ${targetAddress}`
      );
      broadcastEvent('SETTINGS_UPDATE', updated);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // STAFF AUTHENTICATION (ADMIN, CHEF, DELIVERY)
  // --------------------------------------------------------------------------
  app.post('/api/staff/login', (req: Request, res: Response) => {
    try {
      const { username, password, expectedRole } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const staff = storage.getStaffUserByUsername(username);
      if (!staff) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (expectedRole && staff.role !== expectedRole) {
        return res.status(403).json({ error: `Unauthorized for ${expectedRole} portal` });
      }

      const isMatch = verifyPassword(password, staff.passwordHash, staff.salt);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken({
        id: staff.id,
        role: staff.role,
        username: staff.username,
        email: staff.email,
      });

      storage.addAuditLog(staff.username, staff.role, 'STAFF_LOGIN', `Logged into ${staff.role} dashboard`);

      res.json({
        token,
        user: {
          id: staff.id,
          username: staff.username,
          role: staff.role,
          name: staff.name,
          email: staff.email,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Change Password API (Permanently Locked for Admin)
  app.post('/api/admin/change-password', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    return res.status(403).json({
      error: 'Admin credentials (Kitchencruze12) are permanent and locked for security. Cannot be modified.',
    });
  });

  // Admin View Staff Accounts
  app.get('/api/admin/staff', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    try {
      const staff = storage.getAllStaffUsers();
      res.json(staff);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Update Chef or Delivery Credentials
  app.put('/api/admin/staff/:role', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { role } = req.params;
      const { username, password } = req.body;

      if (role === 'admin') {
        return res.status(403).json({
          error: 'Admin credentials (Kitchencruze12) are permanent and locked for security. Cannot be modified.',
        });
      }

      if (role !== 'chef' && role !== 'delivery') {
        return res.status(400).json({
          error: 'Invalid role. Only chef and delivery credentials can be updated.',
        });
      }

      const result = storage.updateStaffCredentials(role as 'chef' | 'delivery', username, password);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, message: `Successfully updated ${role} credentials` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // CUSTOMER AUTHENTICATION & PROFILE
  // --------------------------------------------------------------------------
  app.post('/api/customer/register', (req: Request, res: Response) => {
    try {
      const { fullName, username, email, phone, password, confirmPassword, initialAddress, preferredLanguage } = req.body;
      if (!fullName || !username || !email || !phone || !password) {
        return res.status(400).json({ error: 'Full name, username, email, phone, and password are required' });
      }
      if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }

      const existing = storage.getCustomerByEmailOrUsername(email) || storage.getCustomerByEmailOrUsername(username);
      if (existing) {
        return res.status(409).json({ error: 'A customer account with that email or username already exists' });
      }

      const customer = storage.createCustomer({
        fullName,
        username,
        email,
        phone,
        password,
        preferredLanguage,
        initialAddress,
      });

      const token = generateToken({
        id: customer.id,
        role: 'customer',
        username: customer.username,
        email: customer.email,
      });

      res.status(201).json({ token, customer });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customer/login', (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ error: 'Username/Email/Phone and password are required' });
      }

      const customer = storage.getCustomerByEmailOrUsername(identifier);
      if (!customer) {
        return res.status(401).json({ error: 'Invalid login credentials' });
      }

      if (customer.status === 'deactivated') {
        return res.status(403).json({ error: 'Account has been deactivated. Please contact support.' });
      }

      const isMatch = verifyPassword(password, customer.passwordHash, customer.salt);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid login credentials' });
      }

      const token = generateToken({
        id: customer.id,
        role: 'customer',
        username: customer.username,
        email: customer.email,
      });

      const { passwordHash, salt, ...safe } = customer;
      res.json({ token, customer: safe });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/customer/me', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json(req.customer);
  });

  app.put('/api/customer/profile', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.updateCustomer(req.customer!.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customer/addresses', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const current = storage.getCustomerById(req.customer!.id);
      if (!current) return res.status(404).json({ error: 'Customer not found' });

      const newAddress = {
        id: 'addr-' + Date.now(),
        ...req.body,
      };

      const updatedList = [...current.savedAddresses, newAddress];
      const updated = storage.updateCustomer(current.id, { savedAddresses: updatedList });
      res.json(updated?.savedAddresses);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/customer/addresses/:id', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const current = storage.getCustomerById(req.customer!.id);
      if (!current) return res.status(404).json({ error: 'Customer not found' });

      const filtered = current.savedAddresses.filter((a) => a.id !== req.params.id);
      const updated = storage.updateCustomer(current.id, { savedAddresses: filtered });
      res.json(updated?.savedAddresses);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // CATEGORIES API
  // --------------------------------------------------------------------------
  app.get('/api/categories', (req: Request, res: Response) => {
    try {
      const categories = storage.getCategories();
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/categories', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const categories = storage.getCategories();
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/categories', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const cat = storage.addCategory(req.body);
      broadcastEvent('CATEGORY_UPDATE', cat);
      res.status(201).json(cat);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/categories/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.updateCategory(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Category not found' });
      broadcastEvent('CATEGORY_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/categories/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = storage.deleteCategory(req.params.id);
      if (!success) return res.status(404).json({ error: 'Category not found' });
      broadcastEvent('CATEGORY_DELETE', { id: req.params.id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/categories-reorder', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderedIds } = req.body;
      const result = storage.reorderCategories(orderedIds);
      broadcastEvent('CATEGORIES_REORDERED', result);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // PRODUCTS API
  // --------------------------------------------------------------------------
  app.get('/api/products', (req: Request, res: Response) => {
    try {
      const products = storage.getProducts();
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/products', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const products = storage.getProducts();
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/products/:id', (req: Request, res: Response) => {
    try {
      const product = storage.getProductById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Product not found' });
      res.json(product);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/products', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const prod = storage.addProduct(req.body);
      storage.addAuditLog(req.adminUsername || 'Admin', 'admin', 'PRODUCT_CREATED', `Added product: ${prod.name}`);
      broadcastEvent('PRODUCT_UPDATE', prod);
      res.status(201).json(prod);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/products/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.updateProduct(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Product not found' });
      storage.addAuditLog(req.adminUsername || 'Admin', 'admin', 'PRODUCT_UPDATED', `Updated product: ${updated.name}`);
      broadcastEvent('PRODUCT_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/products/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = storage.deleteProduct(req.params.id);
      if (!success) return res.status(404).json({ error: 'Product not found' });
      storage.addAuditLog(req.adminUsername || 'Admin', 'admin', 'PRODUCT_DELETED', `Deleted product id: ${req.params.id}`);
      broadcastEvent('PRODUCT_DELETE', { id: req.params.id });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // OFFERS & COUPONS API
  // --------------------------------------------------------------------------
  app.get('/api/offers', (req: Request, res: Response) => {
    try {
      res.json(storage.getOffers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/offers/active', (req: Request, res: Response) => {
    try {
      res.json(storage.getActiveOffers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/offers', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const offer = storage.addOffer(req.body);
      res.status(201).json(offer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/offers/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.updateOffer(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Offer not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/offers/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = storage.deleteOffer(req.params.id);
      if (!success) return res.status(404).json({ error: 'Offer not found' });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // WISHLIST API
  // --------------------------------------------------------------------------
  app.get('/api/customer/wishlist', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const list = storage.getWishlist(req.customer!.id);
      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customer/wishlist/toggle', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { productId } = req.body;
      const isAdded = storage.toggleWishlist(req.customer!.id, productId);
      res.json({ added: isAdded, wishlist: storage.getWishlist(req.customer!.id) });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // CUSTOMER WALLET, REWARD COINS & CASHBACK API
  // --------------------------------------------------------------------------

  // 1. Get current customer wallet
  app.get('/api/customer/wallet', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const wallet = storage.getWallet(req.customer!.id);
      const rules = storage.getLoyaltySettings();
      res.json({
        wallet,
        rules,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Get wallet transaction ledger
  app.get('/api/customer/wallet/transactions', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const txs = storage.getWalletTransactions(req.customer!.id);
      res.json(txs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Initiate Wallet Top-up (Direct Razorpay Order Creation)
  app.post('/api/customer/wallet/topup/initiate', requireCustomerAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const amount = Number(req.body.amount);
      if (!amount || isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid top-up amount' });
      }

      const rules = storage.getLoyaltySettings();
      if (amount < (rules.minTopupAmount || 10)) {
        return res.status(400).json({ error: `Minimum top-up amount is ₹${rules.minTopupAmount || 10}` });
      }
      if (amount > (rules.maxTopupAmount || 10000)) {
        return res.status(400).json({ error: `Maximum top-up amount is ₹${rules.maxTopupAmount || 10000}` });
      }

      const razorpay = getRazorpayClient();
      if (!razorpay) {
        const missingVars = getMissingRazorpayVars();
        return res.status(503).json({
          error: `Razorpay payment gateway is not configured. Missing environment variable(s): ${missingVars.join(', ')}.`,
          code: 'RAZORPAY_NOT_CONFIGURED',
          missingVariables: missingVars,
        });
      }

      // Convert rupees into paise correctly: ₹100 = 10000 paise
      const amountPaise = Math.round(amount * 100);
      const topupId = `TOPUP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // Create genuine Razorpay Order using configured credentials
      const rzpOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: topupId,
        notes: {
          type: 'WALLET_TOPUP',
          topupId,
          customerId: req.customer!.id,
          customerEmail: req.customer!.email || '',
          customerPhone: req.customer!.phone || '',
          customerName: req.customer!.fullName || 'Customer',
          amount: String(amount),
        },
      });

      // Record pending PaymentTransaction in database
      storage.createPaymentTransaction({
        orderId: topupId,
        razorpayOrderId: rzpOrder.id,
        amount,
        amountPaise,
        currency: 'INR',
        paymentMethod: 'Razorpay',
        customerId: req.customer!.id,
        transactionType: 'WALLET_TOPUP',
        customerName: req.customer!.fullName,
        customerEmail: req.customer!.email,
        customerPhone: req.customer!.phone,
      });

      return res.json({
        success: true,
        topupId,
        amount,
        amountPaise,
        currency: 'INR',
        razorpayOrderId: rzpOrder.id,
        keyId: getRazorpayKeyId(),
        gatewayConfigured: true,
        customer: {
          name: req.customer!.fullName,
          email: req.customer!.email,
          contact: req.customer!.phone,
        },
      });
    } catch (err: any) {
      console.error('[Wallet Topup Initiate Error]:', err);
      res.status(500).json({ error: err.message || 'Failed to initiate wallet top-up with Razorpay' });
    }
  });

  // 4. Verify & Credit Wallet Top-up (Cryptographic HMAC Verification & Idempotent Credit)
  app.post('/api/customer/wallet/topup/verify', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        topupId,
        amount,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body;

      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ error: 'Valid top-up amount is required' });
      }

      // Mandatory cryptographic Razorpay parameters
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing required Razorpay payment verification parameters (order ID, payment ID, signature)',
        });
      }

      // Cryptographic signature verification using server-side key secret
      const isAuthentic = verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!isAuthentic) {
        console.warn(`[Wallet Security] Invalid Razorpay signature for top-up Order: ${razorpay_order_id}`);
        storage.updatePaymentTransaction(razorpay_order_id, {
          paymentStatus: 'FAILED',
          errorMessage: 'Payment signature mismatch during verification',
        });
        return res.status(400).json({
          success: false,
          error: 'Payment signature verification failed. Transaction was not completed.',
        });
      }

      // Validate payment transaction in storage if present
      const paymentTx = storage.getPaymentByRazorpayOrderId(razorpay_order_id);
      if (paymentTx) {
        // Enforce customer matches
        if (paymentTx.customerId && paymentTx.customerId !== req.customer!.id) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized: Payment order does not belong to authenticated customer',
          });
        }
        // Enforce amount matches
        if (Math.abs(paymentTx.amount - numAmount) > 0.01) {
          return res.status(400).json({
            success: false,
            error: `Payment amount mismatch: expected ₹${paymentTx.amount}, received ₹${numAmount}`,
          });
        }
      }

      // Credit wallet idempotently using razorpay_payment_id and razorpay_order_id
      const idempotencyKey = razorpay_order_id || topupId;
      const result = storage.topupWallet(
        req.customer!.id,
        numAmount,
        razorpay_payment_id,
        'Razorpay',
        idempotencyKey
      );

      // Update payment transaction record to PAID
      storage.updatePaymentTransaction(razorpay_order_id, {
        paymentStatus: 'PAID',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date().toISOString(),
      });

      broadcastEvent('WALLET_UPDATE', { customerId: req.customer!.id, wallet: result.wallet });

      return res.json({
        success: true,
        wallet: result.wallet,
        transaction: result.transaction,
        alreadyCredited: result.alreadyCredited || false,
        message: result.alreadyCredited
          ? `Top-up of ₹${numAmount} was already credited.`
          : `₹${numAmount} successfully added to your wallet!`,
      });
    } catch (err: any) {
      console.error('[Wallet Topup Verify Error]:', err);
      res.status(400).json({ error: err.message || 'Failed to verify wallet top-up' });
    }
  });

  // 5. Convert Reward Coins to Wallet Money
  app.post('/api/customer/wallet/convert-coins', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { coins } = req.body;
      const numCoins = Number(coins);
      if (!numCoins || numCoins <= 0) {
        return res.status(400).json({ error: 'Please enter a valid amount of coins to convert' });
      }

      const result = storage.convertCoinsToMoney(req.customer!.id, numCoins);

      broadcastEvent('WALLET_UPDATE', { customerId: req.customer!.id, wallet: result.wallet });

      res.json({
        success: true,
        coinsConverted: result.coinsConverted,
        moneyCredited: result.moneyCredited,
        wallet: result.wallet,
        transaction: result.transaction,
        message: `Converted ${result.coinsConverted} coins into ₹${result.moneyCredited} wallet money!`,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 6. Public / Customer Loyalty Rules & Active Campaigns
  app.get('/api/customer/loyalty/rules', (_req: Request, res: Response) => {
    try {
      const rules = storage.getLoyaltySettings();
      const campaigns = storage.getCashbackCampaigns().filter((c) => c.active);
      res.json({ rules, campaigns });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // ADMIN WALLET, LOYALTY & CASHBACK MANAGEMENT API
  // --------------------------------------------------------------------------

  // Admin: Get all customer wallets
  app.get('/api/admin/wallets', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    try {
      const wallets = storage.getAllWallets();
      res.json(wallets);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Get transactions for a customer or all
  app.get('/api/admin/wallets/transactions', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const customerId = req.query.customerId as string | undefined;
      const txs = storage.getWalletTransactions(customerId);
      res.json(txs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Get specific customer transactions
  app.get('/api/admin/wallets/:customerId/transactions', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const txs = storage.getWalletTransactions(req.params.customerId);
      res.json(txs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Manual Balance / Coin Adjustment with mandatory reason & audit record
  app.post('/api/admin/wallets/adjust', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { customerId, type, target, amount, reason } = req.body;
      if (!customerId || !type || !target || !amount || !reason) {
        return res.status(400).json({
          error: 'Missing required parameters: customerId, type (credit/debit), target (money/coins), amount, reason',
        });
      }

      const wallet = storage.adminAdjustWallet(
        customerId,
        type,
        target,
        Number(amount),
        reason,
        req.adminUsername || 'Admin'
      );

      broadcastEvent('WALLET_UPDATE', { customerId, wallet });

      res.json({
        success: true,
        wallet,
        message: `Successfully adjusted ${target} (${type} ${amount}) for customer ${customerId}`,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin: Get Loyalty Settings
  app.get('/api/admin/loyalty/settings', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(storage.getLoyaltySettings());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Update Loyalty Settings
  app.put('/api/admin/loyalty/settings', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.updateLoyaltySettings(req.body);
      broadcastEvent('LOYALTY_SETTINGS_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin: Get Cashback Campaigns
  app.get('/api/admin/cashback/campaigns', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(storage.getCashbackCampaigns());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Create Cashback Campaign
  app.post('/api/admin/cashback/campaigns', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = storage.createCashbackCampaign(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin: Update Cashback Campaign
  app.put('/api/admin/cashback/campaigns/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.updateCashbackCampaign(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Campaign not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin: Delete Cashback Campaign
  app.delete('/api/admin/cashback/campaigns/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const deleted = storage.deleteCashbackCampaign(req.params.id);
      res.json({ success: deleted });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Wallet Liabilities & Statistics Overview
  app.get('/api/admin/wallets/stats', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    try {
      const wallets = storage.getAllWallets();
      const rules = storage.getLoyaltySettings();
      const txs = storage.getWalletTransactions();

      const totalBalanceCirculation = wallets.reduce((acc, w) => acc + (w.balance || 0), 0);
      const totalCoinsCirculation = wallets.reduce((acc, w) => acc + (w.coins || 0), 0);
      const coinLiabilityRupees = Math.round((totalCoinsCirculation / (rules.conversionRate || 10)) * 100) / 100;
      const totalMoneyAdded = wallets.reduce((acc, w) => acc + (w.totalMoneyAdded || 0), 0);
      const totalMoneySpent = wallets.reduce((acc, w) => acc + (w.totalMoneySpent || 0), 0);
      const totalCashbackEarned = wallets.reduce((acc, w) => acc + (w.totalCashbackEarned || 0), 0);

      res.json({
        totalCustomersWithWallets: wallets.length,
        totalBalanceCirculation: Number(totalBalanceCirculation.toFixed(2)),
        totalCoinsCirculation: Number(totalCoinsCirculation.toFixed(2)),
        coinLiabilityRupees,
        totalMoneyAdded: Number(totalMoneyAdded.toFixed(2)),
        totalMoneySpent: Number(totalMoneySpent.toFixed(2)),
        totalCashbackEarned: Number(totalCashbackEarned.toFixed(2)),
        totalTransactionsCount: txs.length,
        rules,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // REVIEWS API (Authentic, Permanent & Tamper-Proof Public Reviews)
  // --------------------------------------------------------------------------
  // 1. Get all public reviews for the store
  app.get('/api/reviews', (_req: Request, res: Response) => {
    try {
      const allRevs = storage.getAllReviews();
      res.json(allRevs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/products/:id/reviews', (req: Request, res: Response) => {
    try {
      const revs = storage.getReviewsByProductId(req.params.id);
      res.json(revs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/reviews/product/:id', (req: Request, res: Response) => {
    try {
      const revs = storage.getReviewsByProductId(req.params.id);
      res.json(revs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/reviews', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(storage.getAllReviews());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Submit a customer review (from the store home page or dish)
  app.post('/api/reviews', (req: Request, res: Response) => {
    try {
      const { customerName, productId, productName, orderId, rating, comment, photoUrl } = req.body;
      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5 || !comment || !comment.trim()) {
        return res.status(400).json({ error: 'Valid rating (1 to 5 stars) and review message are required' });
      }

      let customerId = 'guest-' + Date.now();
      let authorName = (customerName && customerName.trim()) || 'Verified Customer';

      // Detect authenticated customer if present
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const payload = verifyToken(authHeader.substring(7));
        if (payload && payload.role === 'customer') {
          const cust = storage.getCustomerById(payload.id);
          if (cust) {
            customerId = cust.id;
            authorName = cust.fullName || authorName;
          }
        }
      }

      const review = storage.addReview({
        customerId,
        customerName: authorName,
        productId: productId || 'restaurant-overall',
        productName: productName || 'Kitchen Cruze Dining Experience',
        orderId: orderId || '',
        rating: Math.round(numRating),
        comment: comment.trim(),
        photoUrl: photoUrl || undefined,
      });

      broadcastEvent('NEW_REVIEW', review);
      res.status(201).json({ success: true, review, message: 'Review submitted successfully!' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Locked: Customer reviews cannot be modified or deleted
  app.put('/api/admin/reviews/:id/status', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    return res.status(403).json({ error: 'Customer reviews cannot be modified once published.' });
  });

  app.delete('/api/admin/reviews/:id', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    return res.status(403).json({ error: 'Customer reviews cannot be deleted once published.' });
  });

  // --------------------------------------------------------------------------
  // DELIVERY CHARGE & RADIUS SECURE CALCULATION API
  // --------------------------------------------------------------------------
  app.post('/api/delivery/calculate', (req: Request, res: Response) => {
    try {
      const { subtotal, distanceKm: passedKm, customerLatitude, customerLongitude, totalWeightGrams } = req.body;
      const settings = storage.getSettings();
      const restLat = settings.location?.latitude ?? 19.0760;
      const restLng = settings.location?.longitude ?? 72.8777;
      const radiusKm = settings.deliveryRadiusKm || 5;

      let effectiveDistanceKm = Number(passedKm) || 0;
      if (
        customerLatitude !== undefined &&
        customerLongitude !== undefined &&
        !isNaN(Number(customerLatitude)) &&
        !isNaN(Number(customerLongitude))
      ) {
        effectiveDistanceKm = calculateHaversineDistanceKm(
          restLat,
          restLng,
          Number(customerLatitude),
          Number(customerLongitude)
        );
      } else if (effectiveDistanceKm <= 0) {
        effectiveDistanceKm = 2.0;
      }

      const isWithinRadius = effectiveDistanceKm <= radiusKm;
      const distanceDisplay = formatDistanceDisplay(effectiveDistanceKm);
      const calc = storage.calculateDeliveryCharge(
        Number(subtotal) || 0,
        effectiveDistanceKm,
        Number(totalWeightGrams) || 500
      );

      res.json({
        ...calc,
        distanceKm: effectiveDistanceKm,
        distanceMeters: Math.round(effectiveDistanceKm * 1000),
        distanceDisplay,
        radiusKm,
        isWithinRadius,
        restaurantLocation: settings.location,
        message: isWithinRadius ? undefined : 'Sorry, this delivery address is outside our delivery area.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // GEOLOCATION & REVERSE GEOCODING API
  // --------------------------------------------------------------------------
  app.get('/api/geocode/reverse', async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: 'Valid lat and lng query parameters required' });
      }

      // Try OpenStreetMap Nominatim with strict timeout
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const nomRes = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
          {
            headers: {
              'User-Agent': 'KitchenCruzeFoodDelivery/1.0 (contact@kitchencruze.com)',
              'Accept-Language': 'en',
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (nomRes.ok) {
          const data: any = await nomRes.json();
          const addr = data.address || {};
          const road = addr.road || addr.street || addr.pedestrian || addr.footway || '';
          const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.city_district || '';
          const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || '';
          const pincode = addr.postcode || '';
          const state = addr.state || '';

          // Format clean street address
          const streetParts = [road, suburb].filter(Boolean);
          const fullStreet = streetParts.length > 0 ? streetParts.join(', ') : (data.name || suburb || 'GPS Location');

          return res.json({
            success: true,
            formattedAddress: data.display_name || `${fullStreet}, ${city} ${pincode}`.trim(),
            street: fullStreet,
            suburb,
            city,
            pincode,
            state,
            lat,
            lng,
            provider: 'nominatim',
          });
        }
      } catch (err: any) {
        // Fall through to backup provider
      }

      // Backup: BigDataCloud Reverse Geocoding
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const bdcRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (bdcRes.ok) {
          const data: any = await bdcRes.json();
          const street = data.locality || data.principalSubdivision || 'Detected Location';
          const city = data.city || data.locality || '';
          const pincode = data.postcode || '';
          const state = data.principalSubdivision || '';

          return res.json({
            success: true,
            formattedAddress: `${street}, ${city} ${pincode}`.trim(),
            street,
            suburb: data.locality || '',
            city,
            pincode,
            state,
            lat,
            lng,
            provider: 'bigdatacloud',
          });
        }
      } catch (err: any) {
        // Fall through to basic coordinates response
      }

      // Basic fallback if both geocoding providers are unreachable
      return res.json({
        success: true,
        formattedAddress: `Location at ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        street: `Near coordinates ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        suburb: '',
        city: '',
        pincode: '',
        state: '',
        lat,
        lng,
        provider: 'fallback',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/geocode/forward', async (req: Request, res: Response) => {
    try {
      const q = req.query.q as string;
      if (!q || !q.trim()) {
        return res.status(400).json({ error: 'Query parameter q is required' });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q.trim())}&format=json&limit=1`,
        {
          headers: {
            'User-Agent': 'KitchenCruzeFoodDelivery/1.0 (contact@kitchencruze.com)',
            'Accept-Language': 'en',
          },
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (nomRes.ok) {
        const list: any = await nomRes.json();
        if (Array.isArray(list) && list.length > 0) {
          const first = list[0];
          return res.json({
            success: true,
            lat: parseFloat(first.lat),
            lng: parseFloat(first.lon),
            displayName: first.display_name,
          });
        }
      }

      res.status(404).json({ error: 'Could not resolve coordinates for address' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/geocode/kitchen-preset', (req: Request, res: Response) => {
    try {
      const settings = storage.getSettings();
      const restLat = settings.location?.latitude ?? 19.0760;
      const restLng = settings.location?.longitude ?? 72.8777;
      const cityName = settings.location?.city || 'Mumbai';

      // Offset slightly (about 1.2 KM north-east) so it is definitely within delivery zone
      const clientLat = parseFloat((restLat + 0.0075).toFixed(6));
      const clientLng = parseFloat((restLng + 0.0075).toFixed(6));

      res.json({
        lat: clientLat,
        lng: clientLng,
        restaurantLat: restLat,
        restaurantLng: restLng,
        city: cityName,
        deliveryAddress: `Flat 302, Palm Heights, Main Market Road, ${cityName}`,
        landmark: 'Opposite Central Park',
        pincode: settings.location?.pincode || '400001',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // ORDERS API
  // --------------------------------------------------------------------------
  app.get('/api/customer/orders', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const orders = storage.getOrdersByCustomer(req.customer!.id);
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/orders/my-orders', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const orders = storage.getOrdersByCustomer(req.customer!.id);
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/orders/:id', (req: Request, res: Response) => {
    try {
      const order = storage.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      res.json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/orders', requireCustomerAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        items,
        orderType,
        deliveryAddress,
        couponCode,
        paymentMethod,
        paymentReference,
        paymentScreenshot,
        specialInstructions,
        distanceKm,
        customerLatitude,
        customerLongitude,
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart cannot be empty' });
      }

      if (orderType === 'Delivery' && !deliveryAddress) {
        return res.status(400).json({ error: 'Delivery address is required for doorstep delivery' });
      }

      const order = storage.createOrder({
        customerId: req.customer!.id,
        customerName: req.customer!.fullName,
        customerPhone: req.customer!.phone,
        customerEmail: req.customer!.email,
        deliveryAddress,
        orderType: orderType || 'Delivery',
        items,
        couponCode,
        paymentMethod,
        paymentReference,
        paymentScreenshot,
        specialInstructions,
        distanceKm,
        customerLatitude: customerLatitude !== undefined ? Number(customerLatitude) : undefined,
        customerLongitude: customerLongitude !== undefined ? Number(customerLongitude) : undefined,
        walletAmountUsed: req.body.walletAmountUsed !== undefined ? Number(req.body.walletAmountUsed) : 0,
      });

      // If wallet funds were used, broadcast wallet update to customer
      if (order.walletAmountUsed && order.walletAmountUsed > 0) {
        const updatedWallet = storage.getWallet(req.customer!.id);
        broadcastEvent('WALLET_UPDATE', { customerId: req.customer!.id, wallet: updatedWallet });
      }

      // Real-time broadcast to Admin, Chef, and Delivery boys!
      broadcastEvent('NEW_ORDER', order);

      res.status(201).json(order);
    } catch (err: any) {
      // Return 400 for validation / radius errors
      res.status(400).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // RAZORPAY PAYMENT GATEWAY API (RAILWAY PRODUCTION READY)
  // Supports both /api/payment/* and /api/razorpay/* endpoints
  // --------------------------------------------------------------------------

  // 1. Safe Public Config Check (Never exposes Secret or Webhook Secret)
  const handlePaymentConfig = (_req: Request, res: Response) => {
    res.json({
      configured: isRazorpayConfigured(),
      keyId: getRazorpayKeyId(),
      currency: 'INR',
    });
  };
  app.get('/api/payment/config', handlePaymentConfig);
  app.get('/api/razorpay/config', handlePaymentConfig);

  // 2. Server-side Order Creation with Database-Authoritative Pricing
  const handleCreateOrder = async (req: Request, res: Response) => {
    try {
      const {
        items,
        orderType,
        deliveryAddress,
        couponCode,
        specialInstructions,
        distanceKm,
        customerLatitude,
        customerLongitude,
      } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart cannot be empty' });
      }

      if (orderType === 'Delivery' && !deliveryAddress) {
        return res.status(400).json({ error: 'Delivery address is required for doorstep delivery' });
      }

      // Check product availability and validate against DB
      for (const item of items) {
        const product = storage.getProductById(item.productId);
        if (!product) {
          return res.status(400).json({ error: `Product ID ${item.productId} was not found in our menu` });
        }
        if (product.isAvailable === false) {
          return res.status(400).json({ error: `"${product.name}" is currently out of stock` });
        }
      }

      // Verify Razorpay credentials from server environment
      const razorpay = getRazorpayClient();
      if (!razorpay) {
        return res.status(503).json({
          error:
            'Razorpay payment gateway is not yet configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Railway Variables.',
          code: 'RAZORPAY_NOT_CONFIGURED',
        });
      }

      // Resolve customer details from auth token or body
      let authenticatedCustomer = (req as AuthenticatedRequest).customer;
      const authHeader = req.headers.authorization;
      if (!authenticatedCustomer && authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyToken(token);
        if (payload && payload.role === 'customer') {
          authenticatedCustomer = storage.getCustomerById(payload.id) as any;
        }
      }

      const customerName = (req.body.customerName || req.body.fullName || authenticatedCustomer?.fullName || 'Customer').trim();
      const customerPhone = (req.body.customerPhone || req.body.phone || authenticatedCustomer?.phone || '').trim();
      const customerEmail = (req.body.customerEmail || req.body.email || authenticatedCustomer?.email || '').trim();
      const customerId = authenticatedCustomer?.id || `cust-${Date.now()}`;

      // 1. Create internal order using trusted DB prices & admin delivery/gst rules
      const order = storage.createOrder({
        customerId,
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress,
        orderType: orderType || 'Delivery',
        items,
        couponCode,
        paymentMethod: 'Razorpay',
        specialInstructions,
        distanceKm,
        customerLatitude: customerLatitude !== undefined ? Number(customerLatitude) : undefined,
        customerLongitude: customerLongitude !== undefined ? Number(customerLongitude) : undefined,
        walletAmountUsed: req.body.walletAmountUsed !== undefined ? Number(req.body.walletAmountUsed) : 0,
      });

      // If fully covered by wallet balance, return immediately as paid
      if (order.remainingPayable === 0 && (order.walletAmountUsed || 0) > 0) {
        broadcastEvent('WALLET_UPDATE', { customerId, wallet: storage.getWallet(customerId) });
        broadcastEvent('NEW_ORDER', order);
        return res.status(201).json({
          success: true,
          orderId: order.id,
          walletFullyPaid: true,
          grandTotal: order.grandTotal,
          walletAmountUsed: order.walletAmountUsed,
          remainingPayable: 0,
        });
      }

      // Amount in paise for remaining payable amount
      const payableAmount = order.remainingPayable !== undefined ? order.remainingPayable : order.grandTotal;
      const amountPaise = Math.round(payableAmount * 100);

      // 2. Create Razorpay Order on Razorpay Server
      const rzpOrder = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: order.id,
        notes: {
          orderId: order.id,
          customerId,
          customerEmail,
          customerPhone,
          customerName,
          walletAmountUsed: String(order.walletAmountUsed || 0),
          remainingPayable: String(payableAmount),
        },
      });

      // Attach Razorpay Order ID to the order
      order.razorpayOrderId = rzpOrder.id;

      // 3. Record internal PaymentTransaction in database
      storage.createPaymentTransaction({
        orderId: order.id,
        razorpayOrderId: rzpOrder.id,
        amount: order.grandTotal,
        amountPaise,
        currency: 'INR',
        paymentMethod: 'Razorpay',
        customerName,
        customerEmail,
        customerPhone,
      });

      // Broadcast order placed to staff
      broadcastEvent('NEW_ORDER', order);

      // 4. Return safe client response
      res.status(201).json({
        success: true,
        orderId: order.id,
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || 'INR',
        keyId: getRazorpayKeyId(),
        grandTotal: order.grandTotal,
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
      });
    } catch (err: any) {
      console.error('[Payment Error] create-order failed:', err);
      res.status(400).json({ error: err.message || 'Failed to initialize online payment order' });
    }
  };
  app.post('/api/payment/create-order', handleCreateOrder);
  app.post('/api/razorpay/create-order', handleCreateOrder);

  // 3. Server-side Payment Verification
  const handlePaymentVerify = (req: Request, res: Response) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required payment verification parameters (order ID, payment ID, signature)',
        });
      }

      // Cryptographic verification of Razorpay HMAC SHA256 signature
      const isAuthentic = verifyPaymentSignature({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      });

      if (!isAuthentic) {
        console.warn(`[Payment Security] Signature mismatch for order #${orderId}`);
        storage.updatePaymentTransaction(razorpay_order_id, {
          paymentStatus: 'FAILED',
          errorMessage: 'Payment signature mismatch during verification',
        });
        return res.status(400).json({
          success: false,
          error: 'Payment verification failed: invalid signature. Transaction rejected.',
        });
      }

      // Mark order as PAID in database
      const updatedOrder = storage.markOrderAsPaid(orderId, {
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        razorpaySignature: razorpay_signature,
        paymentMethod: 'Razorpay',
      });

      if (!updatedOrder) {
        return res.status(404).json({ error: 'Order not found for payment confirmation' });
      }

      // Real-time broadcast to Admin, Chef, and Delivery staff
      broadcastEvent('PAYMENT_RECEIVED', {
        orderId: updatedOrder.id,
        paymentId: razorpay_payment_id,
        amount: updatedOrder.grandTotal,
        customerName: updatedOrder.customerName,
        paymentMethod: 'Razorpay',
        paidAt: updatedOrder.paidAt,
      });
      broadcastEvent('ORDER_UPDATE', updatedOrder);

      res.json({
        success: true,
        orderId: updatedOrder.id,
        paymentId: razorpay_payment_id,
        amount: updatedOrder.grandTotal,
        status: 'PAID',
        message: 'Payment verified successfully and order confirmed',
      });
    } catch (err: any) {
      console.error('[Payment Error] verify failed:', err);
      res.status(500).json({ error: err.message || 'Payment verification failed' });
    }
  };
  app.post('/api/payment/verify', handlePaymentVerify);
  app.post('/api/razorpay/verify', handlePaymentVerify);

  // 4. Production-Ready Razorpay Webhook Endpoint
  const handlePaymentWebhook = (req: Request, res: Response) => {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const rawBody = (req as any).rawBody;

      if (!signature || !rawBody) {
        return res.status(400).json({ error: 'Missing x-razorpay-signature header or raw payload' });
      }

      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[Razorpay Webhook] Signature verification failed');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      const event = req.body;
      const eventName = event?.event;
      const payload = event?.payload;

      console.log(`[Razorpay Webhook] Received verified event: ${eventName}`);

      if (eventName === 'payment.captured' || eventName === 'order.paid') {
        const paymentEntity = payload?.payment?.entity;
        const orderEntity = payload?.order?.entity;
        const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;
        const razorpayPaymentId = paymentEntity?.id;

        if (razorpayOrderId) {
          const paymentTx = storage.getPaymentByRazorpayOrderId(razorpayOrderId);
          const isWalletTopup =
            paymentEntity?.notes?.type === 'WALLET_TOPUP' ||
            orderEntity?.notes?.type === 'WALLET_TOPUP' ||
            paymentTx?.transactionType === 'WALLET_TOPUP' ||
            paymentTx?.orderId?.startsWith('TOPUP-');

          if (isWalletTopup) {
            const customerId =
              paymentTx?.customerId ||
              paymentEntity?.notes?.customerId ||
              orderEntity?.notes?.customerId;
            const topupAmount =
              paymentTx?.amount ||
              (paymentEntity?.amount ? paymentEntity.amount / 100 : 0);

            if (customerId && topupAmount > 0 && razorpayPaymentId) {
              const result = storage.topupWallet(
                customerId,
                topupAmount,
                razorpayPaymentId,
                'Razorpay',
                razorpayOrderId
              );

              storage.updatePaymentTransaction(razorpayOrderId, {
                paymentStatus: 'PAID',
                razorpayPaymentId,
                paidAt: new Date().toISOString(),
              });

              broadcastEvent('WALLET_UPDATE', {
                customerId,
                wallet: result.wallet,
                source: 'webhook',
              });
              console.log(
                `[Razorpay Webhook] Processed wallet topup for customer ${customerId}: ₹${topupAmount} (alreadyCredited: ${result.alreadyCredited || false})`
              );
            }
          } else {
            const targetOrderId =
              paymentTx?.orderId || paymentEntity?.notes?.orderId || orderEntity?.receipt;

            if (targetOrderId && razorpayPaymentId) {
              const order = storage.markOrderAsPaid(targetOrderId, {
                razorpayPaymentId,
                razorpayOrderId,
                paymentMethod: paymentEntity?.method || 'Razorpay',
              });

              if (order) {
                broadcastEvent('PAYMENT_RECEIVED', {
                  orderId: order.id,
                  paymentId: razorpayPaymentId,
                  amount: order.grandTotal,
                  source: 'webhook',
                });
                broadcastEvent('ORDER_UPDATE', order);
              }
            }
          }
        }
      } else if (eventName === 'payment.failed') {
        const paymentEntity = payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;
        if (razorpayOrderId) {
          storage.updatePaymentTransaction(razorpayOrderId, {
            paymentStatus: 'FAILED',
            errorMessage: paymentEntity?.error_description || 'Payment failed event from webhook',
          });
        }
      }

      // Idempotent: Always respond with 200 OK
      res.status(200).json({ status: 'ok', received: true });
    } catch (err: any) {
      console.error('[Razorpay Webhook Error]:', err);
      // Still return 200 to prevent Razorpay from repeatedly retrying on unexpected application exceptions
      res.status(200).json({ status: 'error_handled', error: err.message });
    }
  };
  app.post('/api/payment/webhook', handlePaymentWebhook);
  app.post('/api/razorpay/webhook', handlePaymentWebhook);
  app.post('/api/webhook/razorpay', handlePaymentWebhook);

  // Admin orders
  app.get('/api/admin/orders', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(storage.getOrders());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/orders/:id/status', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, note } = req.body;
      const updated = storage.updateOrderStatus(req.params.id, status as OrderStatus, req.adminUsername || 'Admin', note);
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('ORDER_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/orders/:id/assign-delivery', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { deliveryBoyId, deliveryBoyName } = req.body;
      const updated = storage.assignDelivery(req.params.id, deliveryBoyId, deliveryBoyName);
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('ORDER_ASSIGNED', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/orders/:id/verify-payment', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { verified } = req.body;
      const updated = storage.verifyPayment(req.params.id, Boolean(verified), req.adminUsername || 'Admin');
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('PAYMENT_VERIFIED', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/orders/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = storage.deleteOrder(req.params.id);
      if (!success) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('ORDER_DELETED', { id: req.params.id });
      res.json({ success: true, message: 'Order deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/orders/bulk-delete', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { filter, orderIds } = req.body;
      const deletedCount = storage.deleteOrders(orderIds || filter || 'cancelled');
      broadcastEvent('ORDERS_BULK_DELETED', { count: deletedCount, filter });
      res.json({ success: true, deletedCount });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/orders', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress,
        orderType,
        items,
        paymentMethod,
        notes,
      } = req.body;

      if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Customer name and at least one item are required' });
      }

      const order = storage.createOrder({
        customerId: 'admin-created-' + Date.now(),
        customerName: String(customerName).trim(),
        customerPhone: (customerPhone && String(customerPhone).trim()) || 'N/A',
        customerEmail: (customerEmail && String(customerEmail).trim()) || 'walkin@kitchencruze.local',
        deliveryAddress: deliveryAddress || {
          house: 'In-Store',
          street: 'Kitchen Cruze Counter',
          city: 'Mumbai',
          pincode: '400050',
        },
        orderType: orderType === 'Pickup' ? 'Pickup' : 'Delivery',
        items,
        paymentMethod: paymentMethod || 'COD',
        specialInstructions: notes || 'Created via Admin Portal',
      });

      broadcastEvent('ORDER_CREATED', order);
      res.status(201).json(order);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Chef Portal Orders
  app.get('/api/chef/orders', requireChefAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      // Active kitchen orders
      const orders = storage.getOrders().filter(
        (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
      );
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/chef/orders/:id/status', requireChefAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { chefStatus } = req.body;
      const updated = storage.updateChefStatus(req.params.id, chefStatus as ChefStatus, req.staffUser?.name || 'Chef');
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('CHEF_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delivery Portal Orders
  app.get('/api/delivery/orders', requireDeliveryAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const staff = req.staffUser;
      // All orders needing delivery or assigned to this delivery partner
      const orders = storage.getOrders().filter(
        (o) => o.orderType === 'Delivery' && (o.assignedDeliveryBoyId === staff?.id || o.deliveryStatus === 'Unassigned' || staff?.role === 'admin')
      );
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/delivery/orders/:id/status', requireDeliveryAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { deliveryStatus } = req.body;
      const updated = storage.updateDeliveryStatus(req.params.id, deliveryStatus as DeliveryStatus, req.staffUser?.name || 'Delivery Partner');
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('DELIVERY_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // COD Cycle endpoints
  app.put('/api/delivery/orders/:id/cod', requireDeliveryAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { codStatus } = req.body;
      let updated: Order | null = null;
      if (codStatus === 'Cash Received' || codStatus === 'Collected' || codStatus === 'Cash Pending Handover') {
        updated = storage.recordCodReceived(
          req.params.id,
          req.staffUser?.id || 'staff-delivery-1',
          req.staffUser?.name || 'Express Delivery Partner'
        );
      } else if (codStatus === 'Cash Handed Over' || codStatus === 'Handed Over') {
        updated = storage.recordCodHandedOver(req.params.id);
      } else {
        const order = storage.getOrderById(req.params.id);
        if (order) {
          order.codStatus = codStatus;
          updated = order;
        }
      }
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('COD_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/delivery/orders/:id/cod-received', requireDeliveryAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.recordCodReceived(
        req.params.id,
        req.staffUser?.id || 'staff-delivery-1',
        req.staffUser?.name || 'Express Delivery Partner'
      );
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('COD_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/delivery/orders/:id/cod-handover', requireDeliveryAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.recordCodHandedOver(req.params.id);
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('COD_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/orders/:id/cod-settle', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.recordCodSettled(req.params.id);
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('COD_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/cod-transactions', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(storage.getCodTransactions());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // DELIVERY MANAGEMENT SYSTEM APIS (ADMIN & DELIVERY BOY)
  // --------------------------------------------------------------------------
  // Delivery Boy Profile & Stats for logged-in delivery boy
  app.get('/api/delivery/profile', requireDeliveryAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const staff = req.staffUser;
      const allBoys = storage.getDeliveryBoys();
      const boy =
        allBoys.find((b) => b.id === staff?.id) ||
        allBoys.find((b) => b.username.toLowerCase() === staff?.username.toLowerCase()) ||
        allBoys.find((b) => b.name.toLowerCase() === staff?.name.toLowerCase()) ||
        allBoys[0];

      // Get assigned orders
      const assignedOrders = storage.getOrders().filter(
        (o) =>
          o.orderType === 'Delivery' &&
          (o.assignedDeliveryBoyId === boy?.id ||
            o.assignedDeliveryBoyNumber === boy?.deliveryBoyNumber ||
            (o.assignedDeliveryBoyName && boy && o.assignedDeliveryBoyName.toLowerCase() === boy.name.toLowerCase()))
      );

      const deliveredOrders = assignedOrders.filter(
        (o) => o.status === 'Delivered' || o.deliveryStatus === 'Delivered'
      );

      const totalDistanceKm = Math.round(
        deliveredOrders.reduce((acc, o) => acc + (o.deliveryDistanceKm || 0), 0) * 10
      ) / 10;

      res.json({
        deliveryBoy: boy,
        stats: {
          totalDelivered: deliveredOrders.length,
          totalDistanceKm,
          pendingDeliveries: assignedOrders.filter(
            (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
          ).length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Delivery Overview Stats
  app.get('/api/admin/delivery/stats', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(storage.getDeliveryStats());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Delivery Boys List
  app.get('/api/admin/delivery/boys', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(storage.getDeliveryBoys());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Delivery Boy Details with Order History
  app.get('/api/admin/delivery/boys/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const details = storage.getDeliveryBoyById(req.params.id);
      if (!details) return res.status(404).json({ error: 'Delivery boy not found' });
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Add Delivery Boy
  app.post('/api/admin/delivery/boys', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, phone, username, password, status } = req.body;
      if (!name || !phone || !username) {
        return res.status(400).json({ error: 'Name, phone and username are required' });
      }
      const newBoy = storage.addDeliveryBoy({ name, phone, username, password, status });
      broadcastEvent('DELIVERY_BOY_ADDED', newBoy);
      res.status(201).json(newBoy);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Update Delivery Boy
  app.put('/api/admin/delivery/boys/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.updateDeliveryBoy(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: 'Delivery boy not found' });
      broadcastEvent('DELIVERY_BOY_UPDATED', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Toggle Delivery Boy Status (active / inactive)
  app.post('/api/admin/delivery/boys/:id/toggle-status', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.toggleDeliveryBoyStatus(req.params.id);
      if (!updated) return res.status(404).json({ error: 'Delivery boy not found' });
      broadcastEvent('DELIVERY_BOY_UPDATED', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Reset Delivery Boy Password
  app.post('/api/admin/delivery/boys/:id/reset-password', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      const success = storage.resetDeliveryBoyPassword(req.params.id, password);
      if (!success) return res.status(404).json({ error: 'Delivery boy not found' });
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Delete Delivery Boy
  app.delete('/api/admin/delivery/boys/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = storage.deleteDeliveryBoy(req.params.id);
      if (!success) return res.status(404).json({ error: 'Delivery boy not found' });
      broadcastEvent('DELIVERY_BOY_DELETED', { id: req.params.id });
      res.json({ success: true, message: 'Delivery boy deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Assign Delivery Boy to Order
  app.post('/api/admin/delivery/assign', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { orderId, deliveryBoyId, deliveryBoyName } = req.body;
      if (!orderId || !deliveryBoyId) {
        return res.status(400).json({ error: 'orderId and deliveryBoyId are required' });
      }
      const updated = storage.assignDelivery(orderId, deliveryBoyId, deliveryBoyName);
      if (!updated) return res.status(404).json({ error: 'Order not found' });
      broadcastEvent('ORDER_ASSIGNED', updated);
      broadcastEvent('ORDER_UPDATE', updated);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Update Restaurant Location & Delivery Radius
  app.put('/api/admin/delivery/settings', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { location, deliveryRadiusKm } = req.body;
      const updatedSettings = storage.updateSettings({
        location,
        deliveryRadiusKm: deliveryRadiusKm !== undefined ? Number(deliveryRadiusKm) : undefined,
      });
      broadcastEvent('SETTINGS_UPDATE', updatedSettings);
      res.json({
        success: true,
        location: updatedSettings.location,
        deliveryRadiusKm: updatedSettings.deliveryRadiusKm,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // ADMIN CUSTOMERS, AUDIT, REPORTS & MESSAGES
  // --------------------------------------------------------------------------
  app.get('/api/admin/customers', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(storage.getAllCustomers());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/customers/:id/toggle-status', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const updated = storage.toggleCustomerStatus(req.params.id);
      if (!updated) return res.status(404).json({ error: 'Customer not found' });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/customers', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fullName, phone, email, address, password } = req.body;
      if (!fullName || !phone) {
        return res.status(400).json({ error: 'Customer Full Name and Phone number are required' });
      }
      const cleanPhone = String(phone).trim();
      const cleanEmail = (email && String(email).trim()) || `${cleanPhone}@kitchencruze.local`;
      const cleanUsername = `user_${cleanPhone.replace(/\D/g, '') || Date.now()}`;
      const custPassword = password || 'Welcome@123';

      const existing = storage.getCustomerByEmailOrUsername(cleanPhone) || storage.getCustomerByEmailOrUsername(cleanEmail);
      if (existing) {
        return res.status(400).json({ error: 'A customer with this phone or email already exists' });
      }

      const newCust = storage.createCustomer({
        fullName,
        username: cleanUsername,
        email: cleanEmail,
        phone: cleanPhone,
        password: custPassword,
        initialAddress: address ? {
          house: address.house || '',
          street: address.street || '',
          area: address.area || address.city || '',
          city: address.city || 'Mumbai',
          pincode: address.pincode || '',
        } : undefined,
      });

      res.status(201).json(newCust);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/customers/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const success = storage.deleteCustomer(req.params.id);
      if (!success) return res.status(404).json({ error: 'Customer not found' });
      res.json({ success: true, message: 'Customer account deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/audit-logs', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(storage.getAuditLogs());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/audit-logs', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      storage.clearAuditLogs();
      res.json({ success: true, message: 'Audit logs cleared successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/messages', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      res.json(storage.getMessages());
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customer Support Inquiry & Ticket Creation
  app.post('/api/support', (req: Request, res: Response) => {
    try {
      const { customerName, customerPhone, customerEmail, category, orderId, message } = req.body;
      if (!customerName || !message) {
        return res.status(400).json({ error: 'Name and message description are required' });
      }

      const cleanName = String(customerName).trim();
      const cleanPhone = String(customerPhone || '').trim();
      const cleanEmail = String(customerEmail || '').trim();
      const cleanCategory = String(category || 'General Assistance').trim();
      const cleanOrderId = orderId ? String(orderId).trim() : undefined;
      const cleanMessage = String(message).trim();

      const title = `[Support: ${cleanCategory}] From ${cleanName}${cleanOrderId ? ` (${cleanOrderId})` : ''}`;
      const content = `Customer: ${cleanName}\nPhone: ${cleanPhone || 'Not provided'}\nEmail: ${cleanEmail || 'Not provided'}\nCategory: ${cleanCategory}${cleanOrderId ? `\nRelated Order: ${cleanOrderId}` : ''}\n\nInquiry Details:\n${cleanMessage}`;

      const msg = storage.addMessage('Customer Issue', title, content, cleanOrderId);
      broadcastEvent('NEW_MESSAGE', msg);
      broadcastEvent('CUSTOMER_SUPPORT_TICKET', {
        id: msg.id,
        customerName: cleanName,
        category: cleanCategory,
        orderId: cleanOrderId,
      });

      res.status(201).json({
        success: true,
        ticketId: msg.id,
        message: 'Your customer support request has been received. Our team will assist you shortly.',
      });
    } catch (err: any) {
      console.error('[Support Error]:', err);
      res.status(500).json({ error: err.message || 'Failed to submit support request' });
    }
  });

  app.put('/api/admin/messages/:id/read', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const ok = storage.markMessageRead(req.params.id);
      res.json({ success: ok });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/messages/:id', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const ok = storage.deleteMessage(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Message not found' });
      res.json({ success: true, message: 'Message deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/messages', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      storage.clearMessages();
      res.json({ success: true, message: 'All messages cleared successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/reports', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const orders = storage.getOrders();
      const completed = orders.filter((o) => o.status === 'Delivered' || o.status === 'Picked Up');
      const totalRevenue = completed.reduce((sum, o) => sum + o.grandTotal, 0);
      const codRevenue = completed.filter((o) => o.paymentMethod === 'Cash on Delivery').reduce((sum, o) => sum + o.grandTotal, 0);
      const onlineRevenue = totalRevenue - codRevenue;

      // Item popularity
      const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
      for (const ord of completed) {
        for (const it of ord.items) {
          if (!itemCounts[it.productId]) {
            itemCounts[it.productId] = { name: it.name, count: 0, revenue: 0 };
          }
          itemCounts[it.productId].count += it.quantity;
          itemCounts[it.productId].revenue += it.itemTotal;
        }
      }

      const topDishes = Object.values(itemCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      res.json({
        totalOrders: orders.length,
        completedOrders: completed.length,
        totalRevenue,
        onlineRevenue,
        codRevenue,
        averageOrderValue: completed.length > 0 ? Math.round(totalRevenue / completed.length) : 0,
        topDishes,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // FULL BACKEND SYSTEM & DATABASE MANAGEMENT APIS
  // --------------------------------------------------------------------------
  app.get('/api/admin/system/overview', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const overview = storage.getSystemOverview();
      res.json({
        ...overview,
        realtime: {
          activeSseClients: sseClients.size,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/system/seed', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const force = req.body?.force === true;
      const result = storage.seedInitialRestaurantCatalog(force);
      broadcastEvent('MENU_UPDATED', { action: 'seed', ...result });
      res.json({
        success: true,
        message: `Successfully seeded restaurant inventory: ${result.productsCount} dishes across ${result.categoriesCount} categories, ${result.offersCount} offers, and ${result.reviewsCount} reviews`,
        ...result,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/system/export', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const dbSnapshot = storage.exportDatabase();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="kitchencruze_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json"`
      );
      res.json(dbSnapshot);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/system/import', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = storage.importDatabase(req.body);
      broadcastEvent('MENU_UPDATED', { action: 'import' });
      broadcastEvent('SETTINGS_UPDATE', storage.getSettings());
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/admin/system/routes', requireAdminAuth, (_req: AuthenticatedRequest, res: Response) => {
    try {
      const routes = [
        { method: 'GET', path: '/api/health', auth: 'Public', description: 'Server health and database connection status' },
        { method: 'GET', path: '/api/settings', auth: 'Public', description: 'Restaurant profile, contact, hours, address, and delivery rules' },
        { method: 'PUT', path: '/api/admin/settings', auth: 'Admin', description: 'Update restaurant profile, timings, and configuration' },
        { method: 'PUT', path: '/api/admin/settings/address', auth: 'Admin', description: 'Update physical address and GPS coordinates' },
        { method: 'GET', path: '/api/categories', auth: 'Public', description: 'List active food menu categories' },
        { method: 'POST', path: '/api/admin/categories', auth: 'Admin', description: 'Create a new food category' },
        { method: 'GET', path: '/api/products', auth: 'Public', description: 'List all available food items with Veg/Non-Veg indicators' },
        { method: 'POST', path: '/api/admin/products', auth: 'Admin', description: 'Add a new food item with pricing and dietary classification' },
        { method: 'PUT', path: '/api/admin/products/:id', auth: 'Admin', description: 'Update food item details, availability, and pricing' },
        { method: 'DELETE', path: '/api/admin/products/:id', auth: 'Admin', description: 'Remove a food item from the menu' },
        { method: 'GET', path: '/api/offers/active', auth: 'Public', description: 'Active promotional discount coupons' },
        { method: 'POST', path: '/api/admin/offers', auth: 'Admin', description: 'Create promotional offer code' },
        { method: 'POST', path: '/api/orders', auth: 'Customer', description: 'Place a new food order with delivery details' },
        { method: 'GET', path: '/api/customer/orders', auth: 'Customer', description: 'Get logged-in customer order history' },
        { method: 'GET', path: '/api/admin/orders', auth: 'Admin', description: 'List all customer orders across all statuses' },
        { method: 'PUT', path: '/api/admin/orders/:id/status', auth: 'Admin', description: 'Update order status (Confirmed, Preparing, Out for Delivery, etc.)' },
        { method: 'GET', path: '/api/chef/orders', auth: 'Chef', description: 'Kitchen display system for active food prep' },
        { method: 'GET', path: '/api/delivery/orders', auth: 'Delivery', description: 'Delivery partner order run sheet and COD tracker' },
        { method: 'POST', path: '/api/delivery/calculate', auth: 'Public', description: 'Calculate exact delivery fee by distance slabs' },
        { method: 'GET', path: '/api/payment/config', auth: 'Public', description: 'Check Razorpay and UPI gateway configuration' },
        { method: 'POST', path: '/api/payment/create-order', auth: 'Public', description: 'Generate order for Razorpay payment' },
        { method: 'POST', path: '/api/payment/verify', auth: 'Public', description: 'Verify Razorpay payment signature' },
        { method: 'GET', path: '/api/admin/system/overview', auth: 'Admin', description: 'Full server metrics, database counts, and storage status' },
        { method: 'POST', path: '/api/admin/system/seed', auth: 'Admin', description: 'Seed full restaurant inventory with Veg and Non-Veg items' },
        { method: 'GET', path: '/api/admin/system/export', auth: 'Admin', description: 'Export full database snapshot backup' },
      ];
      res.json(routes);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/system/test-ping', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { endpoint } = req.body;
      const targetPath = endpoint || '/api/health';
      const start = Date.now();
      const localUrl = `http://localhost:${PORT}${targetPath}`;
      const response = await fetch(localUrl, {
        headers: {
          Authorization: `Bearer ${req.headers.authorization?.split(' ')[1]}`,
        },
      });
      const durationMs = Date.now() - start;
      const data = await response.json().catch(() => ({ status: response.statusText }));
      res.json({
        endpoint: targetPath,
        status: response.status,
        durationMs,
        response: data,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --------------------------------------------------------------------------
  // API 404 GUARD (Guarantees all /api and /api/* requests receive JSON, never index.html)
  // --------------------------------------------------------------------------
  app.all(['/api', '/api/*'], (req: Request, res: Response) => {
    res.status(404).json({
      error: `API route not found: ${req.method} ${req.originalUrl || req.path}`,
      message: 'The requested API endpoint does not exist.'
    });
  });

  // Global Error Handler for API routes (Guarantees JSON response, never Express default HTML error page)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[Express Error Handler] ${req.method} ${req.originalUrl || req.path}:`, err);
    if (res.headersSent) {
      return next(err);
    }
    if (req.path.startsWith('/api') || req.url.startsWith('/api')) {
      return res.status(err.status || err.statusCode || 500).json({
        error: err.message || 'Internal server error occurred',
        code: err.code || 'SERVER_ERROR',
      });
    }
    next(err);
  });

  // --------------------------------------------------------------------------
  // VITE DEV / PRODUCTION MIDDLEWARE
  // --------------------------------------------------------------------------
  const isCjsBundle = typeof __filename !== 'undefined' && __filename.endsWith('.cjs');
  const distPath = path.join(process.cwd(), 'dist');
  const hasDistIndex = fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    isCjsBundle ||
    (hasDistIndex && process.env.NODE_ENV !== 'development');

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kitchen Cruze unified full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
