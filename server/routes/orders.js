const express = require('express');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const router  = express.Router();
const SECRET  = process.env.JWT_SECRET || 'hc_secret_lpu_2024';

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) {
    return res.status(401).json({ error: 'Please log in or create an account to place an order.' });
  }
  try {
    req.user = jwt.verify(auth.replace('Bearer ', ''), SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
}

/* ── Get products ──────────────────────────── */
router.get('/products', async (req, res) => {
  try {
    const products = await db.all('SELECT * FROM products ORDER BY id');
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products: ' + err.message });
  }
});

/* ── Place order (Login Required) ──────────── */
router.post('/', requireAuth, async (req, res) => {
  try {
    let { items, hostel_no, room_no, guest_name, guest_phone, delivery_type, payment_method, notes } = req.body;

    if (!items || !items.length)
      return res.status(400).json({ error: 'Cart is empty.' });
    if (!hostel_no && room_no) hostel_no = room_no;
    if (!room_no && hostel_no) room_no = hostel_no;
    if (!hostel_no && !room_no)
      return res.status(400).json({ error: 'Hostel and room number required.' });

    // Validate min order ₹30
    const total = items.reduce((s, i) => s + (i.price * i.quantity), 0);
    if (total < 30)
      return res.status(400).json({ error: 'Minimum order amount is ₹30.' });

    const userId = req.user.id;
    const user = await db.get('SELECT name, phone FROM users WHERE id = ?', [userId]);
    const finalName = (guest_name || (user && user.name) || 'Hostel Student').trim();
    const finalPhone = (guest_phone || (user && user.phone) || '').trim();

    const orderResult = await db.run(`
      INSERT INTO orders (user_id, guest_name, guest_phone, hostel_no, room_no, total, delivery_type, payment_method, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [userId, finalName, finalPhone, hostel_no, room_no, total,
        delivery_type || 'door', payment_method || 'cash', notes || null]);

    const orderId = orderResult.lastInsertRowid;

    for (const item of items) {
      await db.run(`
        INSERT INTO order_items (order_id, product_id, name, price, quantity)
        VALUES (?, ?, ?, ?, ?)
      `, [orderId, item.product_id || null, item.name, item.price, item.quantity]);
    }

    res.json({ success: true, order_id: orderId, total, message: `Order #${orderId} placed! Delivering in 10 mins 🚀` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to place order: ' + err.message });
  }
});

/* ── My orders (logged-in users) ──────────── */
router.get('/my', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Login required.' });
  let payload;
  try { payload = jwt.verify(auth.replace('Bearer ', ''), SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token.' }); }

  try {
    const orders = await db.all(`
      SELECT * FROM orders
      WHERE user_id = ?
      ORDER BY id DESC
    `, [payload.id]);

    const fullOrders = [];
    for (const ord of orders) {
      const items = await db.all('SELECT name, price, quantity FROM order_items WHERE order_id = ?', [ord.id]);
      const items_summary = items.map(i => `${i.name} x${i.quantity}`).join(', ');
      fullOrders.push({ ...ord, items, items_summary });
    }

    res.json(fullOrders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders: ' + err.message });
  }
});

module.exports = router;
