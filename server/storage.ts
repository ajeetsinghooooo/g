import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  Product,
  Category,
  Order,
  Customer,
  RestaurantSettings,
  RestaurantLocation,
  OrderStatus,
  ChefStatus,
  DeliveryStatus,
  CodStatus,
  Offer,
  Review,
  AuditLog,
  AdminMessage,
  StaffUser,
  DistanceSlab,
  WeightSlab,
  DeliveryBoy,
  PaymentTransaction,
  CustomerWallet,
  WalletTransaction,
  CashbackCampaign,
  LoyaltySettings,
} from '../src/types';
import { calculateRewardCoins, DEFAULT_LOYALTY_RULES } from '../src/utils/loyalty';
import { calculateHaversineDistanceKm, formatDistanceDisplay } from '../src/utils/distance';
import { DEFAULT_RESTAURANT_SETTINGS } from '../src/config/restaurantConfig';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_OFFERS,
  INITIAL_REVIEWS,
} from './seedData';

export interface StoredStaffUser extends StaffUser {
  passwordHash: string;
  salt: string;
}

export interface StoredCustomer extends Customer {
  passwordHash: string;
  salt: string;
}

export interface CodTransaction {
  id: string;
  orderId: string;
  deliveryBoyId: string;
  deliveryBoyName: string;
  amount: number;
  collectedAt: string;
  handedOverAt?: string;
  settledAt?: string;
  status: 'Pending Handover' | 'Handed Over' | 'Settled';
}

export interface NotificationItem {
  id: string;
  recipientRole: 'admin' | 'chef' | 'delivery' | 'customer';
  recipientId?: string;
  title: string;
  message: string;
  orderId?: string;
  read: boolean;
  createdAt: string;
}

export interface DatabaseSchema {
  settings: RestaurantSettings;
  staffUsers: StoredStaffUser[];
  deliveryBoys: DeliveryBoy[];
  nextDeliveryBoyNumber: number;
  customers: StoredCustomer[];
  categories: Category[];
  products: Product[];
  offers: Offer[];
  orders: Order[];
  reviews: Review[];
  wishlists: Record<string, string[]>; // customerId -> productIds
  codTransactions: CodTransaction[];
  auditLogs: AuditLog[];
  messages: AdminMessage[];
  notifications: NotificationItem[];
  payments: PaymentTransaction[];
  wallets: Record<string, CustomerWallet>; // customerId -> CustomerWallet
  walletTransactions: WalletTransaction[];
  cashbackCampaigns: CashbackCampaign[];
  loyaltySettings: LoyaltySettings;
  nextOrderId: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Password hashing helper using standard scrypt
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 64).toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// Ensure Initial Staff Users with exact credentials from user prompt:
// 1. Admin: Username: "Kitchencruze12", Password: "amdin@12#21"
// 2. Chef: Username: "Cafekitchencruze12", Password: "Cafe@12#113"
// 3. Delivery: Username: "Diliveryboy112", Password: "Diliveryboy@12#1"
function createInitialStaffUsers(): StoredStaffUser[] {
  const adminAuth = hashPassword('amdin@12#21');
  const chefAuth = hashPassword('Cafe@12#113');
  const deliveryAuth = hashPassword('Diliveryboy@12#1');

  return [
    {
      id: 'staff-admin-1',
      username: 'Kitchencruze12',
      email: 'admin@kitchencruze.local',
      role: 'admin',
      name: 'Kitchen Cruze Admin',
      phone: '',
      status: 'active',
      passwordHash: adminAuth.hash,
      salt: adminAuth.salt,
    },
    {
      id: 'staff-chef-1',
      username: 'Cafekitchencruze12',
      email: 'cafe@kitchencruze.local',
      role: 'chef',
      name: 'Executive Chef',
      phone: '',
      status: 'active',
      passwordHash: chefAuth.hash,
      salt: chefAuth.salt,
    },
    {
      id: 'staff-delivery-1',
      username: 'Diliveryboy112',
      email: 'delivery@kitchencruze.local',
      role: 'delivery',
      name: 'Express Delivery Partner',
      phone: '',
      status: 'active',
      passwordHash: deliveryAuth.hash,
      salt: deliveryAuth.salt,
    },
  ];
}

class StorageManager {
  private db: DatabaseSchema;

  constructor() {
    this.db = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(content);
        
        // Guarantee staff users exist and Admin is PERMANENT & LOCKED: Kitchencruze12 / amdin@12#21
        const initialStaff = createInitialStaffUsers();
        let staffUsers: StoredStaffUser[] = data.staffUsers || [];

        // Always enforce locked Admin credentials
        const adminAuth = hashPassword('amdin@12#21');
        const adminUser = staffUsers.find((s) => s.role === 'admin');
        if (adminUser) {
          adminUser.username = 'Kitchencruze12';
          adminUser.passwordHash = adminAuth.hash;
          adminUser.salt = adminAuth.salt;
          adminUser.status = 'active';
        } else {
          staffUsers.push(initialStaff[0]);
        }

        // Ensure Chef exists (default: Cafekitchencruze12 / Cafe@12#113)
        const chefUser = staffUsers.find((s) => s.role === 'chef');
        if (!chefUser) {
          staffUsers.push(initialStaff[1]);
        }

        // Ensure Delivery exists (default: Diliveryboy112 / Diliveryboy@12#1)
        const deliveryUser = staffUsers.find((s) => s.role === 'delivery');
        if (!deliveryUser) {
          staffUsers.push(initialStaff[2]);
        }

        // Initialize delivery boys list
        let deliveryBoys: DeliveryBoy[] = data.deliveryBoys || [];
        let nextDeliveryBoyNumber = data.nextDeliveryBoyNumber || 2;

        // Ensure default Delivery Boy #1 exists and matches staff-delivery-1
        if (deliveryBoys.length === 0) {
          deliveryBoys.push({
            id: 'staff-delivery-1',
            deliveryBoyNumber: 1,
            name: 'Express Delivery Partner',
            phone: '+91 98765 43210',
            username: 'Diliveryboy112',
            status: 'active',
            createdAt: new Date().toISOString(),
          });
        }

        const baseSettings: RestaurantSettings = {
          ...DEFAULT_RESTAURANT_SETTINGS,
          ...(data.settings || {}),
        };

        if (!baseSettings.location || !baseSettings.location.latitude) {
          baseSettings.location = {
            latitude: 19.0760,
            longitude: 72.8777,
            address: baseSettings.address || 'Shop 14, Cruze Promenade, Near City Center, Mumbai, 400050',
            city: 'Mumbai',
            pincode: '400050',
          };
        }
        if (!baseSettings.deliveryRadiusKm) {
          baseSettings.deliveryRadiusKm = 5;
        }
        if (!baseSettings.logo || baseSettings.logo.trim() === '') {
          baseSettings.logo = '/logo.png';
        }

        const initialProducts =
          Array.isArray(data.products) && data.products.length > 0
            ? data.products
            : [...INITIAL_PRODUCTS];

        const initialCategories =
          Array.isArray(data.categories) && data.categories.length > 0
            ? data.categories
            : [...INITIAL_CATEGORIES];

        const initialOffers =
          Array.isArray(data.offers) && data.offers.length > 0
            ? data.offers
            : [...INITIAL_OFFERS];

        const initialReviews =
          Array.isArray(data.reviews) && data.reviews.length > 0
            ? data.reviews
            : [...INITIAL_REVIEWS];

        return {
          settings: baseSettings,
          staffUsers,
          deliveryBoys,
          nextDeliveryBoyNumber,
          customers: data.customers || [],
          categories: initialCategories,
          products: initialProducts,
          offers: initialOffers,
          orders: data.orders || [],
          reviews: initialReviews,
          wishlists: data.wishlists || {},
          codTransactions: data.codTransactions || [],
          auditLogs: data.auditLogs || [],
          messages: data.messages || [],
          notifications: data.notifications || [],
          payments: data.payments || [],
          wallets: data.wallets || {},
          walletTransactions: data.walletTransactions || [],
          cashbackCampaigns: data.cashbackCampaigns || [],
          loyaltySettings: data.loyaltySettings || { ...DEFAULT_LOYALTY_RULES },
          nextOrderId: data.nextOrderId || 1001,
        };
      }
    } catch (err) {
      console.error('Error loading database file, initializing clean database:', err);
    }

    // Fresh database with rich multi-cuisine menu and authentic Indian food items
    const freshDb: DatabaseSchema = {
      settings: {
        ...DEFAULT_RESTAURANT_SETTINGS,
        location: {
          latitude: 19.0760,
          longitude: 72.8777,
          address: 'Shop 14, Cruze Promenade, Near City Center, Mumbai, 400050',
          city: 'Mumbai',
          pincode: '400050',
        },
        deliveryRadiusKm: 5,
      },
      staffUsers: createInitialStaffUsers(),
      deliveryBoys: [
        {
          id: 'staff-delivery-1',
          deliveryBoyNumber: 1,
          name: 'Express Delivery Partner',
          phone: '+91 98765 43210',
          username: 'Diliveryboy112',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ],
      nextDeliveryBoyNumber: 2,
      customers: [],
      categories: [...INITIAL_CATEGORIES],
      products: [...INITIAL_PRODUCTS],
      offers: [...INITIAL_OFFERS],
      orders: [],
      reviews: [...INITIAL_REVIEWS],
      wishlists: {},
      codTransactions: [],
      auditLogs: [
        {
          id: 'log-init',
          user: 'System',
          role: 'System',
          action: 'DATABASE_INITIALIZED',
          details: 'Initialized single-restaurant database with 0 products, 0 categories, empty contact details and staff credentials.',
          timestamp: new Date().toISOString(),
        },
      ],
      messages: [],
      notifications: [],
      payments: [],
      wallets: {},
      walletTransactions: [],
      cashbackCampaigns: [],
      loyaltySettings: { ...DEFAULT_LOYALTY_RULES },
      nextOrderId: 1001,
    };

    this.saveToFile(freshDb);
    return freshDb;
  }

  private saveToFile(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write database to disk:', err);
    }
  }

  private persist() {
    this.saveToFile(this.db);
  }

  async initStorage() {
    console.log('[StorageManager] Persistent database storage ready (/data/db.json).');
  }

  getDatabaseStatus() {
    return {
      connected: true,
      provider: 'Kitchen Cruze Persistent Database',
      lastSyncedAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // AUDIT LOG & MESSAGES
  // --------------------------------------------------------------------------
  addAuditLog(user: string, role: string, action: string, details: string, ip?: string) {
    const log: AuditLog = {
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      user,
      role,
      action,
      details,
      timestamp: new Date().toISOString(),
      ip,
    };
    this.db.auditLogs.unshift(log);
    if (this.db.auditLogs.length > 500) this.db.auditLogs.pop();
    this.persist();
    return log;
  }

  getAuditLogs(): AuditLog[] {
    return this.db.auditLogs;
  }

  clearAuditLogs(): boolean {
    this.db.auditLogs = [];
    this.persist();
    return true;
  }

  addMessage(type: AdminMessage['type'], title: string, content: string, orderId?: string) {
    const msg: AdminMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      type,
      title,
      content,
      orderId,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.db.messages.unshift(msg);
    if (this.db.messages.length > 200) this.db.messages.pop();
    this.persist();
    return msg;
  }

  addNotification(role: string, title: string, message: string, orderId?: string) {
    if (!this.db.notifications) this.db.notifications = [];
    const notif: NotificationItem = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      recipientRole: (role as any) || 'admin',
      title,
      message,
      orderId,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.db.notifications.unshift(notif);
    if (this.db.notifications.length > 200) this.db.notifications.pop();
    this.persist();
    return notif;
  }

  getMessages(): AdminMessage[] {
    return this.db.messages;
  }

  markMessageRead(id: string): boolean {
    const msg = this.db.messages.find((m) => m.id === id);
    if (msg) {
      msg.read = true;
      this.persist();
      return true;
    }
    return false;
  }

  deleteMessage(id: string): boolean {
    const index = this.db.messages.findIndex((m) => m.id === id);
    if (index === -1) return false;
    this.db.messages.splice(index, 1);
    this.persist();
    return true;
  }

  clearMessages(): boolean {
    this.db.messages = [];
    this.persist();
    return true;
  }

  // --------------------------------------------------------------------------
  // RESTAURANT SETTINGS
  // --------------------------------------------------------------------------
  getSettings(): RestaurantSettings {
    const s = this.db.settings;
    if (!s.logo || s.logo.trim() === '') {
      s.logo = '/logo.png';
    }
    if ((!s.address || s.address.trim() === '') && s.location?.address) {
      s.address = s.location.address;
    }
    return s;
  }

  updateSettings(partial: Partial<RestaurantSettings>): RestaurantSettings {
    const targetAddress =
      partial.address !== undefined && partial.address.trim() !== ''
        ? partial.address.trim()
        : partial.location?.address !== undefined && partial.location.address.trim() !== ''
        ? partial.location.address.trim()
        : this.db.settings.address;

    const baseLoc = this.db.settings.location || {
      latitude: 19.0760,
      longitude: 72.8777,
      address: targetAddress,
      city: 'Mumbai',
      pincode: '400050',
    };

    const targetLocation: RestaurantLocation = {
      ...baseLoc,
      ...(partial.location || {}),
      address: targetAddress,
      city: partial.location?.city !== undefined ? partial.location.city : (baseLoc.city || 'Mumbai'),
      pincode: partial.location?.pincode !== undefined ? partial.location.pincode : (baseLoc.pincode || '400050'),
      landmark: partial.location?.landmark !== undefined ? partial.location.landmark : baseLoc.landmark,
      latitude:
        partial.location?.latitude !== undefined
          ? Number(partial.location.latitude)
          : (baseLoc.latitude ?? 19.0760),
      longitude:
        partial.location?.longitude !== undefined
          ? Number(partial.location.longitude)
          : (baseLoc.longitude ?? 72.8777),
    };

    this.db.settings = {
      ...this.db.settings,
      ...partial,
      address: targetAddress,
      location: targetLocation,
      deliveryRadiusKm:
        partial.deliveryRadiusKm !== undefined
          ? Number(partial.deliveryRadiusKm)
          : this.db.settings.deliveryRadiusKm || 5,
      deliveryRules: {
        ...this.db.settings.deliveryRules,
        ...(partial.deliveryRules || {}),
      },
      gst: {
        ...this.db.settings.gst,
        ...(partial.gst || {}),
      },
      payments: {
        ...(this.db.settings.payments || {}),
        ...(partial.payments || {}),
        activeMethods: {
          ...(this.db.settings.payments?.activeMethods || {
            upi: true,
            qr: true,
            bankTransfer: false,
            cod: true,
          }),
          ...(partial.payments?.activeMethods || {}),
        },
      },
    };
    this.persist();
    return this.db.settings;
  }

  // --------------------------------------------------------------------------
  // STAFF USERS & AUTH
  // --------------------------------------------------------------------------
  getStaffUserByUsername(username: string): StoredStaffUser | undefined {
    return this.db.staffUsers.find(
      (s) => s.username.toLowerCase() === username.trim().toLowerCase()
    );
  }

  getStaffUserById(id: string): StoredStaffUser | undefined {
    return this.db.staffUsers.find((s) => s.id === id);
  }

  getAllStaffUsers(): StaffUser[] {
    return this.db.staffUsers.map(({ passwordHash, salt, ...safe }) => safe);
  }

  // Admin credentials cannot be changed by anyone (Permanent & Locked)
  changeAdminPassword(username: string, _currentPass: string, _newPass: string): { success: boolean; error?: string } {
    return {
      success: false,
      error: 'Admin credentials (Kitchencruze12) are permanent and locked for security. Cannot be modified.',
    };
  }

  // Admin can update Chef and Delivery Partner credentials
  updateStaffCredentials(role: 'chef' | 'delivery', newUsername?: string, newPassword?: string): { success: boolean; error?: string } {
    const staff = this.db.staffUsers.find((s) => s.role === role);
    if (!staff) {
      return { success: false, error: `${role} account not found` };
    }

    if (newUsername && newUsername.trim()) {
      const trimmed = newUsername.trim();
      // Check collision
      const collision = this.db.staffUsers.find((s) => s.id !== staff.id && s.username.toLowerCase() === trimmed.toLowerCase());
      if (collision) {
        return { success: false, error: `Username "${trimmed}" is already taken by another account.` };
      }
      staff.username = trimmed;
      if (role === 'delivery' && this.db.deliveryBoys.length > 0) {
        this.db.deliveryBoys[0].username = trimmed;
      }
    }

    if (newPassword && newPassword.trim()) {
      const pass = newPassword.trim();
      if (pass.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long' };
      }
      const updated = hashPassword(pass);
      staff.passwordHash = updated.hash;
      staff.salt = updated.salt;
    }

    this.addAuditLog('Kitchencruze12', 'admin', 'STAFF_CREDENTIALS_UPDATED', `Admin updated credentials for ${role} (username: ${staff.username}).`);
    this.persist();
    return { success: true };
  }

  // --------------------------------------------------------------------------
  // DELIVERY BOY MANAGEMENT & TRACKING
  // --------------------------------------------------------------------------
  getDeliveryBoys(): (DeliveryBoy & {
    totalDeliveredOrders: number;
    totalDeliveryDistanceKm: number;
    currentOrders: number;
    cancelledOrders: number;
    todayOrders: number;
  })[] {
    const todayStr = new Date().toISOString().split('T')[0];

    return this.db.deliveryBoys.map((dboy) => {
      const assignedOrders = this.db.orders.filter(
        (o) =>
          o.assignedDeliveryBoyId === dboy.id ||
          o.assignedDeliveryBoyNumber === dboy.deliveryBoyNumber ||
          (o.assignedDeliveryBoyName && o.assignedDeliveryBoyName.toLowerCase() === dboy.name.toLowerCase())
      );

      const deliveredOrders = assignedOrders.filter(
        (o) => o.status === 'Delivered' || o.deliveryStatus === 'Delivered'
      );

      const totalDeliveredOrders = deliveredOrders.length;
      // Calculate total delivery distance strictly from delivered orders
      const totalDeliveryDistanceKm = deliveredOrders.reduce(
        (sum, o) => sum + (o.deliveryDistanceKm || 0),
        0
      );

      const currentOrders = assignedOrders.filter(
        (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
      ).length;

      const cancelledOrders = assignedOrders.filter((o) => o.status === 'Cancelled').length;

      const todayOrders = assignedOrders.filter((o) => {
        const orderDate = (o.deliveredAt || o.createdAt || '').split('T')[0];
        return orderDate === todayStr;
      }).length;

      return {
        ...dboy,
        totalDeliveredOrders,
        totalDeliveryDistanceKm: Math.round(totalDeliveryDistanceKm * 10) / 10,
        currentOrders,
        cancelledOrders,
        todayOrders,
      };
    });
  }

  getDeliveryBoyById(id: string) {
    const dboy = this.db.deliveryBoys.find((d) => d.id === id || String(d.deliveryBoyNumber) === id);
    if (!dboy) return null;

    const assignedOrders = this.db.orders.filter(
      (o) =>
        o.assignedDeliveryBoyId === dboy.id ||
        o.assignedDeliveryBoyNumber === dboy.deliveryBoyNumber ||
        (o.assignedDeliveryBoyName && o.assignedDeliveryBoyName.toLowerCase() === dboy.name.toLowerCase())
    );

    const deliveredOrders = assignedOrders.filter(
      (o) => o.status === 'Delivered' || o.deliveryStatus === 'Delivered'
    );
    const totalDeliveredOrders = deliveredOrders.length;
    const totalDeliveryDistanceKm = Math.round(
      deliveredOrders.reduce((sum, o) => sum + (o.deliveryDistanceKm || 0), 0) * 10
    ) / 10;
    const currentOrders = assignedOrders.filter(
      (o) => o.status !== 'Delivered' && o.status !== 'Cancelled'
    ).length;
    const cancelledOrders = assignedOrders.filter((o) => o.status === 'Cancelled').length;

    return {
      ...dboy,
      totalDeliveredOrders,
      totalDeliveryDistanceKm,
      currentOrders,
      cancelledOrders,
      orderHistory: assignedOrders.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    };
  }

  addDeliveryBoy(data: {
    name: string;
    phone: string;
    username: string;
    password?: string;
    status?: 'active' | 'inactive';
  }): DeliveryBoy {
    const cleanUsername = data.username.trim();
    if (this.db.deliveryBoys.some((d) => d.username.toLowerCase() === cleanUsername.toLowerCase())) {
      throw new Error('Username is already taken by another delivery boy');
    }

    const deliveryBoyNumber = this.db.nextDeliveryBoyNumber++;
    const id = `delivery-boy-${deliveryBoyNumber}`;
    const password = data.password && data.password.trim() ? data.password.trim() : 'Diliveryboy@12#1';
    const auth = hashPassword(password);

    const newDeliveryBoy: DeliveryBoy = {
      id,
      deliveryBoyNumber,
      name: data.name.trim(),
      phone: data.phone.trim(),
      username: cleanUsername,
      status: data.status || 'active',
      createdAt: new Date().toISOString(),
    };

    this.db.deliveryBoys.push(newDeliveryBoy);

    // Also register or update in staffUsers for delivery login
    const existingStaffIdx = this.db.staffUsers.findIndex(
      (s) => s.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (existingStaffIdx !== -1) {
      this.db.staffUsers[existingStaffIdx] = {
        ...this.db.staffUsers[existingStaffIdx],
        id,
        name: newDeliveryBoy.name,
        phone: newDeliveryBoy.phone,
        status: newDeliveryBoy.status === 'active' ? 'active' : 'deactivated',
        passwordHash: auth.hash,
        salt: auth.salt,
      };
    } else {
      this.db.staffUsers.push({
        id,
        username: cleanUsername,
        email: `${cleanUsername.toLowerCase()}@kitchencruze.local`,
        role: 'delivery',
        name: newDeliveryBoy.name,
        phone: newDeliveryBoy.phone,
        status: newDeliveryBoy.status === 'active' ? 'active' : 'deactivated',
        passwordHash: auth.hash,
        salt: auth.salt,
      });
    }

    this.addAuditLog('Admin', 'admin', 'ADD_DELIVERY_BOY', `Added Delivery Boy #${deliveryBoyNumber}: ${newDeliveryBoy.name}`);
    this.persist();
    return newDeliveryBoy;
  }

  updateDeliveryBoy(
    id: string,
    data: {
      name?: string;
      phone?: string;
      username?: string;
      password?: string;
      status?: 'active' | 'inactive';
    }
  ): DeliveryBoy | null {
    const dboy = this.db.deliveryBoys.find((d) => d.id === id || String(d.deliveryBoyNumber) === id);
    if (!dboy) return null;

    if (data.name !== undefined) dboy.name = data.name.trim();
    if (data.phone !== undefined) dboy.phone = data.phone.trim();
    if (data.status !== undefined) dboy.status = data.status;
    if (data.username !== undefined && data.username.trim() && data.username.trim() !== dboy.username) {
      dboy.username = data.username.trim();
    }
    dboy.updatedAt = new Date().toISOString();

    const staff = this.db.staffUsers.find((s) => s.id === dboy.id || s.username.toLowerCase() === dboy.username.toLowerCase());
    if (staff) {
      if (data.name) staff.name = data.name.trim();
      if (data.phone) staff.phone = data.phone.trim();
      if (data.username) staff.username = data.username.trim();
      if (data.status) staff.status = data.status === 'active' ? 'active' : 'deactivated';
      if (data.password && data.password.trim()) {
        const auth = hashPassword(data.password.trim());
        staff.passwordHash = auth.hash;
        staff.salt = auth.salt;
      }
    }

    this.persist();
    return dboy;
  }

  toggleDeliveryBoyStatus(id: string): DeliveryBoy | null {
    const dboy = this.db.deliveryBoys.find((d) => d.id === id || String(d.deliveryBoyNumber) === id);
    if (!dboy) return null;

    dboy.status = dboy.status === 'active' ? 'inactive' : 'active';
    dboy.updatedAt = new Date().toISOString();

    const staff = this.db.staffUsers.find((s) => s.id === dboy.id || s.username.toLowerCase() === dboy.username.toLowerCase());
    if (staff) {
      staff.status = dboy.status === 'active' ? 'active' : 'deactivated';
    }

    this.persist();
    return dboy;
  }

  resetDeliveryBoyPassword(id: string, newPass: string): boolean {
    const dboy = this.db.deliveryBoys.find((d) => d.id === id || String(d.deliveryBoyNumber) === id);
    if (!dboy) return false;

    const staff = this.db.staffUsers.find((s) => s.id === dboy.id || s.username.toLowerCase() === dboy.username.toLowerCase());
    if (staff) {
      const auth = hashPassword(newPass.trim());
      staff.passwordHash = auth.hash;
      staff.salt = auth.salt;
      this.persist();
      return true;
    }
    return false;
  }

  deleteDeliveryBoy(id: string): boolean {
    const index = this.db.deliveryBoys.findIndex(
      (d) => d.id === id || String(d.deliveryBoyNumber) === id
    );
    if (index === -1) return false;

    const boy = this.db.deliveryBoys[index];
    this.db.deliveryBoys.splice(index, 1);

    // Also remove from staffUsers
    const staffIndex = this.db.staffUsers.findIndex(
      (s) => s.id === boy.id || s.username.toLowerCase() === boy.username.toLowerCase()
    );
    if (staffIndex !== -1) {
      this.db.staffUsers.splice(staffIndex, 1);
    }

    // Unassign from any active orders
    this.db.orders.forEach((o) => {
      if (
        o.assignedDeliveryBoyId === boy.id ||
        o.assignedDeliveryBoyNumber === boy.deliveryBoyNumber ||
        (o.assignedDeliveryBoyName && o.assignedDeliveryBoyName.toLowerCase() === boy.name.toLowerCase())
      ) {
        if (o.status !== 'Delivered' && o.status !== 'Cancelled') {
          o.assignedDeliveryBoyId = undefined;
          o.assignedDeliveryBoyName = undefined;
          o.assignedDeliveryBoyNumber = undefined;
          o.deliveryStatus = 'Unassigned';
        }
      }
    });

    this.addAuditLog('Admin', 'admin', 'DELETE_DELIVERY_BOY', `Deleted Delivery Boy #${boy.deliveryBoyNumber}: ${boy.name}`);
    this.persist();
    return true;
  }

  getDeliveryStats() {
    const deliveryBoys = this.getDeliveryBoys();
    const deliveredOrders = this.db.orders.filter((o) => o.status === 'Delivered' || o.deliveryStatus === 'Delivered');
    const cancelledOrders = this.db.orders.filter((o) => o.status === 'Cancelled');
    const pendingOrders = this.db.orders.filter((o) => o.orderType === 'Delivery' && o.status !== 'Delivered' && o.status !== 'Cancelled');

    const totalDeliveryDistanceKm = Math.round(
      deliveredOrders.reduce((sum, o) => sum + (o.deliveryDistanceKm || 0), 0) * 10
    ) / 10;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayDeliveries = deliveredOrders.filter((o) => (o.deliveredAt || o.createdAt || '').split('T')[0] === todayStr).length;

    return {
      totalDeliveryBoys: deliveryBoys.length,
      activeDeliveryBoys: deliveryBoys.filter((d) => d.status === 'active').length,
      totalDeliveredOrders: deliveredOrders.length,
      totalCancelledOrders: cancelledOrders.length,
      totalDeliveryDistanceKm,
      todayDeliveries,
      pendingDeliveries: pendingOrders.length,
      restaurantLocation: this.db.settings.location,
      deliveryRadiusKm: this.db.settings.deliveryRadiusKm || 5,
    };
  }

  // --------------------------------------------------------------------------
  // CUSTOMERS
  // --------------------------------------------------------------------------
  getCustomerById(id: string): StoredCustomer | undefined {
    return this.db.customers.find((c) => c.id === id);
  }

  getCustomerByEmailOrUsername(identifier: string): StoredCustomer | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.db.customers.find(
      (c) => c.email.toLowerCase() === clean || c.username.toLowerCase() === clean || c.phone === clean
    );
  }

  getAllCustomers(): Customer[] {
    return this.db.customers.map(({ passwordHash, salt, ...safe }) => safe);
  }

  createCustomer(data: {
    fullName: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    preferredLanguage?: 'en' | 'hi' | 'pa' | 'ur' | 'bn' | 'mr';
    initialAddress?: any;
  }): Customer {
    const { hash, salt } = hashPassword(data.password);
    const newId = 'cust-' + Date.now();
    const newCust: StoredCustomer = {
      id: newId,
      fullName: data.fullName.trim(),
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      preferredLanguage: data.preferredLanguage || 'en',
      savedAddresses: data.initialAddress
        ? [
            {
              id: 'addr-' + Date.now(),
              label: 'Home',
              house: data.initialAddress.house || '',
              street: data.initialAddress.street || '',
              area: data.initialAddress.area || '',
              city: data.initialAddress.city || '',
              pincode: data.initialAddress.pincode || '',
              landmark: data.initialAddress.landmark || '',
              deliveryInstructions: data.initialAddress.deliveryInstructions || '',
              isDefault: true,
            },
          ]
        : [],
      status: 'active',
      createdAt: new Date().toISOString(),
      passwordHash: hash,
      salt,
    };

    this.db.customers.push(newCust);
    // Requirement 1: Automatically create personal wallet for registered customer (zero balance)
    this.getOrCreateWallet(newCust.id);
    this.addAuditLog(newCust.username, 'customer', 'REGISTER', `New customer registered: ${newCust.fullName} (${newCust.phone})`);
    this.persist();

    const { passwordHash, salt: _, ...safe } = newCust;
    return safe;
  }

  updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const cust = this.db.customers.find((c) => c.id === id);
    if (!cust) return null;

    if (updates.fullName !== undefined) cust.fullName = updates.fullName;
    if (updates.email !== undefined) cust.email = updates.email;
    if (updates.phone !== undefined) cust.phone = updates.phone;
    if ((updates as any).avatar !== undefined) (cust as any).avatar = (updates as any).avatar;
    if ((updates as any).profilePic !== undefined) (cust as any).profilePic = (updates as any).profilePic;
    if (updates.deliveryAddress !== undefined) cust.deliveryAddress = updates.deliveryAddress;
    if (updates.landmark !== undefined) cust.landmark = updates.landmark;
    if (updates.pincode !== undefined) cust.pincode = updates.pincode;
    if (updates.preferredLanguage !== undefined) cust.preferredLanguage = updates.preferredLanguage;
    if (updates.savedAddresses !== undefined) cust.savedAddresses = updates.savedAddresses;
    if (updates.status !== undefined) cust.status = updates.status;

    this.persist();
    const { passwordHash, salt, ...safe } = cust;
    return safe;
  }

  toggleCustomerStatus(id: string): Customer | null {
    const cust = this.db.customers.find((c) => c.id === id);
    if (!cust) return null;
    cust.status = cust.status === 'active' ? 'deactivated' : 'active';
    this.persist();
    const { passwordHash, salt, ...safe } = cust;
    return safe;
  }

  deleteCustomer(id: string): boolean {
    const index = this.db.customers.findIndex((c) => c.id === id);
    if (index === -1) return false;
    const cust = this.db.customers[index];
    this.db.customers.splice(index, 1);
    delete this.db.wishlists[id];
    this.addAuditLog('Admin', 'admin', 'DELETE_CUSTOMER', `Deleted Customer: ${cust.fullName} (${cust.phone || cust.email})`);
    this.persist();
    return true;
  }

  // --------------------------------------------------------------------------
  // CATEGORIES
  // --------------------------------------------------------------------------
  getCategories(): Category[] {
    return this.db.categories.sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  addCategory(data: Partial<Category>): Category {
    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name: data.name || '',
      description: data.description || '',
      image: data.image || '',
      order: (this.db.categories.length + 1),
      active: data.active !== undefined ? data.active : true,
    };
    this.db.categories.push(newCat);
    this.persist();
    return newCat;
  }

  updateCategory(id: string, data: Partial<Category>): Category | null {
    const index = this.db.categories.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.db.categories[index] = { ...this.db.categories[index], ...data };
    this.persist();
    return this.db.categories[index];
  }

  deleteCategory(id: string): boolean {
    const index = this.db.categories.findIndex((c) => c.id === id);
    if (index === -1) return false;
    this.db.categories.splice(index, 1);
    this.persist();
    return true;
  }

  reorderCategories(orderedIds: string[]): Category[] {
    orderedIds.forEach((id, index) => {
      const cat = this.db.categories.find((c) => c.id === id);
      if (cat) {
        cat.order = index + 1;
      }
    });
    this.persist();
    return this.getCategories();
  }

  // --------------------------------------------------------------------------
  // PRODUCTS
  // --------------------------------------------------------------------------
  getProducts(): Product[] {
    return this.db.products;
  }

  getProductById(id: string): Product | undefined {
    return this.db.products.find((p) => p.id === id);
  }

  addProduct(productData: Partial<Product>): Product {
    const newProduct: Product = {
      id: 'kc-' + Date.now(),
      name: productData.name || '',
      category: productData.category || 'General',
      subcategory: productData.subcategory || '',
      image: productData.image || '',
      additionalImages: productData.additionalImages || [],
      description: productData.description || '',
      price: Number(productData.price) || 0,
      discountPrice: productData.discountPrice ? Number(productData.discountPrice) : undefined,
      weight: productData.weight ? Number(productData.weight) : undefined,
      preparationTime: productData.preparationTime ? Number(productData.preparationTime) : 20,
      isVeg: Boolean(productData.isVeg),
      isAvailable: productData.isAvailable !== undefined ? Boolean(productData.isAvailable) : true,
      stockStatus: productData.stockStatus || 'In Stock',
      tags: productData.tags || [],
      ingredients: productData.ingredients || [],
      allergens: productData.allergens || [],
      customizations: productData.customizations || [],
      addons: productData.addons || [],
      specialInstructionsAllowed: productData.specialInstructionsAllowed !== false,
      isFeatured: Boolean(productData.isFeatured),
      isBestSeller: Boolean(productData.isBestSeller),
      isNewArrival: Boolean(productData.isNewArrival),
      active: productData.active !== undefined ? Boolean(productData.active) : true,
      rating: 0,
      reviewCount: 0,
    };
    this.db.products.push(newProduct);

    // Auto-create category in categories list if not already present
    if (newProduct.category && newProduct.category.trim() !== '') {
      const exists = this.db.categories.some(
        (c) => c.name.toLowerCase() === newProduct.category.trim().toLowerCase()
      );
      if (!exists) {
        this.db.categories.push({
          id: 'cat-' + Date.now(),
          name: newProduct.category.trim(),
          order: this.db.categories.length + 1,
          active: true,
        });
      }
    }

    this.persist();
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const index = this.db.products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.db.products[index] = { ...this.db.products[index], ...updates };
    this.persist();
    return this.db.products[index];
  }

  deleteProduct(id: string): boolean {
    const index = this.db.products.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.db.products.splice(index, 1);
    this.persist();
    return true;
  }

  // --------------------------------------------------------------------------
  // OFFERS / COUPONS
  // --------------------------------------------------------------------------
  getOffers(): Offer[] {
    return this.db.offers;
  }

  getActiveOffers(): Offer[] {
    return this.db.offers.filter((o) => o.active);
  }

  addOffer(offerData: Partial<Offer>): Offer {
    const newOffer: Offer = {
      id: 'off-' + Date.now(),
      title: offerData.title || '',
      description: offerData.description || '',
      discountType: offerData.discountType || 'percentage',
      discountValue: Number(offerData.discountValue) || 0,
      couponCode: (offerData.couponCode || '').toUpperCase().trim(),
      minimumOrder: Number(offerData.minimumOrder) || 0,
      maximumDiscount: offerData.maximumDiscount ? Number(offerData.maximumDiscount) : undefined,
      startDate: offerData.startDate || new Date().toISOString(),
      endDate: offerData.endDate,
      bannerImage: offerData.bannerImage,
      active: offerData.active !== false,
    };
    this.db.offers.push(newOffer);
    this.persist();
    return newOffer;
  }

  updateOffer(id: string, updates: Partial<Offer>): Offer | null {
    const index = this.db.offers.findIndex((o) => o.id === id);
    if (index === -1) return null;
    this.db.offers[index] = { ...this.db.offers[index], ...updates };
    this.persist();
    return this.db.offers[index];
  }

  deleteOffer(id: string): boolean {
    const index = this.db.offers.findIndex((o) => o.id === id);
    if (index === -1) return false;
    this.db.offers.splice(index, 1);
    this.persist();
    return true;
  }

  // --------------------------------------------------------------------------
  // WISHLISTS
  // --------------------------------------------------------------------------
  getWishlist(customerId: string): Product[] {
    const ids = this.db.wishlists[customerId] || [];
    return this.db.products.filter((p) => ids.includes(p.id));
  }

  toggleWishlist(customerId: string, productId: string): boolean {
    if (!this.db.wishlists[customerId]) {
      this.db.wishlists[customerId] = [];
    }
    const list = this.db.wishlists[customerId];
    const index = list.indexOf(productId);
    let added = false;
    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(productId);
      added = true;
    }
    this.persist();
    return added;
  }

  // --------------------------------------------------------------------------
  // REVIEWS
  // --------------------------------------------------------------------------
  getReviewsByProductId(productId: string): Review[] {
    return this.db.reviews.filter((r) => r.productId === productId && r.status === 'approved');
  }

  getAllReviews(): Review[] {
    return this.db.reviews;
  }

  addReview(data: {
    customerId: string;
    customerName: string;
    productId: string;
    productName: string;
    orderId: string;
    rating: number;
    comment: string;
    photoUrl?: string;
  }): Review {
    const newReview: Review = {
      id: 'rev-' + Date.now(),
      customerId: data.customerId,
      customerName: data.customerName,
      productId: data.productId,
      productName: data.productName,
      orderId: data.orderId,
      rating: Math.max(1, Math.min(5, data.rating)),
      comment: data.comment.trim(),
      photoUrl: data.photoUrl,
      status: 'approved', // Auto-approved or moderation queue
      createdAt: new Date().toISOString(),
    };
    this.db.reviews.unshift(newReview);

    // Update product rating summary
    const prodReviews = this.db.reviews.filter((r) => r.productId === data.productId && r.status === 'approved');
    const totalRating = prodReviews.reduce((sum, r) => sum + r.rating, 0);
    const prod = this.db.products.find((p) => p.id === data.productId);
    if (prod) {
      prod.reviewCount = prodReviews.length;
      prod.rating = Number((totalRating / prodReviews.length).toFixed(1));
    }

    this.persist();
    return newReview;
  }

  updateReviewStatus(id: string, status: 'approved' | 'rejected'): Review | null {
    const rev = this.db.reviews.find((r) => r.id === id);
    if (!rev) return null;
    rev.status = status;

    // Recalculate rating
    const prodReviews = this.db.reviews.filter((r) => r.productId === rev.productId && r.status === 'approved');
    const prod = this.db.products.find((p) => p.id === rev.productId);
    if (prod) {
      prod.reviewCount = prodReviews.length;
      prod.rating = prodReviews.length > 0 ? Number((prodReviews.reduce((s, r) => s + r.rating, 0) / prodReviews.length).toFixed(1)) : 0;
    }

    this.persist();
    return rev;
  }

  deleteReview(id: string): boolean {
    const index = this.db.reviews.findIndex((r) => r.id === id);
    if (index === -1) return false;
    const rev = this.db.reviews.splice(index, 1)[0];

    // Recalculate rating for the product
    const prodReviews = this.db.reviews.filter((r) => r.productId === rev.productId && r.status === 'approved');
    const prod = this.db.products.find((p) => p.id === rev.productId);
    if (prod) {
      prod.reviewCount = prodReviews.length;
      prod.rating = prodReviews.length > 0 ? Number((prodReviews.reduce((s, r) => s + r.rating, 0) / prodReviews.length).toFixed(1)) : 0;
    }

    this.persist();
    return true;
  }

  // --------------------------------------------------------------------------
  // DELIVERY CHARGE CALCULATION (DISTANCE & WEIGHT SLABS)
  // --------------------------------------------------------------------------
  calculateDeliveryCharge(subtotal: number, distanceKm: number = 0, totalWeightGrams: number = 0): {
    isFree: boolean;
    distanceCharge: number;
    weightCharge: number;
    totalDeliveryFee: number;
  } {
    const rules = this.db.settings.deliveryRules;
    if (!rules) {
      return {
        isFree: true,
        distanceCharge: 0,
        weightCharge: 0,
        totalDeliveryFee: 0,
      };
    }

    // Free delivery threshold if configured by Admin (> 0 and subtotal >= threshold)
    if (rules.freeDeliveryThreshold && rules.freeDeliveryThreshold > 0 && subtotal >= rules.freeDeliveryThreshold) {
      return {
        isFree: true,
        distanceCharge: 0,
        weightCharge: 0,
        totalDeliveryFee: 0,
      };
    }

    // Distance charge based strictly on Admin-configured rules
    let distanceCharge = 0;
    const slabs = rules.distanceSlabs || [];
    if (slabs.length > 0) {
      const distanceSlab = slabs.find(
        (s) => distanceKm >= s.minDistanceKm && (distanceKm < s.maxDistanceKm || (distanceKm === s.maxDistanceKm && s.maxDistanceKm === slabs[slabs.length - 1].maxDistanceKm))
      );
      if (distanceSlab) {
        distanceCharge = Number(distanceSlab.charge) || 0;
      } else {
        const lastSlab = slabs[slabs.length - 1];
        if (distanceKm > lastSlab.maxDistanceKm) {
          distanceCharge = Number(lastSlab.charge) || 0;
        } else if (distanceKm <= 0) {
          const firstSlab = slabs[0];
          distanceCharge = firstSlab.minDistanceKm === 0 ? Number(firstSlab.charge) || 0 : 0;
        } else {
          distanceCharge = Number(slabs[0].charge) || 0;
        }
      }
    } else if (rules.deliveryChargePerKm && rules.deliveryChargePerKm > 0 && distanceKm > 0) {
      distanceCharge = Math.round(rules.deliveryChargePerKm * distanceKm);
    } else if (rules.baseDeliveryCharge && rules.baseDeliveryCharge > 0) {
      distanceCharge = Number(rules.baseDeliveryCharge) || 0;
    } else if (this.db.settings.deliveryCharge && this.db.settings.deliveryCharge > 0) {
      distanceCharge = Number(this.db.settings.deliveryCharge) || 0;
    } else {
      // If Admin has not configured delivery charges, delivery charge MUST be 0
      distanceCharge = 0;
    }

    return {
      isFree: distanceCharge === 0,
      distanceCharge,
      weightCharge: 0,
      totalDeliveryFee: distanceCharge,
    };
  }

  // --------------------------------------------------------------------------
  // ORDERS
  // --------------------------------------------------------------------------
  getOrders(): Order[] {
    return this.db.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrdersByCustomer(customerId: string): Order[] {
    return this.db.orders
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrderById(id: string): Order | undefined {
    return this.db.orders.find((o) => o.id === id);
  }

  deleteOrder(id: string): boolean {
    const index = this.db.orders.findIndex((o) => o.id === id);
    if (index === -1) return false;
    const removed = this.db.orders.splice(index, 1)[0];
    this.addAuditLog('Admin', 'admin', 'DELETE_ORDER', `Deleted order #${id} (${removed.customerName || 'Customer'})`);
    this.persist();
    return true;
  }

  deleteOrders(filter: 'all' | 'cancelled' | 'delivered' | string[]): number {
    const initialCount = this.db.orders.length;
    if (Array.isArray(filter)) {
      this.db.orders = this.db.orders.filter((o) => !filter.includes(o.id));
    } else if (filter === 'all') {
      this.db.orders = [];
    } else if (filter === 'cancelled') {
      this.db.orders = this.db.orders.filter((o) => o.status !== 'Cancelled');
    } else if (filter === 'delivered') {
      this.db.orders = this.db.orders.filter((o) => o.status !== 'Delivered');
    }
    const deletedCount = initialCount - this.db.orders.length;
    this.addAuditLog('Admin', 'admin', 'DELETE_ORDERS', `Batch deleted ${deletedCount} orders (${typeof filter === 'string' ? filter : 'selected'})`);
    this.persist();
    return deletedCount;
  }

  createOrder(orderData: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    deliveryAddress?: any;
    orderType: 'Delivery' | 'Pickup';
    items: any[];
    couponCode?: string;
    paymentMethod: any;
    paymentReference?: string;
    paymentScreenshot?: string;
    specialInstructions?: string;
    distanceKm?: number;
    customerLatitude?: number;
    customerLongitude?: number;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    walletAmountUsed?: number;
    loyaltyPointsUsed?: number;
  }): Order {
    // 1. Calculate subtotal strictly using trusted database product prices
    let subtotal = 0;
    const validatedItems = orderData.items.map((it) => {
      const dbProduct = this.db.products.find((p) => p.id === it.productId);
      const basePrice = dbProduct ? Number(dbProduct.price) : Number(it.price) || 0;
      const addonsTotal = (it.selectedAddons || []).reduce(
        (acc: number, a: any) => acc + (Number(a.price) || 0),
        0
      );
      const unitPrice = basePrice + addonsTotal;
      const itemTotal = unitPrice * it.quantity;
      subtotal += itemTotal;
      return {
        ...it,
        name: dbProduct ? dbProduct.name : it.name,
        price: unitPrice,
        itemTotal,
      };
    });

    const totalWeightGrams = validatedItems.reduce((acc, it) => acc + (it.weight || 250) * it.quantity, 0);

    // Apply Coupon if valid
    let discount = 0;
    if (orderData.couponCode) {
      const coupon = this.db.offers.find(
        (o) => o.couponCode.toUpperCase() === orderData.couponCode?.toUpperCase() && o.active
      );
      if (coupon && subtotal >= coupon.minimumOrder) {
        if (coupon.discountType === 'percentage') {
          discount = Math.round((subtotal * coupon.discountValue) / 100);
          if (coupon.maximumDiscount) discount = Math.min(discount, coupon.maximumDiscount);
        } else {
          discount = coupon.discountValue;
        }
      }
    }

    const couponDiscount = discount;
    const discountedAfterCoupon = Math.max(0, subtotal - couponDiscount);

    // Loyalty Points Redemption for Instant Discount at Checkout
    const rawPointsUsed = Number(orderData.loyaltyPointsUsed) || 0;
    let actualPointsUsed = 0;
    let loyaltyDiscount = 0;
    let custWallet: CustomerWallet | null = null;

    if (rawPointsUsed > 0 && orderData.customerId) {
      custWallet = this.getOrCreateWallet(orderData.customerId);
      const availablePoints = custWallet.coins || 0;
      const rules = this.getLoyaltySettings();
      const conversionRate = rules.conversionRate || 1; // 1 point = ₹1 discount
      const maxDiscountPossible = discountedAfterCoupon;
      const maxPointsUsable = Math.min(availablePoints, Math.ceil(maxDiscountPossible * conversionRate));
      actualPointsUsed = Math.min(maxPointsUsable, rawPointsUsed);

      if (actualPointsUsed > 0) {
        loyaltyDiscount = Math.round((actualPointsUsed / conversionRate) * 100) / 100;
        custWallet.coins = Math.max(0, Math.round((custWallet.coins - actualPointsUsed) * 100) / 100);
        custWallet.totalCoinsRedeemed = Math.round((custWallet.totalCoinsRedeemed + actualPointsUsed) * 100) / 100;
        custWallet.updatedAt = new Date().toISOString();
      }
    }

    const finalDiscountedSubtotal = Math.max(0, discountedAfterCoupon - loyaltyDiscount);
    const totalDiscount = Number((couponDiscount + loyaltyDiscount).toFixed(2));

    // GST: Admin-configured percentage applied strictly according to admin rules
    let gstAmount = 0;
    const gstRate = (this.db.settings.gst && this.db.settings.gst.enabled) ? (this.db.settings.gst.percentage || 0) : 0;
    if (gstRate > 0) {
      gstAmount = parseFloat(((finalDiscountedSubtotal * gstRate) / 100).toFixed(2));
    }

    // Packaging Charge: ₹0 unless explicitly added
    const packagingCharge = 0;

    // Restaurant Delivery Location Coordinates & Delivery Radius
    const restaurantLat = this.db.settings.location?.latitude ?? 19.0760;
    const restaurantLng = this.db.settings.location?.longitude ?? 72.8777;
    const restaurantAddress =
      this.db.settings.location?.address ||
      this.db.settings.address ||
      'Shop 14, Cruze Promenade, Near City Center, Mumbai, 400050';
    const activeRadiusKm = this.db.settings.deliveryRadiusKm || 5;

    // Customer Delivery Location Coordinates
    let customerLat =
      orderData.customerLatitude ?? orderData.deliveryAddress?.latitude;
    let customerLng =
      orderData.customerLongitude ?? orderData.deliveryAddress?.longitude;

    let calculatedDistanceKm = 0;
    let distanceMeters = 0;
    let distanceDisplay = '0 m';

    if (orderData.orderType === 'Delivery') {
      if (
        customerLat !== undefined &&
        customerLng !== undefined &&
        !isNaN(customerLat) &&
        !isNaN(customerLng)
      ) {
        calculatedDistanceKm = calculateHaversineDistanceKm(
          restaurantLat,
          restaurantLng,
          customerLat,
          customerLng
        );
      } else if (orderData.distanceKm !== undefined && !isNaN(orderData.distanceKm)) {
        calculatedDistanceKm = Number(orderData.distanceKm);
        customerLat = restaurantLat;
        customerLng = restaurantLng;
      } else {
        // Fallback: restaurant location so default distance is 0 km
        customerLat = restaurantLat;
        customerLng = restaurantLng;
        calculatedDistanceKm = 0;
      }
      distanceMeters = Math.round(calculatedDistanceKm * 1000);
      distanceDisplay = formatDistanceDisplay(calculatedDistanceKm);
    }

    // Delivery Charge Calculation based strictly on Admin-configured distance rules
    let deliveryCharge = 0;
    let weightCharge = 0;
    if (orderData.orderType === 'Delivery') {
      const calc = this.calculateDeliveryCharge(
        subtotal,
        calculatedDistanceKm,
        0
      );
      deliveryCharge = calc.distanceCharge;
      weightCharge = 0;
    }

    // EXACT REQUIRED FORMULA:
    // GRAND TOTAL = SUBTOTAL (- TOTAL DISCOUNT) + DELIVERY CHARGE + GST
    const grandTotal = parseFloat((finalDiscountedSubtotal + deliveryCharge + gstAmount).toFixed(2));

    const orderId = `KC-${this.db.nextOrderId++}`;

    // Record Loyalty Points Redemption in Wallet Transaction Ledger
    if (actualPointsUsed > 0 && orderData.customerId && custWallet) {
      this.addWalletTransaction({
        customerId: orderData.customerId,
        type: 'POINTS_REDEEM',
        amount: loyaltyDiscount,
        coins: -actualPointsUsed,
        balanceAfter: custWallet.balance,
        coinsAfter: custWallet.coins,
        status: 'SUCCESS',
        orderId,
        description: `Redeemed ${actualPointsUsed} loyalty points for ₹${loyaltyDiscount} discount on Order #${orderId}`,
      });

      this.addAuditLog(
        orderData.customerId,
        'customer',
        'POINTS_REDEEMED',
        `Redeemed ${actualPointsUsed} loyalty points for ₹${loyaltyDiscount} discount on order #${orderId}`
      );
    }

    // Wallet balance deduction & remaining payable calculation
    const rawWalletUsed = Number(orderData.walletAmountUsed) || 0;
    let actualWalletUsed = 0;
    if (rawWalletUsed > 0 && orderData.customerId) {
      const activeWallet = custWallet || this.getOrCreateWallet(orderData.customerId);
      actualWalletUsed = Math.min(grandTotal, Math.min(activeWallet.balance, rawWalletUsed));
      if (actualWalletUsed > 0) {
        this.deductWalletForOrder(orderData.customerId, actualWalletUsed, orderId);
      }
    }

    const remainingPayable = parseFloat(Math.max(0, grandTotal - actualWalletUsed).toFixed(2));
    const isFullyWalletPaid = actualWalletUsed > 0 && remainingPayable === 0;

    const isCod = orderData.paymentMethod === 'Cash on Delivery';
    const isRazorpay = orderData.paymentMethod === 'Razorpay' || orderData.paymentMethod === 'Online Payment';

    const customerAddressStr =
      typeof orderData.deliveryAddress === 'string'
        ? orderData.deliveryAddress
        : `${orderData.deliveryAddress?.house || ''} ${orderData.deliveryAddress?.street || ''} ${orderData.deliveryAddress?.area || ''} ${orderData.deliveryAddress?.city || ''}`.trim();

    const newOrder: Order = {
      id: orderId,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      customerEmail: orderData.customerEmail,
      customer: {
        fullName: orderData.customerName,
        phone: orderData.customerPhone,
        email: orderData.customerEmail,
        deliveryAddress: customerAddressStr || undefined,
        landmark: orderData.deliveryAddress?.landmark,
        pincode: orderData.deliveryAddress?.pincode,
      },
      deliveryAddress: orderData.deliveryAddress,
      orderType: orderData.orderType,
      items: validatedItems,
      subtotal,
      discount: totalDiscount,
      loyaltyPointsUsed: actualPointsUsed,
      loyaltyDiscount: loyaltyDiscount,
      couponCode: orderData.couponCode,
      gstRate,
      gstAmount,
      packagingCharge,
      deliveryCharge,
      weightCharge,
      grandTotal,
      walletAmountUsed: actualWalletUsed,
      remainingPayable,
      eligibleRewardSubtotal: finalDiscountedSubtotal,
      paymentMethod: isFullyWalletPaid ? 'Wallet' : orderData.paymentMethod,
      paymentStatus: isFullyWalletPaid ? 'Paid' : 'Pending',
      paymentReference: orderData.paymentReference,
      paymentScreenshot: orderData.paymentScreenshot,
      razorpayOrderId: orderData.razorpayOrderId,
      razorpayPaymentId: orderData.razorpayPaymentId,
      paidAt: isFullyWalletPaid ? new Date().toISOString() : undefined,
      status: isFullyWalletPaid ? 'Confirmed' : 'Placed',
      chefStatus: isFullyWalletPaid ? 'Accepted' : 'Pending',
      deliveryStatus: 'Unassigned',
      // Permanent historical delivery distance & coordinates data
      restaurantLatitude: restaurantLat,
      restaurantLongitude: restaurantLng,
      restaurantAddress: restaurantAddress,
      customerLatitude: customerLat,
      customerLongitude: customerLng,
      customerDeliveryAddress: customerAddressStr,
      deliveryDistanceMeters: distanceMeters,
      deliveryDistanceKm: calculatedDistanceKm,
      deliveryDistanceDisplay: distanceDisplay,
      deliveryRadiusAtOrder: activeRadiusKm,
      codStatus: isCod ? 'Pending Collection' : 'None',
      codAmount: isCod ? remainingPayable : 0,
      specialInstructions: orderData.specialInstructions,
      statusHistory: [
        {
          status: isFullyWalletPaid ? 'Confirmed' : 'Placed',
          timestamp: new Date().toISOString(),
          updatedBy: orderData.customerName,
          note: isFullyWalletPaid
            ? `Paid entirely with Wallet balance (₹${actualWalletUsed})`
            : isRazorpay
            ? 'Awaiting Razorpay online payment verification'
            : actualWalletUsed > 0
            ? `Partially paid with Wallet (₹${actualWalletUsed}). Remaining: ₹${remainingPayable}`
            : 'Order submitted online',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.orders.unshift(newOrder);

    this.addAuditLog(
      orderData.customerName,
      'customer',
      'ORDER_PLACED',
      `Order ${orderId} placed with grand total of ₹${grandTotal} (Wallet: ₹${actualWalletUsed}, Remaining: ₹${remainingPayable})`
    );

    this.addMessage(
      'New Order',
      `New Order ${orderId} Placed!`,
      `Customer ${orderData.customerName} placed order ${orderId} of ₹${grandTotal}. Distance: ${distanceDisplay}. Payment: ${newOrder.paymentMethod}`,
      orderId
    );

    if (isFullyWalletPaid) {
      this.awardOrderRewards(newOrder.id);
    }

    this.persist();
    return newOrder;
  }

  // --------------------------------------------------------------------------
  // PAYMENTS & RAZORPAY TRANSACTIONS
  // --------------------------------------------------------------------------
  createPaymentTransaction(data: {
    orderId: string;
    razorpayOrderId: string;
    amount: number;
    amountPaise: number;
    currency?: string;
    paymentMethod?: string;
    customerId?: string;
    transactionType?: 'ORDER' | 'WALLET_TOPUP';
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  }): PaymentTransaction {
    if (!this.db.payments) {
      this.db.payments = [];
    }

    const newPayment: PaymentTransaction = {
      id: `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      orderId: data.orderId,
      razorpayOrderId: data.razorpayOrderId,
      amount: data.amount,
      amountPaise: data.amountPaise,
      currency: data.currency || 'INR',
      paymentMethod: data.paymentMethod || 'Razorpay',
      paymentStatus: 'PENDING',
      customerId: data.customerId,
      transactionType: data.transactionType || 'ORDER',
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.db.payments.unshift(newPayment);
    this.persist();
    return newPayment;
  }

  getPaymentByRazorpayOrderId(razorpayOrderId: string): PaymentTransaction | undefined {
    return this.db.payments?.find((p) => p.razorpayOrderId === razorpayOrderId);
  }

  getPaymentByOrderId(orderId: string): PaymentTransaction | undefined {
    return this.db.payments?.find((p) => p.orderId === orderId);
  }

  updatePaymentTransaction(
    idOrRazorpayOrderId: string,
    update: Partial<PaymentTransaction>
  ): PaymentTransaction | undefined {
    if (!this.db.payments) return undefined;
    const payment = this.db.payments.find(
      (p) => p.id === idOrRazorpayOrderId || p.razorpayOrderId === idOrRazorpayOrderId
    );
    if (!payment) return undefined;

    Object.assign(payment, update, { updatedAt: new Date().toISOString() });
    this.persist();
    return payment;
  }

  markOrderAsPaid(
    orderId: string,
    details: {
      razorpayPaymentId: string;
      razorpayOrderId?: string;
      razorpaySignature?: string;
      paymentMethod?: string;
    }
  ): Order | undefined {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return undefined;

    // Idempotency: If already paid, return without duplicate notifications
    if (order.paymentStatus === 'Paid') {
      return order;
    }

    const nowIso = new Date().toISOString();
    order.paymentStatus = 'Paid';
    order.status = 'Confirmed';
    order.chefStatus = 'Accepted';
    order.paymentReference = details.razorpayPaymentId;
    order.razorpayPaymentId = details.razorpayPaymentId;
    if (details.razorpayOrderId) order.razorpayOrderId = details.razorpayOrderId;
    if (details.razorpaySignature) order.razorpaySignature = details.razorpaySignature;
    order.paidAt = nowIso;
    order.updatedAt = nowIso;

    order.statusHistory.push({
      status: 'Confirmed',
      timestamp: nowIso,
      updatedBy: 'Razorpay Payment Gateway',
      note: `Online Payment Verified: ${details.razorpayPaymentId}`,
    });

    // Update payment transaction record if present
    if (this.db.payments) {
      const paymentTx = this.db.payments.find(
        (p) => p.orderId === orderId || (details.razorpayOrderId && p.razorpayOrderId === details.razorpayOrderId)
      );
      if (paymentTx) {
        paymentTx.paymentStatus = 'PAID';
        paymentTx.razorpayPaymentId = details.razorpayPaymentId;
        if (details.razorpaySignature) paymentTx.razorpaySignature = details.razorpaySignature;
        paymentTx.paidAt = nowIso;
        paymentTx.updatedAt = nowIso;
      }
    }

    // Admin Notification: "Payment Received"
    this.addNotification(
      'admin',
      'Payment Received',
      `Order #${order.id} paid online via Razorpay (₹${order.grandTotal}). Payment ID: ${details.razorpayPaymentId}`,
      order.id
    );

    // Admin message
    this.addMessage(
      'Payment Update',
      `Payment Received for Order #${order.id}`,
      `Customer ${order.customerName} completed online payment of ₹${order.grandTotal} via Razorpay. Reference: ${details.razorpayPaymentId}`,
      order.id
    );

    this.addAuditLog(
      'Razorpay',
      'system',
      'PAYMENT_VERIFIED',
      `Payment of ₹${order.grandTotal} verified for order #${order.id} (Razorpay ID: ${details.razorpayPaymentId})`
    );

    // Automatically award rewards on verified online payment
    this.awardOrderRewards(order.id);

    this.persist();
    return order;
  }

  updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    updatedBy: string,
    note?: string
  ): Order | null {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.statusHistory.push({
      status,
      timestamp: new Date().toISOString(),
      updatedBy,
      note,
    });

    // Synchronize chef & delivery statuses
    if (status === 'Accepted') order.chefStatus = 'Accepted';
    if (status === 'Preparing') order.chefStatus = 'Preparing';
    if (status === 'Ready') {
      order.chefStatus = 'Ready';
      if (order.orderType === 'Pickup') {
        order.status = 'Ready for Pickup';
      }
    }
    if (status === 'Out for Delivery') order.deliveryStatus = 'Out for Delivery';
    if (status === 'Delivered') {
      order.deliveryStatus = 'Delivered';
      if (!order.deliveredAt) order.deliveredAt = new Date().toISOString();
      if (order.paymentMethod === 'Cash on Delivery') {
        order.paymentStatus = 'Paid';
        order.codStatus = 'Cash Received';
      }
      this.awardOrderRewards(orderId);
    }
    if (status === 'Picked Up') order.deliveryStatus = 'Picked Up';
    if (status === 'Cancelled') {
      this.refundWalletForOrder(orderId);
      this.reverseOrderRewards(orderId);
    }

    this.addAuditLog(updatedBy, 'staff', 'STATUS_UPDATED', `Order ${orderId} updated to ${status}`);
    this.persist();
    return order;
  }

  updateChefStatus(orderId: string, chefStatus: ChefStatus, chefName: string): Order | null {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.chefStatus = chefStatus;
    if (chefStatus === 'Accepted') {
      order.status = 'Accepted';
    } else if (chefStatus === 'Preparing') {
      order.status = 'Preparing';
    } else if (chefStatus === 'Ready') {
      order.status = order.orderType === 'Pickup' ? 'Ready for Pickup' : 'Ready';
    }

    order.updatedAt = new Date().toISOString();
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      updatedBy: chefName,
      note: `Kitchen updated status: ${chefStatus}`,
    });

    this.persist();
    return order;
  }

  assignDelivery(orderId: string, deliveryBoyId: string, deliveryBoyName?: string): Order | null {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return null;

    const dboy =
      this.db.deliveryBoys.find((d) => d.id === deliveryBoyId) ||
      this.db.deliveryBoys.find((d) => String(d.deliveryBoyNumber) === deliveryBoyId) ||
      this.db.deliveryBoys.find((d) => d.name.toLowerCase() === (deliveryBoyName || '').toLowerCase());

    order.assignedDeliveryBoyId = deliveryBoyId;
    order.assignedDeliveryBoyNumber = dboy ? dboy.deliveryBoyNumber : 1;
    order.assignedDeliveryBoyName = dboy ? dboy.name : deliveryBoyName || 'Delivery Partner';
    order.deliveryAssignedAt = new Date().toISOString();
    order.deliveryStatus = 'Assigned';
    order.updatedAt = new Date().toISOString();

    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      updatedBy: 'Admin',
      note: `Assigned to delivery partner #${order.assignedDeliveryBoyNumber} (${order.assignedDeliveryBoyName})`,
    });

    this.persist();
    return order;
  }

  updateDeliveryStatus(
    orderId: string,
    deliveryStatus: DeliveryStatus,
    deliveryBoyName: string
  ): Order | null {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.deliveryStatus = deliveryStatus;
    if (deliveryStatus === 'Picked Up') {
      order.status = 'Picked Up';
    } else if (deliveryStatus === 'Out for Delivery') {
      order.status = 'Out for Delivery';
    } else if (deliveryStatus === 'Delivered') {
      order.status = 'Delivered';
      order.deliveredAt = new Date().toISOString();
      if (order.paymentMethod === 'Cash on Delivery') {
        order.paymentStatus = 'Paid';
        order.codStatus = 'Cash Received';
      }
      this.awardOrderRewards(orderId);
    }

    order.updatedAt = new Date().toISOString();
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      updatedBy: deliveryBoyName,
      note: `Delivery status updated: ${deliveryStatus}`,
    });

    this.persist();
    return order;
  }

  // --------------------------------------------------------------------------
  // COD FLOW
  // --------------------------------------------------------------------------
  recordCodReceived(orderId: string, deliveryBoyId: string, deliveryBoyName: string): Order | null {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.codStatus = 'Cash Pending Handover';
    order.paymentStatus = 'Paid';
    order.updatedAt = new Date().toISOString();

    const existingTx = this.db.codTransactions.find((tx) => tx.orderId === orderId);
    if (!existingTx) {
      this.db.codTransactions.push({
        id: 'cod-' + Date.now(),
        orderId,
        deliveryBoyId,
        deliveryBoyName,
        amount: order.grandTotal,
        collectedAt: new Date().toISOString(),
        status: 'Pending Handover',
      });
    }

    this.addMessage(
      'COD Update',
      `Cash Collected for ${orderId}`,
      `${deliveryBoyName} collected ₹${order.grandTotal} in cash for order ${orderId}. Pending handover.`,
      orderId
    );

    this.persist();
    return order;
  }

  recordCodHandedOver(orderId: string): Order | null {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.codStatus = 'Cash Handed Over';
    order.updatedAt = new Date().toISOString();

    const tx = this.db.codTransactions.find((t) => t.orderId === orderId);
    if (tx) {
      tx.handedOverAt = new Date().toISOString();
      tx.status = 'Handed Over';
    }

    this.persist();
    return order;
  }

  recordCodSettled(orderId: string): Order | null {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.codStatus = 'Cash Settled';
    order.updatedAt = new Date().toISOString();

    const tx = this.db.codTransactions.find((t) => t.orderId === orderId);
    if (tx) {
      tx.settledAt = new Date().toISOString();
      tx.status = 'Settled';
    }

    this.addAuditLog('Admin', 'admin', 'COD_SETTLED', `Cash settled for Order ${orderId}: ₹${order.grandTotal}`);
    this.persist();
    return order;
  }

  getCodTransactions(): CodTransaction[] {
    return this.db.codTransactions;
  }

  // --------------------------------------------------------------------------
  // PAYMENT VERIFICATION
  // --------------------------------------------------------------------------
  verifyPayment(orderId: string, verified: boolean, adminUsername: string): Order | null {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.paymentStatus = verified ? 'Verified' : 'Failed';
    order.updatedAt = new Date().toISOString();

    if (verified) {
      this.awardOrderRewards(orderId);
    }

    order.statusHistory.push({
      status: order.status,
      timestamp: new Date().toISOString(),
      updatedBy: adminUsername,
      note: verified ? 'Payment verified and confirmed by Admin' : 'Payment rejected by Admin',
    });

    this.addAuditLog(adminUsername, 'admin', 'PAYMENT_VERIFIED', `Payment for ${orderId} marked as ${order.paymentStatus}`);
    this.persist();
    return order;
  }

  // --------------------------------------------------------------------------
  // SYSTEM & DATABASE MANAGEMENT
  // --------------------------------------------------------------------------
  seedInitialRestaurantCatalog(force: boolean = false) {
    if (force || this.db.products.length === 0) {
      this.db.products = [...INITIAL_PRODUCTS];
      this.db.categories = [...INITIAL_CATEGORIES];
      this.db.offers = [...INITIAL_OFFERS];
      this.db.reviews = [...INITIAL_REVIEWS];
      this.addAuditLog(
        'System',
        'admin',
        'SYSTEM_DATABASE_SEEDED',
        `Seeded ${INITIAL_PRODUCTS.length} dishes across ${INITIAL_CATEGORIES.length} categories with offers and reviews`
      );
      this.persist();
    }
    return {
      productsCount: this.db.products.length,
      categoriesCount: this.db.categories.length,
      offersCount: this.db.offers.length,
      reviewsCount: this.db.reviews.length,
    };
  }

  getSystemOverview() {
    let dbFileSizeBytes = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        dbFileSizeBytes = fs.statSync(DB_FILE).size;
      }
    } catch {}

    const vegCount = this.db.products.filter((p) => p.isVeg).length;
    const nonVegCount = this.db.products.filter((p) => !p.isVeg).length;
    const activeProducts = this.db.products.filter((p) => p.isAvailable).length;

    const totalOrders = this.db.orders.length;
    const deliveredOrders = this.db.orders.filter((o) => o.status === 'Delivered').length;
    const activeOrders = this.db.orders.filter(
      (o) => o.status !== 'Delivered' && o.status !== 'Picked Up' && o.status !== 'Cancelled'
    ).length;
    const totalRevenue = this.db.orders.reduce(
      (sum, o) => sum + (o.status !== 'Cancelled' ? o.grandTotal : 0),
      0
    );

    return {
      status: 'operational',
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      database: {
        ...this.getDatabaseStatus(),
        fileSizeFormatted: `${(dbFileSizeBytes / 1024).toFixed(1)} KB`,
        totalProducts: this.db.products.length,
        vegProducts: vegCount,
        nonVegProducts: nonVegCount,
        activeProducts,
        totalCategories: this.db.categories.length,
        totalOrders,
        activeOrders,
        deliveredOrders,
        totalRevenue,
        totalCustomers: this.db.customers.length,
        totalDeliveryBoys: this.db.deliveryBoys.length,
        totalOffers: this.db.offers.length,
        totalReviews: this.db.reviews.length,
        totalAuditLogs: this.db.auditLogs.length,
        totalMessages: this.db.messages.length,
      },
    };
  }

  exportDatabase(): DatabaseSchema {
    return this.db;
  }

  importDatabase(imported: any): { success: boolean; message: string; counts: any } {
    if (!imported || typeof imported !== 'object') {
      throw new Error('Invalid JSON database snapshot payload');
    }

    if (Array.isArray(imported.products)) this.db.products = imported.products;
    if (Array.isArray(imported.categories)) this.db.categories = imported.categories;
    if (Array.isArray(imported.offers)) this.db.offers = imported.offers;
    if (Array.isArray(imported.orders)) this.db.orders = imported.orders;
    if (Array.isArray(imported.customers)) this.db.customers = imported.customers;
    if (Array.isArray(imported.deliveryBoys)) this.db.deliveryBoys = imported.deliveryBoys;
    if (Array.isArray(imported.reviews)) this.db.reviews = imported.reviews;
    if (imported.settings) this.db.settings = { ...this.db.settings, ...imported.settings };

    this.addAuditLog('Admin', 'admin', 'SYSTEM_DATABASE_IMPORTED', 'Imported and restored database snapshot from backup');
    this.persist();

    return {
      success: true,
      message: 'Database snapshot successfully restored',
      counts: {
        products: this.db.products.length,
        categories: this.db.categories.length,
        orders: this.db.orders.length,
        customers: this.db.customers.length,
      },
    };
  }

  // --------------------------------------------------------------------------
  // CUSTOMER WALLETS, REWARDS & CASHBACK MANAGEMENT
  // --------------------------------------------------------------------------

  getOrCreateWallet(customerId: string): CustomerWallet {
    if (!this.db.wallets) {
      this.db.wallets = {};
    }
    if (!this.db.wallets[customerId]) {
      this.db.wallets[customerId] = {
        customerId,
        balance: 0,
        purchasedBalance: 0,
        convertedBalance: 0,
        cashbackBalance: 0,
        coins: 0,
        totalCoinsEarned: 0,
        totalCoinsRedeemed: 0,
        totalCashbackEarned: 0,
        totalMoneyAdded: 0,
        totalMoneySpent: 0,
        pendingTransactions: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.persist();
    }
    return this.db.wallets[customerId];
  }

  getWallet(customerId: string): CustomerWallet {
    return this.getOrCreateWallet(customerId);
  }

  getAllWallets(): (CustomerWallet & { customer?: Customer })[] {
    if (!this.db.wallets) {
      this.db.wallets = {};
    }
    // Ensure all registered customers have an active wallet entry
    for (const c of this.db.customers) {
      this.getOrCreateWallet(c.id);
    }
    return Object.values(this.db.wallets).map((w) => {
      const c = this.getCustomerById(w.customerId);
      const safeCustomer = c ? (({ passwordHash, salt, ...safe }) => safe)(c) : undefined;
      return {
        ...w,
        customer: safeCustomer,
      };
    });
  }

  getWalletTransactions(customerId?: string): WalletTransaction[] {
    if (!this.db.walletTransactions) {
      this.db.walletTransactions = [];
    }
    if (customerId) {
      return this.db.walletTransactions
        .filter((t) => t.customerId === customerId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    return [...this.db.walletTransactions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  addWalletTransaction(
    tx: Omit<WalletTransaction, 'id' | 'timestamp'>
  ): WalletTransaction {
    if (!this.db.walletTransactions) {
      this.db.walletTransactions = [];
    }
    const newTx: WalletTransaction = {
      ...tx,
      id: `WTX-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString(),
    };
    this.db.walletTransactions.unshift(newTx);
    return newTx;
  }

  topupWallet(
    customerId: string,
    amount: number,
    paymentRef: string,
    paymentMethod: string,
    idempotencyKey?: string
  ): { success: boolean; wallet: CustomerWallet; transaction: WalletTransaction; alreadyCredited?: boolean } {
    if (amount <= 0 || isNaN(amount)) {
      throw new Error('Top-up amount must be greater than zero');
    }

    const rules = this.getLoyaltySettings();
    if (amount < (rules.minTopupAmount || 10)) {
      throw new Error(`Minimum top-up amount is ₹${rules.minTopupAmount || 10}`);
    }
    if (amount > (rules.maxTopupAmount || 10000)) {
      throw new Error(`Maximum top-up amount is ₹${rules.maxTopupAmount || 10000}`);
    }

    // Idempotency & duplicate credit protection (Requirement 2 & 14)
    if (idempotencyKey) {
      const existing = this.db.walletTransactions.find(
        (t) => t.idempotencyKey === idempotencyKey && t.status === 'SUCCESS'
      );
      if (existing) {
        return {
          success: true,
          wallet: this.getOrCreateWallet(customerId),
          transaction: existing,
          alreadyCredited: true,
        };
      }
    }

    if (paymentRef && paymentRef.trim()) {
      const existingRef = this.db.walletTransactions.find(
        (t) => t.paymentReference === paymentRef.trim() && t.status === 'SUCCESS'
      );
      if (existingRef) {
        return {
          success: true,
          wallet: this.getOrCreateWallet(customerId),
          transaction: existingRef,
          alreadyCredited: true,
        };
      }
    }

    const wallet = this.getOrCreateWallet(customerId);
    wallet.purchasedBalance = Number((wallet.purchasedBalance + amount).toFixed(2));
    wallet.balance = Number((wallet.balance + amount).toFixed(2));
    wallet.totalMoneyAdded = Number((wallet.totalMoneyAdded + amount).toFixed(2));
    wallet.updatedAt = new Date().toISOString();

    const tx = this.addWalletTransaction({
      customerId,
      type: 'TOPUP',
      amount,
      balanceAfter: wallet.balance,
      coinsAfter: wallet.coins,
      status: 'SUCCESS',
      paymentReference: paymentRef,
      paymentMethod,
      description: `Added ₹${amount} to wallet via ${paymentMethod} (Ref: ${paymentRef})`,
      idempotencyKey,
    });

    this.addAuditLog(
      customerId,
      'customer',
      'WALLET_TOPUP',
      `Customer added ₹${amount} via ${paymentMethod} (Tx: ${tx.id})`
    );

    this.persist();
    return { success: true, wallet, transaction: tx };
  }

  convertCoinsToMoney(
    customerId: string,
    coinsToConvert: number
  ): { success: boolean; coinsConverted: number; moneyCredited: number; wallet: CustomerWallet; transaction: WalletTransaction } {
    if (coinsToConvert <= 0 || isNaN(coinsToConvert)) {
      throw new Error('Please select a valid coin amount to convert');
    }

    const wallet = this.getOrCreateWallet(customerId);
    if (wallet.coins < coinsToConvert) {
      throw new Error(`Insufficient reward coins. You have ${wallet.coins} coins available.`);
    }

    const rules = this.getLoyaltySettings();
    const minRedemption = rules.minCoinRedemption || 10;
    if (coinsToConvert < minRedemption) {
      throw new Error(`Minimum ${minRedemption} coins required for conversion.`);
    }

    const conversionRate = rules.conversionRate || 10;
    const moneyCredited = Math.round((coinsToConvert / conversionRate) * 100) / 100;

    // Deduct coins and credit money atomically
    wallet.coins = Math.max(0, Math.round((wallet.coins - coinsToConvert) * 100) / 100);
    wallet.convertedBalance = Number((wallet.convertedBalance + moneyCredited).toFixed(2));
    wallet.balance = Number((wallet.balance + moneyCredited).toFixed(2));
    wallet.totalCoinsRedeemed = Math.round((wallet.totalCoinsRedeemed + coinsToConvert) * 100) / 100;
    wallet.updatedAt = new Date().toISOString();

    const tx = this.addWalletTransaction({
      customerId,
      type: 'COIN_CONVERT',
      amount: moneyCredited,
      coins: -coinsToConvert,
      balanceAfter: wallet.balance,
      coinsAfter: wallet.coins,
      status: 'SUCCESS',
      description: `Converted ${coinsToConvert} reward coins to ₹${moneyCredited} wallet balance (${conversionRate} coins = ₹1)`,
    });

    this.addAuditLog(
      customerId,
      'customer',
      'COINS_CONVERTED',
      `Converted ${coinsToConvert} coins to ₹${moneyCredited} (Tx: ${tx.id})`
    );

    this.persist();
    return {
      success: true,
      coinsConverted: coinsToConvert,
      moneyCredited,
      wallet,
      transaction: tx,
    };
  }

  deductWalletForOrder(
    customerId: string,
    amount: number,
    orderId: string
  ): { success: boolean; amountDeducted: number; wallet: CustomerWallet; transaction: WalletTransaction } {
    if (amount <= 0) {
      throw new Error('Deduction amount must be greater than zero');
    }

    const wallet = this.getOrCreateWallet(customerId);
    if (wallet.balance < amount) {
      throw new Error(`Insufficient wallet balance. Available: ₹${wallet.balance}, Required: ₹${amount}`);
    }

    wallet.balance = Number((wallet.balance - amount).toFixed(2));
    wallet.totalMoneySpent = Number((wallet.totalMoneySpent + amount).toFixed(2));
    wallet.updatedAt = new Date().toISOString();

    const tx = this.addWalletTransaction({
      customerId,
      type: 'PAYMENT',
      amount: -amount,
      balanceAfter: wallet.balance,
      coinsAfter: wallet.coins,
      status: 'SUCCESS',
      orderId,
      description: `Debited ₹${amount} wallet money for Order #${orderId}`,
    });

    this.addAuditLog(
      customerId,
      'customer',
      'WALLET_PAYMENT',
      `Paid ₹${amount} from wallet for Order #${orderId} (Tx: ${tx.id})`
    );

    this.persist();
    return { success: true, amountDeducted: amount, wallet, transaction: tx };
  }

  refundWalletForOrder(orderId: string): void {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order || !order.walletAmountUsed || order.walletAmountUsed <= 0) return;

    // Idempotency: check if already refunded
    const alreadyRefunded = this.db.walletTransactions.some(
      (t) => t.orderId === orderId && t.type === 'REFUND' && t.status === 'SUCCESS'
    );
    if (alreadyRefunded) return;

    const refundAmount = order.walletAmountUsed;
    const wallet = this.getOrCreateWallet(order.customerId);

    wallet.balance = Number((wallet.balance + refundAmount).toFixed(2));
    wallet.totalMoneySpent = Math.max(0, Number((wallet.totalMoneySpent - refundAmount).toFixed(2)));
    wallet.updatedAt = new Date().toISOString();

    const tx = this.addWalletTransaction({
      customerId: order.customerId,
      type: 'REFUND',
      amount: refundAmount,
      balanceAfter: wallet.balance,
      coinsAfter: wallet.coins,
      status: 'SUCCESS',
      orderId,
      description: `Refunded ₹${refundAmount} wallet money for cancelled Order #${orderId}`,
    });

    this.addAuditLog(
      'System',
      'system',
      'WALLET_REFUND',
      `Refunded ₹${refundAmount} to customer ${order.customerId} for order #${orderId} (Tx: ${tx.id})`
    );

    this.persist();
  }

  awardOrderRewards(orderId: string): void {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return;

    const rules = this.getLoyaltySettings();
    const wallet = this.getOrCreateWallet(order.customerId);

    const merchandiseSubtotal = order.subtotal || 0;
    const discount = order.discount || 0;
    const eligibleAmount = Math.max(0, merchandiseSubtotal - discount);
    order.eligibleRewardSubtotal = eligibleAmount;

    // 1. LOYALTY POINTS EARNING (3% of order total as points)
    if (!order.rewardCoinsAwarded) {
      // Base order total (order total including items, charges, taxes)
      const orderTotal = Math.max(0, order.grandTotal || (merchandiseSubtotal + (order.deliveryCharge || 0) + (order.gstAmount || 0)));
      const calc = calculateRewardCoins(orderTotal, 0, rules);

      if (calc.coinsEarned > 0) {
        wallet.coins = Math.round((wallet.coins + calc.coinsEarned) * 100) / 100;
        wallet.totalCoinsEarned = Math.round((wallet.totalCoinsEarned + calc.coinsEarned) * 100) / 100;
        wallet.updatedAt = new Date().toISOString();

        const tx = this.addWalletTransaction({
          customerId: order.customerId,
          type: 'POINTS_EARN',
          amount: 0,
          coins: calc.coinsEarned,
          balanceAfter: wallet.balance,
          coinsAfter: wallet.coins,
          status: 'SUCCESS',
          orderId,
          description: `Earned ${calc.coinsEarned} loyalty points (3% of ₹${orderTotal} order total) on Order #${orderId}`,
        });

        order.rewardCoinsEarned = calc.coinsEarned;
        order.rewardCoinsAwarded = true;

        this.addNotification(
          'customer',
          'Loyalty Points Credited! 🎉',
          `You earned ${calc.coinsEarned} loyalty points (3% of order total) on Order #${orderId}! Redeem them for discounts on your next order.`,
          orderId
        );

        this.addAuditLog(
          'System',
          'system',
          'POINTS_AWARDED',
          `Awarded ${calc.coinsEarned} loyalty points (3% of order total) to ${order.customerId} for order #${orderId} (Tx: ${tx.id})`
        );
      }
    }

    // 2. REAL CASHBACK SYSTEM
    if (rules.cashbackEnabled !== false && !order.cashbackAwarded) {
      const campaigns = this.getCashbackCampaigns().filter((c) => c.active);
      const matching = campaigns.find((c) => {
        if (eligibleAmount < c.minOrderAmount) return false;
        if (c.firstOrderOnly) {
          const pastOrders = this.db.orders.filter(
            (o) => o.customerId === order.customerId && o.id !== orderId && o.status !== 'Cancelled'
          );
          if (pastOrders.length > 0) return false;
        }
        return true;
      });

      if (matching) {
        let cashbackAmount = 0;
        if (matching.type === 'percentage') {
          cashbackAmount = Math.round((eligibleAmount * matching.value) / 100);
          if (matching.maxCashback && matching.maxCashback > 0) {
            cashbackAmount = Math.min(cashbackAmount, matching.maxCashback);
          }
        } else {
          cashbackAmount = matching.value;
        }

        if (cashbackAmount > 0) {
          wallet.cashbackBalance = Number((wallet.cashbackBalance + cashbackAmount).toFixed(2));
          wallet.balance = Number((wallet.balance + cashbackAmount).toFixed(2));
          wallet.totalCashbackEarned = Number((wallet.totalCashbackEarned + cashbackAmount).toFixed(2));
          wallet.updatedAt = new Date().toISOString();

          matching.usageCount = (matching.usageCount || 0) + 1;

          const tx = this.addWalletTransaction({
            customerId: order.customerId,
            type: 'CASHBACK_CREDIT',
            amount: cashbackAmount,
            balanceAfter: wallet.balance,
            coinsAfter: wallet.coins,
            status: 'SUCCESS',
            orderId,
            description: `Credited ₹${cashbackAmount} promotional cashback for Order #${orderId} (${matching.name})`,
          });

          order.cashbackEarned = cashbackAmount;
          order.cashbackAwarded = true;
          order.cashbackCampaignId = matching.id;

          this.addNotification(
            'customer',
            'Cashback Received! 💸',
            `₹${cashbackAmount} cashback credited to your wallet from campaign "${matching.name}"!`,
            orderId
          );

          this.addAuditLog(
            'System',
            'system',
            'CASHBACK_CREDITED',
            `Credited ₹${cashbackAmount} cashback to ${order.customerId} for order #${orderId} (Tx: ${tx.id})`
          );
        }
      }
    }

    this.persist();
  }

  reverseOrderRewards(orderId: string): void {
    const order = this.db.orders.find((o) => o.id === orderId);
    if (!order) return;

    const wallet = this.getOrCreateWallet(order.customerId);

    // Restore redeemed loyalty points if order is cancelled
    if (order.loyaltyPointsUsed && order.loyaltyPointsUsed > 0 && !order.loyaltyPointsRefunded) {
      wallet.coins = Math.round((wallet.coins + order.loyaltyPointsUsed) * 100) / 100;
      wallet.totalCoinsRedeemed = Math.max(0, Math.round((wallet.totalCoinsRedeemed - order.loyaltyPointsUsed) * 100) / 100);
      wallet.updatedAt = new Date().toISOString();

      this.addWalletTransaction({
        customerId: order.customerId,
        type: 'POINTS_EARN',
        amount: 0,
        coins: order.loyaltyPointsUsed,
        balanceAfter: wallet.balance,
        coinsAfter: wallet.coins,
        status: 'SUCCESS',
        orderId,
        description: `Restored ${order.loyaltyPointsUsed} redeemed loyalty points for cancelled Order #${orderId}`,
      });

      order.loyaltyPointsRefunded = true;
    }

    // Reverse coins if awarded
    if (order.rewardCoinsAwarded && !order.rewardCoinsReversed && (order.rewardCoinsEarned || 0) > 0) {
      const coinsToReverse = order.rewardCoinsEarned!;
      wallet.coins = Math.max(0, Math.round((wallet.coins - coinsToReverse) * 100) / 100);
      wallet.totalCoinsEarned = Math.max(0, Math.round((wallet.totalCoinsEarned - coinsToReverse) * 100) / 100);
      wallet.updatedAt = new Date().toISOString();

      this.addWalletTransaction({
        customerId: order.customerId,
        type: 'COIN_REVERSAL',
        amount: 0,
        coins: -coinsToReverse,
        balanceAfter: wallet.balance,
        coinsAfter: wallet.coins,
        status: 'REVERSED',
        orderId,
        description: `Reversed ${coinsToReverse} reward coins for cancelled Order #${orderId}`,
      });

      order.rewardCoinsReversed = true;
    }

    // Reverse cashback if awarded
    if (order.cashbackAwarded && !order.cashbackReversed && (order.cashbackEarned || 0) > 0) {
      const cashbackToReverse = order.cashbackEarned!;
      wallet.cashbackBalance = Math.max(0, Number((wallet.cashbackBalance - cashbackToReverse).toFixed(2)));
      wallet.balance = Math.max(0, Number((wallet.balance - cashbackToReverse).toFixed(2)));
      wallet.totalCashbackEarned = Math.max(0, Number((wallet.totalCashbackEarned - cashbackToReverse).toFixed(2)));
      wallet.updatedAt = new Date().toISOString();

      this.addWalletTransaction({
        customerId: order.customerId,
        type: 'CASHBACK_REVERSAL',
        amount: -cashbackToReverse,
        balanceAfter: wallet.balance,
        coinsAfter: wallet.coins,
        status: 'REVERSED',
        orderId,
        description: `Reversed ₹${cashbackToReverse} cashback for cancelled Order #${orderId}`,
      });

      order.cashbackReversed = true;
    }

    this.persist();
  }

  adminAdjustWallet(
    customerId: string,
    type: 'credit' | 'debit',
    target: 'money' | 'coins',
    amount: number,
    reason: string,
    adminUsername: string
  ): CustomerWallet {
    if (amount <= 0 || isNaN(amount)) {
      throw new Error('Adjustment amount must be greater than zero');
    }
    if (!reason || !reason.trim()) {
      throw new Error('Mandatory adjustment reason is required for administrative auditing');
    }

    const wallet = this.getOrCreateWallet(customerId);

    if (target === 'money') {
      if (type === 'debit' && wallet.balance < amount) {
        throw new Error(`Cannot debit ₹${amount}. Current wallet balance is ₹${wallet.balance}`);
      }
      const diff = type === 'credit' ? amount : -amount;
      wallet.balance = Number((wallet.balance + diff).toFixed(2));
      wallet.updatedAt = new Date().toISOString();

      this.addWalletTransaction({
        customerId,
        type: 'ADMIN_ADJUSTMENT',
        amount: diff,
        balanceAfter: wallet.balance,
        coinsAfter: wallet.coins,
        status: 'SUCCESS',
        adminUsername,
        description: `Administrative ${type} of ₹${amount}. Reason: ${reason.trim()} (Authorized by ${adminUsername})`,
      });
    } else {
      if (type === 'debit' && wallet.coins < amount) {
        throw new Error(`Cannot debit ${amount} coins. Current coin balance is ${wallet.coins}`);
      }
      const diff = type === 'credit' ? amount : -amount;
      wallet.coins = Math.max(0, Math.round((wallet.coins + diff) * 100) / 100);
      wallet.updatedAt = new Date().toISOString();

      this.addWalletTransaction({
        customerId,
        type: 'ADMIN_ADJUSTMENT',
        amount: 0,
        coins: diff,
        balanceAfter: wallet.balance,
        coinsAfter: wallet.coins,
        status: 'SUCCESS',
        adminUsername,
        description: `Administrative ${type} of ${amount} coins. Reason: ${reason.trim()} (Authorized by ${adminUsername})`,
      });
    }

    this.addAuditLog(
      adminUsername,
      'admin',
      'WALLET_ADJUSTED',
      `Admin adjusted ${target} (${type} ${amount}) for customer ${customerId}. Reason: ${reason}`
    );

    this.persist();
    return wallet;
  }

  // --------------------------------------------------------------------------
  // CASHBACK CAMPAIGNS
  // --------------------------------------------------------------------------

  getCashbackCampaigns(): CashbackCampaign[] {
    if (!this.db.cashbackCampaigns) {
      this.db.cashbackCampaigns = [];
    }
    return this.db.cashbackCampaigns;
  }

  createCashbackCampaign(data: Partial<CashbackCampaign>): CashbackCampaign {
    if (!data.name || !data.value || !data.minOrderAmount) {
      throw new Error('Missing required campaign fields (name, value, minOrderAmount)');
    }
    const campaign: CashbackCampaign = {
      id: `camp-${Date.now()}`,
      name: data.name.trim(),
      description: data.description || '',
      type: data.type || 'percentage',
      value: Number(data.value),
      minOrderAmount: Number(data.minOrderAmount),
      maxCashback: data.maxCashback ? Number(data.maxCashback) : undefined,
      startDate: data.startDate,
      endDate: data.endDate,
      firstOrderOnly: Boolean(data.firstOrderOnly),
      active: data.active !== undefined ? Boolean(data.active) : true,
      usageCount: 0,
      createdAt: new Date().toISOString(),
    };

    if (!this.db.cashbackCampaigns) {
      this.db.cashbackCampaigns = [];
    }
    this.db.cashbackCampaigns.unshift(campaign);
    this.addAuditLog('Admin', 'admin', 'CAMPAIGN_CREATED', `Created cashback campaign: ${campaign.name}`);
    this.persist();
    return campaign;
  }

  updateCashbackCampaign(id: string, data: Partial<CashbackCampaign>): CashbackCampaign | null {
    if (!this.db.cashbackCampaigns) return null;
    const idx = this.db.cashbackCampaigns.findIndex((c) => c.id === id);
    if (idx === -1) return null;

    this.db.cashbackCampaigns[idx] = {
      ...this.db.cashbackCampaigns[idx],
      ...data,
    };
    this.addAuditLog('Admin', 'admin', 'CAMPAIGN_UPDATED', `Updated cashback campaign: ${id}`);
    this.persist();
    return this.db.cashbackCampaigns[idx];
  }

  deleteCashbackCampaign(id: string): boolean {
    if (!this.db.cashbackCampaigns) return false;
    const initialLen = this.db.cashbackCampaigns.length;
    this.db.cashbackCampaigns = this.db.cashbackCampaigns.filter((c) => c.id !== id);
    if (this.db.cashbackCampaigns.length < initialLen) {
      this.addAuditLog('Admin', 'admin', 'CAMPAIGN_DELETED', `Deleted cashback campaign: ${id}`);
      this.persist();
      return true;
    }
    return false;
  }

  // --------------------------------------------------------------------------
  // LOYALTY RULES SETTINGS
  // --------------------------------------------------------------------------

  getLoyaltySettings(): LoyaltySettings {
    if (!this.db.loyaltySettings) {
      this.db.loyaltySettings = { ...DEFAULT_LOYALTY_RULES };
    }
    // Automatically migrate old 0.5 earning / 10 conversion defaults to 3% earning and 1 point = ₹1
    if (this.db.loyaltySettings.earningRate === 0.5 || this.db.loyaltySettings.earningRate === undefined) {
      this.db.loyaltySettings.earningRate = 0.03;
    }
    if (this.db.loyaltySettings.conversionRate === 10 || this.db.loyaltySettings.conversionRate === undefined) {
      this.db.loyaltySettings.conversionRate = 1;
    }
    if (this.db.loyaltySettings.minEligibleOrderAmount === 100 || this.db.loyaltySettings.minEligibleOrderAmount === undefined) {
      this.db.loyaltySettings.minEligibleOrderAmount = 0;
    }
    return this.db.loyaltySettings;
  }

  updateLoyaltySettings(settings: Partial<LoyaltySettings>): LoyaltySettings {
    this.db.loyaltySettings = {
      ...this.getLoyaltySettings(),
      ...settings,
    };
    this.addAuditLog('Admin', 'admin', 'LOYALTY_SETTINGS_UPDATED', 'Updated loyalty reward and conversion rules');
    this.persist();
    return this.db.loyaltySettings;
  }
}

export const storage = new StorageManager();
