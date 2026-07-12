const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login  { password }
router.post('/login', (req, res) => {
  const { password } = req.body;
  const hash = db.get('adminPasswordHash').value();
  if (!password || !bcrypt.compareSync(password, hash)) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }
  const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

module.exports = router;
