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
router.get('/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id').all();
  res.json(products);
});

/* ── Place order (Login Required) ──────────── */
router.post('/', requireAuth, (req, res) => {
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
  const user = db.prepare('SELECT name, phone FROM users WHERE id = ?').get(userId);
  const finalName = (guest_name || (user && user.name) || 'Hostel Student').trim();
  const finalPhone = (guest_phone || (user && user.phone) || '').trim();

  const orderResult = db.prepare(`
    INSERT INTO orders (user_id, guest_name, guest_phone, hostel_no, room_no, total, delivery_type, payment_method, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, finalName, finalPhone, hostel_no, room_no, total,
         delivery_type || 'door', payment_method || 'cash', notes || null);

  const orderId = orderResult.lastInsertRowid;
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, name, price, quantity)
    VALUES (?, ?, ?, ?, ?)
  `);
  items.forEach(item => {
    insertItem.run(orderId, item.product_id || null, item.name, item.price, item.quantity);
  });

  res.json({ success: true, order_id: orderId, total, message: `Order #${orderId} placed! Delivering in 10 mins 🚀` });
});

/* ── My orders (logged-in users) ──────────── */
router.get('/my', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Login required.' });
  let payload;
  try { payload = jwt.verify(auth.replace('Bearer ', ''), SECRET); }
  catch { return res.status(401).json({ error: 'Invalid token.' }); }

  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(payload.id);

  const getItems = db.prepare('SELECT name, price, quantity FROM order_items WHERE order_id = ?');
  const fullOrders = orders.map(ord => {
    const items = getItems.all(ord.id);
    const items_summary = items.map(i => `${i.name} x${i.quantity}`).join(', ');
    return { ...ord, items, items_summary };
  });

  res.json(fullOrders);
});

module.exports = router;
