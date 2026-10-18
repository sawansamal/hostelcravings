const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'hostelcravings.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Create tables ────────────────────────────
db.exec(`
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
`);

// ── Seed admin user ──────────────────────────
const bcrypt = require('bcryptjs');
const adminExists = db.prepare("SELECT id FROM users WHERE role='admin'").get();
if (!adminExists) {
  const hash = bcrypt.hashSync('kulfimodda69', 10);
  db.prepare(`
    INSERT INTO users (name, email, phone, password, role)
    VALUES ('Admin', 'admin@hostelcravings.in', '8143995997', ?, 'admin')
  `).run(hash);
  console.log('✅ Admin seeded: email=admin@hostelcravings.in  password=kulfimodda69');
}

// ── Seed products ────────────────────────────
const productCount = db.prepare("SELECT COUNT(*) as c FROM products").get().c;
if (productCount === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (name, category, price, description, image_url)
    VALUES (?, ?, ?, ?, ?)
  `);
  const products = [
    ['Spicy Masala Chips',     'chips',   49,  'Bold, fiery, with the perfect crunch.',             'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400&q=80'],
    ['Dark Chocolate Bar',      'sweet',   89,  'Rich, velvety dark chocolate.',                     'https://images.unsplash.com/photo-1549007953-2f2dc0b24019?w=400&q=80'],
    ['Cold Brew Coffee',        'drinks',  79,  'Smooth, strong cold brew.',                         'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&q=80'],
    ['Maggi Noodles Pack',      'instant', 39,  'The OG hostel staple. Ready in 2 minutes.',         'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&q=80'],
    ['Caramel Waffer Biscuits', 'sweet',   69,  'Buttery caramel waffer cookies.',                   'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&q=80'],
    ['Cheese Popcorn Pack',     'chips',   55,  'Movie-level indulgence, hostel-room comfort.',      'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=400&q=80'],
  ];
  products.forEach(p => insertProduct.run(...p));
  console.log('✅ Products seeded');
}

module.exports = db;
