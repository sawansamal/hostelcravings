const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app = express();

// ── Middleware ───────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve static frontend files ──────────────
app.use(express.static(path.join(__dirname, '..')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// ── API Routes ───────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/admin',  require('./routes/admin'));

// ── Health check ─────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toLocaleString('en-IN') }));

// ── Fallback: serve index.html ───────────────
app.get('{*splat}', (req, res) => {

  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// ── Start ────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🍪  Hostel Cravings server running at port ${PORT}`);
  console.log(`📊  Admin panel: /admin`);
  console.log(`🔑  Admin login: admin@hostelcravings.in / kulfimodda69\n`);
});
