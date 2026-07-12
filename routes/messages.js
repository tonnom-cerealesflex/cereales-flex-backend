const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// POST /api/messages → un client envoie un message (public)
router.post('/', (req, res) => {
  const { clientPhone, clientName, text } = req.body;
  if (!clientPhone || !text) {
    return res.status(400).json({ error: 'Téléphone et message requis' });
  }
  const message = { id: uuid(), clientPhone, clientName: clientName || '', from: 'client', text, createdAt: new Date().toISOString() };
  db.get('messages').push(message).write();
  db.notify(`Nouveau message de ${clientName || clientPhone}`);
  res.status(201).json(message);
});

// GET /api/messages/:phone → conversation d'un client (utilisé par le client ET l'admin)
router.get('/:phone', (req, res) => {
  const thread = db.get('messages').filter({ clientPhone: req.params.phone }).orderBy('createdAt', 'asc').value();
  res.json(thread);
});

// GET /api/messages → admin uniquement : liste de toutes les conversations (regroupées)
router.get('/', requireAdmin, (req, res) => {
  const all = db.get('messages').value();
  const byClient = {};
  all.forEach(m => {
    if (!byClient[m.clientPhone]) byClient[m.clientPhone] = { clientPhone: m.clientPhone, clientName: m.clientName, messages: [] };
    byClient[m.clientPhone].messages.push(m);
    if (m.clientName) byClient[m.clientPhone].clientName = m.clientName;
  });
  res.json(Object.values(byClient));
});

// POST /api/messages/:phone/reply → admin répond à un client
router.post('/:phone/reply', requireAdmin, (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Message requis' });
  const message = { id: uuid(), clientPhone: req.params.phone, clientName: '', from: 'admin', text, createdAt: new Date().toISOString() };
  db.get('messages').push(message).write();
  res.status(201).json(message);
});

module.exports = router;
