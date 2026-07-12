const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireCustomer, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/customers/register  { phone, name, password }
router.post('/register', (req, res) => {
  const { phone, name, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: 'Téléphone et mot de passe requis' });
  if (password.length < 4) return res.status(400).json({ error: 'Mot de passe trop court (4 caractères minimum)' });

  let client = db.get('clients').find({ phone }).value();
  if (client && client.passwordHash) {
    return res.status(409).json({ error: 'Un compte existe déjà avec ce numéro' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  if (client) {
    db.get('clients').find({ phone }).assign({ name: name || client.name, passwordHash }).write();
  } else {
    client = { phone, name: name || '', discountPct: 0, premium: false, passwordHash };
    db.get('clients').push(client).write();
  }

  const token = jwt.sign({ role: 'customer', phone }, JWT_SECRET, { expiresIn: '30d' });
  db.notify(`Nouveau compte client créé : ${name || phone}`);
  res.status(201).json({ token, phone, name: name || '' });
});

// POST /api/customers/login  { phone, password }
router.post('/login', (req, res) => {
  const { phone, password } = req.body;
  const client = db.get('clients').find({ phone }).value();
  if (!client || !client.passwordHash || !bcrypt.compareSync(password, client.passwordHash)) {
    return res.status(401).json({ error: 'Numéro ou mot de passe incorrect' });
  }
  const token = jwt.sign({ role: 'customer', phone }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, phone, name: client.name || '' });
});

// GET /api/customers/me → profil du client connecté (réduction, premium)
router.get('/me', requireCustomer, (req, res) => {
  const client = db.get('clients').find({ phone: req.customerPhone }).value();
  res.json({
    phone: req.customerPhone,
    name: client?.name || '',
    discountPct: client?.discountPct || 0,
    premium: !!client?.premium
  });
});

// GET /api/customers/me/orders → historique des commandes du client connecté
router.get('/me/orders', requireCustomer, (req, res) => {
  const orders = db.get('orders').filter({ customerPhone: req.customerPhone }).orderBy('createdAt', 'desc').value();
  res.json(orders);
});

module.exports = router;
