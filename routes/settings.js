const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings → public : le site en a besoin pour calculer livraison/paiement
router.get('/', (req, res) => {
  res.json(db.get('settings').value());
});

// PUT /api/settings → admin uniquement
router.put('/', requireAdmin, (req, res) => {
  const current = db.get('settings').value();
  const updated = {
    transport: { ...current.transport, ...(req.body.transport || {}) },
    payment: { ...current.payment, ...(req.body.payment || {}) }
  };
  db.set('settings', updated).write();
  db.notify('Paramètres de livraison/paiement modifiés');
  res.json(updated);
});

module.exports = router;
