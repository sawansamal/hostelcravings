const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app = express();

// ── Ensure uploads directory exists ──────────
const uploadsDir = path.join(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  // Ignored on read-only environments like Vercel
}

// ── Middleware ───────────────────────────────
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// ── Redirect Render visitors to the new Vercel domain ──────────
app.use((req, res, next) => {
  const host = (req.headers.host || '').toLowerCase();
  const isRender = process.env.RENDER === 'true' || host.includes('onrender.com');

  if (isRender) {
    if (req.path.startsWith('/api')) {
      return res.status(308).json({
        moved: true,
        message: 'Hostel Cravings has moved to Vercel.',
        new_url: 'https://hostelcravings.vercel.app'
      });
    }
    return res.sendFile(path.join(__dirname, '..', 'moved.html'));
  }
  next();
});

// ── Serve static frontend files ──────────────
app.use(express.static(path.join(__dirname, '..')));
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));
app.use('/uploads', express.static(uploadsDir));


// ── No-Cache Headers for all API responses ──
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

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
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🍪  Hostel Cravings server running at port ${PORT}`);
    console.log(`📊  Admin panel: /admin\n`);
  });
}

module.exports = app;
