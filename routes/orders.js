const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// POST /api/orders
router.post('/', (req, res) => {
  const { customerName, customerPhone, items, paymentMode, tranches, sourceDeductionRequested, delivery } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'La commande doit contenir au moins un produit' });
  }

  const products = db.get('products').value();
  const settings = db.get('settings').value();
  const client = customerPhone ? db.get('clients').find({ phone: customerPhone }).value() : null;
  const clientDiscountPct = client ? (client.discountPct || 0) : 0;

  let subtotal = 0;
  const resolvedItems = [];
  for (const line of items) {
    const product = products.find(p => p.id === line.productId);
    if (!product) return res.status(400).json({ error: `Produit inconnu : ${line.productId}` });
    if (product.price == null) return res.status(400).json({ error: `Le produit "${product.name}" n'a pas encore de prix fixé` });

    let unitPrice = product.promoPct ? Math.round(product.price * (1 - product.promoPct / 100)) : product.price;
    if (clientDiscountPct) unitPrice = Math.round(unitPrice * (1 - clientDiscountPct / 100));

    const qty = Math.max(1, Number(line.qty) || 1);
    subtotal += unitPrice * qty;
    resolvedItems.push({ productId: product.id, name: product.name, format: product.format, qty, unitPrice, lineTotal: unitPrice * qty });
  }

  let deliveryInfo = { wanted: false, distanceKm: null, price: 0 };
  if (delivery && delivery.wanted && delivery.lat != null && delivery.lon != null) {
    const distanceKm = haversineKm(settings.transport.shopLat, settings.transport.shopLon, delivery.lat, delivery.lon);
    const price = Math.round(settings.transport.base + distanceKm * settings.transport.perKm);
    deliveryInfo = { wanted: true, distanceKm: Number(distanceKm.toFixed(1)), price };
  }

  const total = subtotal + deliveryInfo.price;

  const allowedModes = ['comptant', 'echelonne', 'mobile_money'];
  const mode = allowedModes.includes(paymentMode) ? paymentMode : 'comptant';
  let installmentPlan = null;
  if (mode === 'echelonne') {
    if (!settings.payment.installmentsEnabled) {
      return res.status(400).json({ error: "Le paiement échelonné n'est pas activé actuellement" });
    }
    if (total < settings.payment.minOrderForInstallments) {
      return res.status(400).json({ error: `Montant minimum pour échelonner : ${settings.payment.minOrderForInstallments} FCFA` });
    }
    const n = Math.min(Math.max(2, Number(tranches) || 2), settings.payment.maxTranches);
    installmentPlan = { tranches: n, amountPerTranche: Math.round(total / n) };
  }
  if (mode === 'mobile_money' && !settings.payment.mobileMoneyEnabled) {
    return res.status(400).json({ error: "Le paiement Mobile Money n'est pas activé actuellement" });
  }

  const order = {
    id: uuid(),
    customerName: customerName || null,
    customerPhone: customerPhone || null,
    items: resolvedItems,
    subtotal,
    delivery: deliveryInfo,
    total,
    paymentMode: mode,
    installmentPlan,
    sourceDeductionRequested: !!sourceDeductionRequested,
    status: 'nouvelle',
    createdAt: new Date().toISOString()
  };

  db.get('orders').push(order).write();
  db.notify(`Nouvelle commande${customerName ? ' de ' + customerName : ''} — ${total.toLocaleString('fr-FR')} FCFA (${mode})`);
  if (order.sourceDeductionRequested) {
    db.notify(`Demande de coupure à la source pour la commande ${order.id.slice(0, 8)} — autorisation employeur/banque à finaliser`);
  }

  res.status(201).json(order);
});

// GET /api/orders → admin uniquement
router.get('/', requireAdmin, (req, res) => {
  res.json(db.get('orders').orderBy('createdAt', 'desc').value());
});

// GET /api/orders/:id → admin uniquement
router.get('/:id', requireAdmin, (req, res) => {
  const order = db.get('orders').find({ id: req.params.id }).value();
  if (!order) return res.status(404).json({ error: 'Commande introuvable' });
  res.json(order);
});

// PUT /api/orders/:id/status → admin uniquement
router.put('/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body;
  const orderRef = db.get('orders').find({ id: req.params.id });
  if (!orderRef.value()) return res.status(404).json({ error: 'Commande introuvable' });
  orderRef.assign({ status }).write();
  db.notify(`Commande ${req.params.id.slice(0, 8)} → statut "${status}"`);
  res.json(orderRef.value());
});

module.exports = router;
