const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const router  = express.Router();
const SECRET  = process.env.JWT_SECRET || 'hc_secret_lpu_2024';

/* ── Register ──────────────────────────────── */
router.post('/register', (req, res) => {
  const { name, email, phone, password, hostel_no, room_no } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email and password are required.' });
  if (password.length < 4)
    return res.status(400).json({ error: 'Password must be at least 4 characters.' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Email already registered.' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, phone, password, hostel_no, room_no)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, email, phone || null, hash, hostel_no || null, room_no || null);

  const token = jwt.sign({ id: result.lastInsertRowid, role: 'customer' }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: result.lastInsertRowid, name, email, role: 'customer' } });
});

/* ── Login ─────────────────────────────────── */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Invalid email or password.' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid email or password.' });

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, hostel_no: user.hostel_no, room_no: user.room_no }
  });
});

/* ── Me (verify token) ─────────────────────── */
router.get('/me', (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token.' });
  try {
    const payload = jwt.verify(auth.replace('Bearer ', ''), SECRET);
    const user = db.prepare('SELECT id,name,email,role,hostel_no,room_no,phone FROM users WHERE id=?').get(payload.id);
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid token.' });
  }
});

module.exports = router;
