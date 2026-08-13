const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

router.get('/', async (req, res) => res.json(await all('SELECT * FROM banners WHERE is_active=1 ORDER BY sort_order')));
router.get('/all', authenticateToken, async (req, res) => res.json(await all('SELECT * FROM banners ORDER BY sort_order')));
router.post('/', authenticateToken, async (req, res) => {
  const { title, subtitle, image_url, link, button_text, is_active, sort_order } = req.body;
  const r = await run('INSERT INTO banners (title,subtitle,image_url,link,button_text,is_active,sort_order) VALUES (?,?,?,?,?,?,?)', [title,subtitle,image_url,link,button_text||'Shop Now',is_active!==false?1:0,sort_order||0]);
  res.status(201).json({ success: true, id: r.lastID });
});
router.put('/:id', authenticateToken, async (req, res) => {
  const { title, subtitle, image_url, link, button_text, is_active, sort_order } = req.body;
  await run('UPDATE banners SET title=?,subtitle=?,image_url=?,link=?,button_text=?,is_active=?,sort_order=? WHERE id=?', [title,subtitle,image_url,link,button_text,is_active?1:0,sort_order,req.params.id]);
  res.json({ success: true });
});
router.delete('/:id', authenticateToken, async (req, res) => {
  await run('DELETE FROM banners WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
