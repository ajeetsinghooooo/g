import { Pool } from 'pg';
import type { DatabaseSchema } from './storage';

export const DATABASE_URL = process.env.DATABASE_URL || '';

let pool: Pool | null = null;
let isConnected = false;
let lastError: string | null = null;
let lastSyncedAt: string | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.warn('[Supabase PostgreSQL] Client notice:', err.message);
      lastError = err.message;
      isConnected = false;
    });
  }
  return pool;
}

export async function initPostgresDatabase(): Promise<boolean> {
  if (!DATABASE_URL) {
    console.log('[Supabase PostgreSQL] No DATABASE_URL provided. Operating in local storage mode.');
    isConnected = false;
    return false;
  }

  try {
    const p = getPool();
    const client = await p.connect();
    try {
      const res = await client.query('SELECT NOW() AS now, current_database() AS db_name;');
      isConnected = true;
      lastError = null;
      console.log(`[Supabase PostgreSQL] Connected to ${res.rows[0].db_name} at ${res.rows[0].now}`);

      // 1. Create central store table for atomic snapshot sync
      await client.query(`
        CREATE TABLE IF NOT EXISTS kitchencruze_store (
          key TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      // 2. Create structured entity tables for transparent viewing in Supabase Dashboard
      await client.query(`
        CREATE TABLE IF NOT EXISTS kc_products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT,
          price NUMERIC,
          is_veg BOOLEAN DEFAULT TRUE,
          is_available BOOLEAN DEFAULT TRUE,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kc_categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          sort_order INT DEFAULT 0,
          active BOOLEAN DEFAULT TRUE,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kc_orders (
          id TEXT PRIMARY KEY,
          customer_id TEXT,
          status TEXT,
          payment_status TEXT,
          grand_total NUMERIC,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kc_customers (
          id TEXT PRIMARY KEY,
          full_name TEXT,
          phone TEXT,
          email TEXT,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kc_staff (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL,
          data JSONB NOT NULL
        );

        CREATE TABLE IF NOT EXISTS kc_settings (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kc_delivery_boys (
          id TEXT PRIMARY KEY,
          delivery_boy_number INT,
          name TEXT NOT NULL,
          phone TEXT,
          username TEXT NOT NULL UNIQUE,
          status TEXT DEFAULT 'active',
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS kc_audit_logs (
          id TEXT PRIMARY KEY,
          user_name TEXT,
          role TEXT,
          action TEXT,
          details TEXT,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        );
      `);

      console.log('[Supabase PostgreSQL] Tables initialized successfully');
      return true;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn(
      `[Supabase PostgreSQL] Cloud database sync offline (${err.message}). App running with resilient local JSON storage.`
    );
    lastError = err.message;
    isConnected = false;
    return false;
  }
}

export async function loadDatabaseFromPostgres(): Promise<Partial<DatabaseSchema> | null> {
  try {
    const p = getPool();
    const res = await p.query(
      'SELECT data, updated_at FROM kitchencruze_store WHERE key = $1;',
      ['app_state']
    );

    if (res.rows.length > 0 && res.rows[0].data) {
      console.log('[Supabase PostgreSQL] Hydrated database from Supabase successfully.');
      lastSyncedAt = new Date(res.rows[0].updated_at).toISOString();
      return res.rows[0].data as Partial<DatabaseSchema>;
    }
    return null;
  } catch (err: any) {
    console.warn('[Supabase PostgreSQL] Could not load from Supabase:', err.message);
    lastError = err.message;
    return null;
  }
}

// Debounced background sync to Supabase PostgreSQL
let syncTimeout: NodeJS.Timeout | null = null;

export function schedulePostgresSync(db: DatabaseSchema) {
  // If not connected or auth failed, skip remote sync to avoid failed attempts
  if (!isConnected) {
    return;
  }

  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  // Debounce rapid mutations by 300ms
  syncTimeout = setTimeout(async () => {
    syncTimeout = null;
    if (isConnected) {
      await syncDatabaseToPostgres(db);
    }
  }, 300);
}

export async function syncDatabaseToPostgres(db: DatabaseSchema): Promise<boolean> {
  if (!isConnected) {
    return false;
  }

  try {
    const p = getPool();
    const client = await p.connect();

    try {
      await client.query('BEGIN');

      // 1. Upsert complete app state in kitchencruze_store
      await client.query(
        `INSERT INTO kitchencruze_store (key, data, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
        ['app_state', JSON.stringify(db)]
      );

      // 2. Sync products to kc_products
      await client.query('DELETE FROM kc_products;');
      for (const prod of db.products) {
        await client.query(
          `INSERT INTO kc_products (id, name, category, price, is_veg, is_available, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW());`,
          [
            prod.id,
            prod.name,
            prod.category,
            prod.price,
            prod.isVeg ?? true,
            prod.isAvailable ?? true,
            JSON.stringify(prod),
          ]
        );
      }

      // 3. Sync categories to kc_categories
      await client.query('DELETE FROM kc_categories;');
      for (const cat of db.categories) {
        await client.query(
          `INSERT INTO kc_categories (id, name, sort_order, active, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW());`,
          [cat.id, cat.name, cat.order || 0, cat.active ?? true, JSON.stringify(cat)]
        );
      }

      // 4. Sync orders to kc_orders
      for (const order of db.orders) {
        await client.query(
          `INSERT INTO kc_orders (id, customer_id, status, payment_status, grand_total, data, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           ON CONFLICT (id) DO UPDATE SET
             status = EXCLUDED.status,
             payment_status = EXCLUDED.payment_status,
             grand_total = EXCLUDED.grand_total,
             data = EXCLUDED.data,
             updated_at = NOW();`,
          [
            order.id,
            order.customerId,
            order.status,
            order.paymentStatus,
            order.grandTotal,
            JSON.stringify(order),
            order.createdAt,
          ]
        );
      }

      // 5. Sync customers to kc_customers
      for (const cust of db.customers) {
        await client.query(
          `INSERT INTO kc_customers (id, full_name, phone, email, data, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             full_name = EXCLUDED.full_name,
             phone = EXCLUDED.phone,
             email = EXCLUDED.email,
             data = EXCLUDED.data;`,
          [
            cust.id,
            cust.fullName,
            cust.phone,
            cust.email,
            JSON.stringify(cust),
            cust.createdAt,
          ]
        );
      }

      // 6. Sync delivery boys to kc_delivery_boys
      if (Array.isArray((db as any).deliveryBoys)) {
        for (const dboy of (db as any).deliveryBoys) {
          await client.query(
            `INSERT INTO kc_delivery_boys (id, delivery_boy_number, name, phone, username, status, data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             ON CONFLICT (id) DO UPDATE SET
               delivery_boy_number = EXCLUDED.delivery_boy_number,
               name = EXCLUDED.name,
               phone = EXCLUDED.phone,
               username = EXCLUDED.username,
               status = EXCLUDED.status,
               data = EXCLUDED.data,
               updated_at = NOW();`,
            [
              dboy.id,
              dboy.deliveryBoyNumber,
              dboy.name,
              dboy.phone,
              dboy.username,
              dboy.status || 'active',
              JSON.stringify(dboy),
              dboy.createdAt || new Date().toISOString(),
            ]
          );
        }
      }

      // 7. Sync settings
      await client.query(
        `INSERT INTO kc_settings (id, data, updated_at)
         VALUES ('default', $1, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
        [JSON.stringify(db.settings)]
      );

      await client.query('COMMIT');

      isConnected = true;
      lastError = null;
      lastSyncedAt = new Date().toISOString();
      return true;
    } catch (err: any) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[Supabase PostgreSQL] Cloud sync paused (database offline):', err.message);
    lastError = err.message;
    isConnected = false;
    return false;
  }
}

export function getPostgresStatus() {
  let host = 'aws-0-ap-northeast-1.pooler.supabase.com';
  let database = 'postgres';
  try {
    const parsed = new URL(DATABASE_URL);
    host = parsed.hostname;
    database = parsed.pathname.replace(/^\//, '');
  } catch {}

  return {
    provider: 'Supabase PostgreSQL',
    connected: isConnected,
    host,
    database,
    lastSyncedAt,
    lastError: isConnected ? null : lastError,
    status: isConnected ? 'connected' : 'offline_fallback_active',
    storageMode: isConnected ? 'cloud_synced' : 'local_file_storage',
  };
}
