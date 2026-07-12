const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/products?category=cereales → public, liste tous les produits
router.get('/', (req, res) => {
  const { category } = req.query;
  let products = db.get('products').value();
  if (category) products = products.filter(p => p.cat === category);
  res.json(products);
});

// GET /api/products/:id → public
router.get('/:id', (req, res) => {
  const product = db.get('products').find({ id: req.params.id }).value();
  if (!product) return res.status(404).json({ error: 'Produit introuvable' });
  res.json(product);
});

// POST /api/products → admin uniquement
router.post('/', requireAdmin, (req, res) => {
  const { name, cat, format, price, icon, image } = req.body;
  if (!name || !cat) return res.status(400).json({ error: 'Les champs "name" et "cat" sont obligatoires' });
  const product = {
    id: uuid(),
    name,
    cat,
    format: format || '',
    price: price != null && price !== '' ? Number(price) : null,
    icon: icon || 'grain',
    image: image || null,
    promoPct: 0
  };
  db.get('products').push(product).write();
  db.notify(`Nouveau produit ajouté : ${name}`);
  res.status(201).json(product);
});

// PUT /api/products/:id → admin uniquement (prix, image, promo, etc.)
router.put('/:id', requireAdmin, (req, res) => {
  const productRef = db.get('products').find({ id: req.params.id });
  const before = productRef.value();
  if (!before) return res.status(404).json({ error: 'Produit introuvable' });

  const changes = { ...req.body };
  if (changes.price != null) changes.price = changes.price === '' ? null : Number(changes.price);
  if (changes.promoPct != null) changes.promoPct = Number(changes.promoPct);

  productRef.assign(changes).write();
  const after = productRef.value();

  if (changes.price != null && changes.price !== before.price) {
    db.notify(`Prix modifié pour "${before.name}" : ${before.price ?? '—'} → ${after.price} FCFA`);
  }
  if (changes.promoPct != null && changes.promoPct !== before.promoPct) {
    db.notify(after.promoPct > 0
      ? `Promotion activée sur "${before.name}" : -${after.promoPct}%`
      : `Promotion retirée sur "${before.name}"`);
  }
  if (changes.image != null) {
    db.notify(`Image mise à jour pour "${before.name}"`);
  }

  res.json(after);
});

// DELETE /api/products/:id → admin uniquement
router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.get('products').find({ id: req.params.id }).value();
  if (!existing) return res.status(404).json({ error: 'Produit introuvable' });
  db.get('products').remove({ id: req.params.id }).write();
  db.notify(`Produit supprimé : ${existing.name}`);
  res.status(204).end();
});

module.exports = router;
