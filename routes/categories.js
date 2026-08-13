const express = require('express');
const router = express.Router();
const { run, get, all } = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

function slugify(t) { return t.toString().toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]+/g,'').replace(/\-\-+/g,'-').trim(); }

router.get('/', async (req, res) => {
  const cats = await all(`SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON p.category_id = c.id AND p.is_active=1 WHERE c.is_active=1 GROUP BY c.id ORDER BY c.sort_order, c.name`);
  res.json(cats);
});
router.get('/all', authenticateToken, async (req, res) => {
  const cats = await all(`SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id ORDER BY c.sort_order, c.name`);
  res.json(cats);
});
router.get('/:id', async (req, res) => {
  const c = await get('SELECT * FROM categories WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Non trouvée' });
  res.json(c);
});
router.post('/', authenticateToken, async (req, res) => {
  const { name, description, image_url, sort_order, is_active } = req.body;
  if (!name) return res.status(400).json({ error: 'Nom requis' });
  let slug = slugify(name);
  const ex = await get('SELECT id FROM categories WHERE slug=?', [slug]);
  if (ex) slug += '-' + Date.now();
  try {
    const r = await run('INSERT INTO categories (name,slug,description,image_url,sort_order,is_active) VALUES (?,?,?,?,?,?)', [name,slug,description||'',image_url||'',sort_order||0,is_active!==undefined?is_active:1]);
    res.status(201).json({ success: true, id: r.lastID });
  } catch(e) { res.status(400).json({ error: e.message }); }
});
router.put('/:id', authenticateToken, async (req, res) => {
  const { name, description, image_url, sort_order, is_active } = req.body;
  const c = await get('SELECT * FROM categories WHERE id=?', [req.params.id]);
  if (!c) return res.status(404).json({ error: 'Non trouvée' });
  await run('UPDATE categories SET name=?,description=?,image_url=?,sort_order=?,is_active=? WHERE id=?',
    [name||c.name, description!==undefined?description:c.description, image_url!==undefined?image_url:c.image_url, sort_order!==undefined?sort_order:c.sort_order, is_active!==undefined?is_active:c.is_active, req.params.id]);
  res.json({ success: true });
});
router.delete('/:id', authenticateToken, async (req, res) => {
  const cnt = await get('SELECT COUNT(*) as c FROM products WHERE category_id=?', [req.params.id]);
  if (cnt.c > 0) return res.status(400).json({ error: `${cnt.c} produit(s) dans cette catégorie` });
  await run('DELETE FROM categories WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
