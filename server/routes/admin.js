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
router.get('/stats', adminOnly, async (req, res) => {
  try {
    const totalRow      = await db.get("SELECT COUNT(*) as c FROM orders");
    const pendingRow    = await db.get("SELECT COUNT(*) as c FROM orders WHERE status='pending'");
    const deliveredRow  = await db.get("SELECT COUNT(*) as c FROM orders WHERE status='delivered' AND date(created_at)=date('now','localtime')");
    const revRow        = await db.get("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE status != 'cancelled'");
    const custRow       = await db.get("SELECT COUNT(*) as c FROM users WHERE role='customer'");

    res.json({
      totalOrders: totalRow ? totalRow.c : 0,
      pendingOrders: pendingRow ? pendingRow.c : 0,
      deliveredToday: deliveredRow ? deliveredRow.c : 0,
      revenue: revRow ? revRow.r : 0,
      customers: custRow ? custRow.c : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats: ' + err.message });
  }
});

/* ── All orders ────────────────────────────── */
router.get('/orders', adminOnly, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let query = `
      SELECT o.*, u.name as user_name, u.phone as user_phone,
             GROUP_CONCAT(oi.name || ' x' || oi.quantity, ', ') as items_summary
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
    `;
    const params = [];
    if (status) {
      query += ` WHERE o.status = ?`;
      params.push(status);
    }
    query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT ${parseInt(limit) || 50}`;
    const orders = await db.all(query, params);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders: ' + err.message });
  }
});

/* ── Single order with items ───────────────── */
router.get('/orders/:id', adminOnly, async (req, res) => {
  try {
    const order = await db.get('SELECT o.*, u.name as user_name, u.phone as user_phone FROM orders o LEFT JOIN users u ON u.id=o.user_id WHERE o.id=?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const items = await db.all('SELECT * FROM order_items WHERE order_id=?', [req.params.id]);
    res.json({ ...order, items });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order: ' + err.message });
  }
});

/* ── Update order status ───────────────────── */
router.patch('/orders/:id/status', adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const valid = ['pending','confirmed','preparing','out_for_delivery','delivered','cancelled'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
    await db.run("UPDATE orders SET status=?, updated_at=datetime('now','localtime') WHERE id=?", [status, req.params.id]);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status: ' + err.message });
  }
});

/* ── All customers ─────────────────────────── */
router.get('/customers', adminOnly, async (req, res) => {
  try {
    const customers = await db.all(`
      SELECT u.id, u.name, u.email, u.phone, u.hostel_no, u.room_no, u.created_at,
             COUNT(o.id) as order_count,
             COALESCE(SUM(o.total),0) as total_spent
      FROM users u
      LEFT JOIN orders o ON o.user_id = u.id
      WHERE u.role='customer'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers: ' + err.message });
  }
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
      const dataUri = image.startsWith('data:') ? image : `data:image/${cleanExt};base64,${base64Data}`;
      res.json({ success: true, url: dataUri, filename: safeName });
    }
  } catch (err) {
    console.error('Upload image error:', err);
    res.status(500).json({ error: 'Failed to process image: ' + err.message });
  }
});

/* ── Products CRUD ─────────────────────────── */
router.get('/products', adminOnly, async (req, res) => {
  try {
    const products = await db.all('SELECT * FROM products ORDER BY id DESC');
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Could not fetch products: ' + err.message });
  }
});

// Bulk add or sync products (used by auto-backup / restore)
router.post('/products/bulk', adminOnly, async (req, res) => {
  try {
    const { products: items } = req.body;
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ error: 'No products provided for bulk sync.' });
    }

    let added = 0;
    let updated = 0;

    for (const item of items) {
      if (!item.name || item.price === undefined || item.price === null) continue;
      const existing = await db.get('SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', [item.name]);
      const qty = Math.max(0, parseInt(item.quantity) || 0);
      const stock = item.in_stock !== undefined ? (item.in_stock ? 1 : 0) : (qty > 0 ? 1 : 0);
      const cleanName = item.name.trim();
      const cleanCategory = (item.category || 'chips').trim().toLowerCase();
      const cleanPrice = parseFloat(item.price) || 0;
      const cleanDesc = (item.description || '').trim();
      const cleanImg = (item.image_url || '').trim() || 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400&q=80';

      if (existing) {
        await db.run(`
          UPDATE products
          SET category=?, price=?, quantity=?, in_stock=?, description=?, image_url=?
          WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
        `, [cleanCategory, cleanPrice, qty, stock, cleanDesc, cleanImg, cleanName]);
        updated++;
      } else {
        await db.run(`
          INSERT INTO products (name, category, price, quantity, in_stock, description, image_url)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [cleanName, cleanCategory, cleanPrice, qty, stock, cleanDesc, cleanImg]);
        added++;
      }
    }

    const totalRow = await db.get('SELECT COUNT(*) as c FROM products');
    res.json({ success: true, added, updated, total: totalRow ? totalRow.c : 0 });
  } catch (err) {
    console.error('Bulk sync error:', err);
    res.status(500).json({ error: 'Failed to sync inventory: ' + err.message });
  }
});

// Add new product
router.post('/products', adminOnly, async (req, res) => {
  try {
    const { name, category, price, description, image_url, quantity = 20, in_stock = 1 } = req.body;
    if (!name || price === undefined || price === null || isNaN(parseFloat(price))) {
      return res.status(400).json({ error: 'Product name and valid price are required.' });
    }
    const result = await db.run(`
      INSERT INTO products (name, category, price, description, image_url, quantity, in_stock)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      name.trim(),
      (category || 'chips').trim().toLowerCase(),
      parseFloat(price) || 0,
      (description || '').trim(),
      (image_url || '').trim() || 'https://images.unsplash.com/photo-1582169296194-e4d644c48063?w=400&q=80',
      Math.max(0, parseInt(quantity) || 0),
      in_stock ? 1 : 0
    ]);
    const newProduct = await db.get('SELECT * FROM products WHERE id=?', [result.lastInsertRowid]);
    res.json({ success: true, product: newProduct });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'Failed to save product: ' + err.message });
  }
});

// Update product
router.put('/products/:id', adminOnly, async (req, res) => {
  try {
    const { name, category, price, description, image_url, quantity, in_stock } = req.body;
    if (!name || price === undefined || price === null || isNaN(parseFloat(price))) {
      return res.status(400).json({ error: 'Product name and valid price are required.' });
    }
    const qty = Math.max(0, parseInt(quantity) || 0);
    const stock = in_stock !== undefined ? (in_stock ? 1 : 0) : (qty > 0 ? 1 : 0);
    await db.run(`
      UPDATE products
      SET name=?, category=?, price=?, description=?, image_url=?, quantity=?, in_stock=?
      WHERE id=?
    `, [
      name.trim(),
      (category || 'chips').trim().toLowerCase(),
      parseFloat(price) || 0,
      (description || '').trim(),
      (image_url || '').trim(),
      qty,
      stock,
      req.params.id
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Failed to update product: ' + err.message });
  }
});

// Toggle in_stock / stock out
router.patch('/products/:id/stock', adminOnly, async (req, res) => {
  try {
    const { in_stock } = req.body;
    const stock = in_stock ? 1 : 0;
    if (stock === 1) {
      await db.run('UPDATE products SET in_stock=1, quantity=CASE WHEN quantity <= 0 THEN 10 ELSE quantity END WHERE id=?', [req.params.id]);
    } else {
      await db.run('UPDATE products SET in_stock=0 WHERE id=?', [req.params.id]);
    }
    res.json({ success: true, in_stock: stock });
  } catch (err) {
    console.error('Error toggling stock:', err);
    res.status(500).json({ error: 'Could not change stock: ' + err.message });
  }
});

// Set available quantity
router.patch('/products/:id/quantity', adminOnly, async (req, res) => {
  try {
    const qty = Math.max(0, parseInt(req.body.quantity) || 0);
    const stock = qty > 0 ? 1 : 0;
    await db.run('UPDATE products SET quantity=?, in_stock=? WHERE id=?', [qty, stock, req.params.id]);
    res.json({ success: true, quantity: qty, in_stock: stock });
  } catch (err) {
    console.error('Error setting quantity:', err);
    res.status(500).json({ error: 'Could not change quantity: ' + err.message });
  }
});

// Delete product
router.delete('/products/:id', adminOnly, async (req, res) => {
  try {
    const id = req.params.id;
    // Detach from order_items so historical records don't block deletion
    try {
      await db.run('UPDATE order_items SET product_id = NULL WHERE product_id = ?', [id]);
    } catch (fkErr) {
      // Ignore if table or foreign key is not restricting
    }

    const result = await db.run('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true, message: 'Product deleted permanently.' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Could not delete product: ' + err.message });
  }
});


module.exports = router;
