const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', async (req, res) => {
  const rows = await all('SELECT key, value FROM settings');
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json(settings);
});

router.put('/', authenticateToken, async (req, res) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, String(value || '')]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

async function handleUpload(req, res, field) {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
  const url = `/uploads/${req.file.filename}`;
  await run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [field, url]);
  res.json({ success: true, url });
}

router.post('/upload/logo', authenticateToken, upload.single('logo'), (req, res) => handleUpload(req, res, 'logo_url'));
router.post('/upload/favicon', authenticateToken, upload.single('favicon'), (req, res) => handleUpload(req, res, 'favicon_url'));
router.post('/upload/product-image', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});
router.post('/upload/banner', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
  res.json({ success: true, url: `/uploads/${req.file.filename}` });
});

module.exports = router;
