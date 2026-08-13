const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { run, get, all } = require('../database/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await get('SELECT * FROM users WHERE (username=? OR email=?) AND is_active=1', [username, username]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Server error: ' + e.message });
  }
});

router.get('/verify', authenticateToken, (req, res) => res.json({ valid: true, user: req.user }));

router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword||!newPassword) return res.status(400).json({ error: 'Champs requis' });
  if (newPassword.length<6) return res.status(400).json({ error: 'Min. 6 caractères' });
  const user = await get('SELECT * FROM users WHERE id=?', [req.user.id]);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  await run('UPDATE users SET password_hash=? WHERE id=?', [bcrypt.hashSync(newPassword, 10), req.user.id]);
  res.json({ success: true });
});

router.get('/users', authenticateToken, async (req, res) => {
  const users = await all('SELECT id,username,email,role,is_active,created_at FROM users');
  res.json(users);
});

router.post('/users', authenticateToken, async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username||!email||!password) return res.status(400).json({ error: 'Tous les champs requis' });
  try {
    const r = await run('INSERT INTO users (username,email,password_hash,role) VALUES (?,?,?,?)', [username,email,bcrypt.hashSync(password,10),role||'admin']);
    res.json({ success: true, id: r.lastID });
  } catch { res.status(400).json({ error: 'Identifiant ou email déjà utilisé' }); }
});

router.put('/users/:id', authenticateToken, async (req, res) => {
  const { username, email, role, is_active } = req.body;
  await run('UPDATE users SET username=?,email=?,role=?,is_active=? WHERE id=?', [username,email,role,is_active,req.params.id]);
  res.json({ success: true });
});

router.delete('/users/:id', authenticateToken, async (req, res) => {
  if (parseInt(req.params.id)===req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre compte' });
  await run('DELETE FROM users WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
