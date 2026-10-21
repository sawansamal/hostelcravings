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

// ── Seed products (Ensuring all 17 items exist) ──
const insertProduct = db.prepare(`
  INSERT INTO products (name, category, price, quantity, in_stock, description, image_url)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const findProduct = db.prepare('SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))');

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

defaultProducts.forEach(p => {
  const existing = findProduct.get(p[0]);
  if (!existing) {
    insertProduct.run(...p);
  }
});

// Checkpoint WAL into disk so git can commit full data
try {
  db.pragma('wal_checkpoint(TRUNCATE)');
} catch(e) {}

module.exports = db;
