const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const isTurso = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
let tursoClient = null;
let localDb = null;

if (isTurso) {
  const { createClient } = require('@libsql/client');
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
  console.log('⚡ Connected to Turso Cloud SQLite database');
} else {
  const Database = require('better-sqlite3');
  const isVercel = Boolean(process.env.VERCEL);
  let dbPath;

  if (isVercel) {
    const tmpDir = '/tmp';
    dbPath = path.join(tmpDir, 'hostelcravings.db');
    const repoDb = path.join(__dirname, '..', 'data', 'hostelcravings.db');
    if (!fs.existsSync(dbPath) && fs.existsSync(repoDb)) {
      try {
        fs.copyFileSync(repoDb, dbPath);
      } catch (e) {
        console.warn('Could not copy seed DB to /tmp:', e);
      }
    }
  } else {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, 'hostelcravings.db');
  }

  localDb = new Database(dbPath);

  if (!isVercel) {
    try { localDb.pragma('journal_mode = WAL'); } catch (e) {}
  } else {
    try { localDb.pragma('journal_mode = MEMORY'); } catch (e) {}
  }
  try { localDb.pragma('foreign_keys = ON'); } catch (e) {}
}

const defaultProducts = [
  ['Ready to eat maggi',          'instant',  30, 50, 1, 'Delicious hostel snack', 'https://www.jamoona.com/cdn/shop/files/Maggi-70g-2Minuten-Nudeln-Masala-Fertiggericht-20387.png?v=1753198567'],
  ['nimbu premix drink(2 pieces)', 'drinks',  15, 13, 1, 'Delicious hostel snack', 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80'],
  ['kurkure orange',              'chips',    25,  1, 1, 'Delicious hostel snack', 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400&q=80'],
  ['orange kurkure',              'chips',    15,  1, 1, 'Delicious hostel snack', 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400&q=80'],
  ['kurkure (lime)',              'chips',    25,  2, 0, 'Delicious hostel snack', 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&q=80'],
  ['Tedhe Medhe',                 'chips',    25,  2, 1, 'Delicious hostel snack', 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400&q=80'],
  ['oreo chocolate 30rs pack',    'chips',    30,  7, 1, 'Delicious hostel snack', 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80'],
  ['Oreo (white) big',            'biscuits', 25, 10, 1, 'Delicious hostel snack', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSP5QrxtF-MdLOk59bjryj5-UVDj86684Dd4MBqrp8wHQ&s=10'],
  ['Bourbon',                     'biscuits', 30,  5, 1, 'Delicious hostel snack', 'https://images.unsplash.com/photo-1549007953-2f2dc0b24019?w=400&q=80'],
  ['Mega pack maggi',             'instant',  85,  7, 1, 'Delicious hostel snack', 'https://www.bbassets.com/media/uploads/p/l/266162_28-maggi-2-minute-instant-noodles-masala.jpg'],
  ['lotte choco pie',             'biscuits', 15, 18, 1, 'Delicious hostel snack', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6edQPgF32yuDTycBjm8aHUdwI_KqW6_TSVkvBGavURQ&s=10'],
  ['Oreo',                        'biscuits', 15, 12, 1, 'Delicious hostel snack', 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSP5QrxtF-MdLOk59bjryj5-UVDj86684Dd4MBqrp8wHQ&s=10'],
  ['maggi',                       'instant',  15, 60, 1, 'Delicious hostel snack', 'https://www.jamoona.com/cdn/shop/files/Maggi-70g-2Minuten-Nudeln-Masala-Fertiggericht-20387.png?v=1753198567'],
  ["Lay's Magic Masala",          'chips',    20, 15, 1, 'Classic spicy blue Lay\'s chips', 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&q=80'],
  ['Cadbury Dairy Milk',          'sweet',    20, 20, 1, 'Classic smooth milk chocolate', 'https://images.unsplash.com/photo-1549007953-2f2dc0b24019?w=400&q=80'],
  ['Nestle KitKat',               'sweet',    20, 15, 1, 'Crispy wafer fingers covered with milk chocolate', 'https://images.unsplash.com/photo-1582293041079-7814c2f12063?w=400&q=80'],
  ['Bingo Mad Angles',            'chips',    20, 15, 1, 'Crispy triangular chips with tangy achari flavor', 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&q=80']
];

const schemaSql = `
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    phone      TEXT,
    password   TEXT NOT NULL,
    role       TEXT NOT NULL DEFAULT 'customer',
    hostel_no  TEXT,
    room_no    TEXT,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    price       REAL NOT NULL,
    description TEXT,
    image_url   TEXT,
    in_stock    INTEGER NOT NULL DEFAULT 1,
    quantity    INTEGER NOT NULL DEFAULT 20,
    created_at  TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER REFERENCES users(id),
    guest_name   TEXT,
    guest_phone  TEXT,
    hostel_no    TEXT,
    room_no      TEXT,
    total        REAL NOT NULL,
    status       TEXT NOT NULL DEFAULT 'pending',
    delivery_type TEXT DEFAULT 'door',
    payment_method TEXT DEFAULT 'cash',
    notes        TEXT,
    created_at   TEXT DEFAULT (datetime('now','localtime')),
    updated_at   TEXT DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    name       TEXT NOT NULL,
    price      REAL NOT NULL,
    quantity   INTEGER NOT NULL DEFAULT 1
  );
`;

async function rawAll(sql, params = []) {
  if (isTurso) {
    const res = await tursoClient.execute({ sql, args: params });
    return res.rows;
  }
  return localDb.prepare(sql).all(...params);
}

async function rawGet(sql, params = []) {
  if (isTurso) {
    const res = await tursoClient.execute({ sql, args: params });
    return res.rows[0];
  }
  return localDb.prepare(sql).get(...params);
}

async function rawRun(sql, params = []) {
  if (isTurso) {
    const res = await tursoClient.execute({ sql, args: params });
    return {
      lastInsertRowid: Number(res.lastInsertRowid),
      changes: res.rowsAffected
    };
  }
  const res = localDb.prepare(sql).run(...params);
  return {
    lastInsertRowid: Number(res.lastInsertRowid),
    changes: res.changes
  };
}

async function rawExec(sql) {
  if (isTurso) {
    await tursoClient.executeMultiple(sql);
    return;
  }
  localDb.exec(sql);
}

const db = {
  isTurso,

  async all(sql, params = []) {
    await initDatabase();
    return rawAll(sql, params);
  },

  async get(sql, params = []) {
    await initDatabase();
    return rawGet(sql, params);
  },

  async run(sql, params = []) {
    await initDatabase();
    return rawRun(sql, params);
  },

  async exec(sql) {
    await initDatabase();
    return rawExec(sql);
  },

  // Backwards compatibility for synchronous local SQLite queries
  prepare(sql) {
    if (!localDb) {
      throw new Error('db.prepare() is only available on local SQLite. Use db.all(), db.get(), or db.run() instead.');
    }
    return localDb.prepare(sql);
  },

  pragma(str) {
    if (localDb) {
      try { return localDb.pragma(str); } catch (e) {}
    }
  }
};

// ── Database Initialization & Seeding ─────────
let initPromise = null;
async function initDatabase() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await rawExec(schemaSql);

      const adminPassword = process.env.ADMIN_PASSWORD || 'kulfimodda69';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@hostelcravings.in';
      const adminExists = await rawGet("SELECT id FROM users WHERE role='admin'");

      if (!adminExists) {
        const hash = bcrypt.hashSync(adminPassword, 10);
        await rawRun(`
          INSERT INTO users (name, email, phone, password, role)
          VALUES ('Admin', ?, '7095143825', ?, 'admin')
        `, [adminEmail, hash]);
        console.log('✅ Admin account seeded');
      } else if (process.env.ADMIN_PASSWORD) {
        const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10);
        await rawRun("UPDATE users SET password = ?, email = ? WHERE role='admin'", [hash, adminEmail]);
      }

      for (const p of defaultProducts) {
        const existing = await rawGet('SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', [p[0]]);
        if (!existing) {
          await rawRun(`
            INSERT INTO products (name, category, price, quantity, in_stock, description, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, p);
        }
      }

      if (!isTurso && localDb) {
        try { localDb.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) {}
      }
    } catch (err) {
      console.error('Database initialization error:', err);
    }
  })();
  return initPromise;
}

// Auto-run initialization
initDatabase();

db.initDatabase = initDatabase;

module.exports = db;

