const express = require('express');
const jwt     = require('jsonwebtoken');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db');
const router  = express.Router();
const SECRET  = process.env.JWT_SECRET || 'hc_secret_lpu_2024';

/* ── Admin auth middleware ─────────────────── */
function adminOnly(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Unauthorized.' });
  try {
    const payload = jwt.verify(auth.replace('Bearer ', ''), SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin only.' });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
}

/* ── Dashboard stats ───────────────────────── */
router.get('/stats', adminOnly, (req, res) => {
  const totalOrders    = db.prepare("SELECT COUNT(*) as c FROM orders").get().c;
  const pendingOrders  = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='pending'").get().c;
  const deliveredToday = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='delivered' AND date(created_at)=date('now','localtime')").get().c;
  const revenue        = db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE status != 'cancelled'").get().r;
  const customers      = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='customer'").get().c;
  res.json({ totalOrders, pendingOrders, deliveredToday, revenue, customers });
});

/* ── All orders ────────────────────────────── */
router.get('/orders', adminOnly, (req, res) => {
  const { status, limit = 50 } = req.query;
  let query = `
    SELECT o.*, u.name as user_name, u.phone as user_phone,
           GROUP_CONCAT(oi.name || ' x' || oi.quantity, ', ') as items_summary
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
  `;
  if (status) query += ` WHERE o.status = '${status}'`;
  query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT ${parseInt(limit)}`;
  const orders = db.prepare(query).all();
  res.json(orders);
});

/* ── Single order with items ───────────────── */
router.get('/orders/:id', adminOnly, (req, res) => {
  const order = db.prepare('SELECT o.*, u.name as user_name, u.phone as user_phone FROM orders o LEFT JOIN users u ON u.id=o.user_id WHERE o.id=?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(req.params.id);
  res.json({ ...order, items });
});

/* ── Update order status ───────────────────── */
router.patch('/orders/:id/status', adminOnly, (req, res) => {
  const { status } = req.body;
  const valid = ['pending','confirmed','preparing','out_for_delivery','delivered','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  db.prepare("UPDATE orders SET status=?, updated_at=datetime('now','localtime') WHERE id=?").run(status, req.params.id);
  res.json({ success: true, status });
});

/* ── All customers ─────────────────────────── */
router.get('/customers', adminOnly, (req, res) => {
  const customers = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.hostel_no, u.room_no, u.created_at,
           COUNT(o.id) as order_count,
           COALESCE(SUM(o.total),0) as total_spent
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    WHERE u.role='customer'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(customers);
});

/* ── Upload image from device ──────────────── */
router.post('/upload-image', adminOnly, (req, res) => {
  const { image, filename } = req.body;
  if (!image) {
    return res.status(400).json({ error: 'No image data provided.' });
  }

  try {
    let ext = 'jpg';
    let base64Data = image;

    // Support data URI: "data:image/png;base64,iVBORw..." or raw base64
    const match = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (match) {
      ext = match[1] === 'jpeg' ? 'jpg' : match[1].replace('+xml', '');
      if (ext === 'svg+xml') ext = 'svg';
      base64Data = match[2];
    } else if (filename && filename.includes('.')) {
      ext = filename.split('.').pop().toLowerCase();
    }

    const allowed = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'];
    const cleanExt = allowed.includes(ext.toLowerCase()) ? ext.toLowerCase() : 'jpg';

    // Unique safe filename
    const safeName = `snack_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
    const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
    try {
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const filePath = path.join(uploadsDir, safeName);
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      res.json({ success: true, url: `/uploads/${safeName}`, filename: safeName });
    } catch (writeErr) {
      // If running on a read-only serverless filesystem like Vercel, serve data URI directly
      const dataUri = image.startsWith('data:') ? image : `data:image/${cleanExt};base64,${base64Data}`;
      res.json({ success: true, url: dataUri, filename: safeName });
    }
  } catch (err) {
    console.error('Upload image error:', err);
    res.status(500).json({ error: 'Failed to process image: ' + err.message });
  }
});

/* ── Products CRUD ─────────────────────────── */
router.get('/products', adminOnly, (req, res) => {
  try {
    res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all());
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Could not fetch products: ' + err.message });
  }
});

// Bulk add or sync products (used by auto-backup / restore)
router.post('/products/bulk', adminOnly, (req, res) => {
  try {
    const { products: items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'No products provided for bulk sync.' });
    }

    const insert = db.prepare(`
      INSERT INTO products (name, category, price, quantity, in_stock, description, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const update = db.prepare(`
      UPDATE products
      SET category=?, price=?, quantity=?, in_stock=?, description=?, image_url=?
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
    `);

    const find = db.prepare('SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))');

    let added = 0;
    let updated = 0;

    const tx = db.transaction(() => {
      for (const item of items) {
        if (!item.name || item.price === undefined || item.price === null) continue;
        const existing = find.get(item.name);
        const qty = Math.max(0, parseInt(item.quantity) || 0);
        const stock = item.in_stock !== undefined ? (item.in_stock ? 1 : 0) : (qty > 0 ? 1 : 0);
        const cleanName = item.name.trim();
        const cleanCategory = (item.category || 'chips').trim().toLowerCase();
        const cleanPrice = parseFloat(item.price) || 0;
        const cleanDesc = (item.description || '').trim();
        const cleanImg = (item.image_url || '').trim() || 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400&q=80';

        if (existing) {
          update.run(cleanCategory, cleanPrice, qty, stock, cleanDesc, cleanImg, cleanName);
          updated++;
        } else {
          insert.run(cleanName, cleanCategory, cleanPrice, qty, stock, cleanDesc, cleanImg);
          added++;
        }
      }
    });

    tx();
    const total = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
    res.json({ success: true, added, updated, total });
  } catch (err) {
    console.error('Bulk sync error:', err);
    res.status(500).json({ error: 'Failed to sync inventory: ' + err.message });
  }
});

// Add new product
router.post('/products', adminOnly, (req, res) => {
  try {
    const { name, category, price, description, image_url, quantity = 20, in_stock = 1 } = req.body;
    if (!name || price === undefined || price === null || isNaN(parseFloat(price))) {
      return res.status(400).json({ error: 'Product name and valid price are required.' });
    }
    const result = db.prepare(`
      INSERT INTO products (name, category, price, description, image_url, quantity, in_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(),
      (category || 'chips').trim().toLowerCase(),
      parseFloat(price) || 0,
      (description || '').trim(),
      (image_url || '').trim() || 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400&q=80',
      Math.max(0, parseInt(quantity) || 0),
      in_stock ? 1 : 0
    );
    const newProduct = db.prepare('SELECT * FROM products WHERE id=?').get(result.lastInsertRowid);
    res.json({ success: true, product: newProduct });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Failed to save product: ' + err.message });
  }
});

// Update product
router.put('/products/:id', adminOnly, (req, res) => {
  try {
    const { name, category, price, description, image_url, quantity, in_stock } = req.body;
    if (!name || price === undefined || price === null || isNaN(parseFloat(price))) {
      return res.status(400).json({ error: 'Product name and valid price are required.' });
    }
    const qty = Math.max(0, parseInt(quantity) || 0);
    const stock = in_stock !== undefined ? (in_stock ? 1 : 0) : (qty > 0 ? 1 : 0);
    db.prepare(`
      UPDATE products
      SET name=?, category=?, price=?, description=?, image_url=?, quantity=?, in_stock=?
      WHERE id=?
    `).run(
      name.trim(),
      (category || 'chips').trim().toLowerCase(),
      parseFloat(price) || 0,
      (description || '').trim(),
      (image_url || '').trim(),
      qty,
      stock,
      req.params.id
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product: ' + err.message });
  }
});

// Toggle in_stock / stock out
router.patch('/products/:id/stock', adminOnly, (req, res) => {
  try {
    const { in_stock } = req.body;
    const stock = in_stock ? 1 : 0;
    // If marking in stock but quantity was 0, restore default 10
    if (stock === 1) {
      db.prepare('UPDATE products SET in_stock=1, quantity=CASE WHEN quantity <= 0 THEN 10 ELSE quantity END WHERE id=?').run(req.params.id);
    } else {
      db.prepare('UPDATE products SET in_stock=0 WHERE id=?').run(req.params.id);
    }
    res.json({ success: true, in_stock: stock });
  } catch (err) {
    console.error('Error toggling stock:', err);
    res.status(500).json({ error: 'Could not change stock: ' + err.message });
  }
});

// Set available quantity
router.patch('/products/:id/quantity', adminOnly, (req, res) => {
  try {
    const qty = Math.max(0, parseInt(req.body.quantity) || 0);
    const stock = qty > 0 ? 1 : 0;
    db.prepare('UPDATE products SET quantity=?, in_stock=? WHERE id=?').run(qty, stock, req.params.id);
    res.json({ success: true, quantity: qty, in_stock: stock });
  } catch (err) {
    console.error('Error setting quantity:', err);
    res.status(500).json({ error: 'Could not change quantity: ' + err.message });
  }
});

// Delete product
router.delete('/products/:id', adminOnly, (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Could not delete product: ' + err.message });
  }
});

module.exports = router;
