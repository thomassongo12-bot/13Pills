const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// ── Cloudinary setup ──────────────────────────────────────────────────────────
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name:  process.env.CLOUDINARY_CLOUD_NAME,
  api_key:     process.env.CLOUDINARY_API_KEY,
  api_secret:  process.env.CLOUDINARY_API_SECRET,
});

// Storage: upload directly to Cloudinary, no local disk needed
const cloudStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: '13pills',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'ico'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  }),
});

const upload = multer({
  storage: cloudStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ── GET all settings ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const rows = await all('SELECT key, value FROM settings');
    const settings = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PUT update settings ───────────────────────────────────────────────────────
router.put('/', authenticateToken, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value || '')]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Upload helper ─────────────────────────────────────────────────────────────
async function handleUpload(req, res, settingKey) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    const url = req.file.path; // Cloudinary returns the URL in req.file.path
    await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [settingKey, url]);
    res.json({ success: true, url });
  } catch (e) {
    console.error('Upload error:', e);
    res.status(500).json({ error: e.message });
  }
}

// ── Upload routes ─────────────────────────────────────────────────────────────
router.post('/upload/logo', authenticateToken, upload.single('logo'),
  (req, res) => handleUpload(req, res, 'logo_url'));

router.post('/upload/favicon', authenticateToken, upload.single('favicon'),
  (req, res) => handleUpload(req, res, 'favicon_url'));

router.post('/upload/product-image', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    res.json({ success: true, url: req.file.path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/upload/banner', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file received' });
    res.json({ success: true, url: req.file.path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
