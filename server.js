require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/banners', require('./routes/banners'));

// SPA fallback for admin
app.get('/admin/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── SEO: Dynamic Sitemap ──────────────────────────────────────────────────────
app.get('/sitemap.xml', async (req, res) => {
  try {
    const { all } = require('./database/db');
    const host = process.env.SITE_URL || `https://${req.headers.host}`;
    const now = new Date().toISOString().split('T')[0];

    const products = await all('SELECT slug, updated_at FROM products WHERE is_active=1');
    const categories = await all('SELECT slug FROM categories WHERE is_active=1');

    const staticPages = [
      { url: '/',             priority: '1.0', changefreq: 'daily' },
      { url: '/shop.html',    priority: '0.9', changefreq: 'daily' },
      { url: '/about.html',   priority: '0.6', changefreq: 'monthly' },
      { url: '/contact.html', priority: '0.6', changefreq: 'monthly' },
      { url: '/shipping.html',priority: '0.5', changefreq: 'monthly' },
    ];

    const productUrls = products.map(p => ({
      url: `/product.html?id=${p.slug}`,
      priority: '0.8',
      changefreq: 'weekly',
      lastmod: p.updated_at ? p.updated_at.split('T')[0] : now,
    }));

    const categoryUrls = categories.map(c => ({
      url: `/shop.html?category=${c.slug}`,
      priority: '0.7',
      changefreq: 'weekly',
    }));

    const allUrls = [...staticPages, ...categoryUrls, ...productUrls];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map(u => `  <url>
    <loc>${host}${u.url}</loc>
    <lastmod>${u.lastmod || now}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.send(xml);
  } catch (e) {
    res.status(500).send('Sitemap error: ' + e.message);
  }
});

// Wait for DB init before starting server
const { initPromise } = require('./database/db');
initPromise.then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 13-Pills started on http://localhost:${PORT}`);
    console.log(`📦 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`🔑 Admin credentials: admin / admin123\n`);
  });
}).catch(e => {
  console.error('Failed to initialize database:', e);
  // Start anyway so health check works on Vercel
  app.listen(PORT, () => {
    console.log(`⚠️ Server started without DB on port ${PORT}`);
  });
});
