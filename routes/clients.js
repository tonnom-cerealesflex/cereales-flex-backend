const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/clients → admin uniquement (liste complète)
router.get('/', requireAdmin, (req, res) => {
  res.json(db.get('clients').value());
});

// GET /api/clients/:phone/pricing → public, limité au strict nécessaire
router.get('/:phone/pricing', (req, res) => {
  const client = db.get('clients').find({ phone: req.params.phone }).value();
  if (!client) return res.json({ discountPct: 0, premium: false });
  res.json({ discountPct: client.discountPct || 0, premium: !!client.premium });
});

// PUT /api/clients/:phone → admin uniquement : créer ou mettre à jour un tarif individuel
router.put('/:phone', requireAdmin, (req, res) => {
  const { phone } = req.params;
  const { name, discountPct, premium } = req.body;
  let client = db.get('clients').find({ phone }).value();
  if (client) {
    db.get('clients').find({ phone }).assign({
      name: name ?? client.name,
      discountPct: discountPct != null ? Number(discountPct) : client.discountPct,
      premium: premium != null ? !!premium : client.premium
    }).write();
  } else {
    client = { phone, name: name || '', discountPct: discountPct ? Number(discountPct) : 0, premium: !!premium };
    db.get('clients').push(client).write();
  }
  db.notify(`Tarif individuel mis à jour pour ${name || phone}`);
  res.json(db.get('clients').find({ phone }).value());
});

module.exports = router;
