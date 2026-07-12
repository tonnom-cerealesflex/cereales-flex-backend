// Base de données simple basée sur un fichier JSON (lowdb).
// Suffisant pour démarrer sans configuration lourde. Voir README.md pour
// les limites de persistance sur l'hébergement gratuit et comment évoluer
// vers une vraie base de données hébergée (Postgres, Turso...) plus tard.

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const bcrypt = require('bcryptjs');

const adapter = new FileSync(path.join(__dirname, 'data', 'db.json'));
const db = low(adapter);

// Mot de passe admin par défaut : "grenier2026"
// ⚠️ À changer avant mise en production réelle (voir README : variable ADMIN_PASSWORD).
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'grenier2026';

const SEED_PRODUCTS = [
  { id: 'c1', cat: 'cereales', name: 'Maïs en grains', format: 'Sac de 100 kg', price: 16500, icon: 'grain', promoPct: 0 },
  { id: 'c2', cat: 'cereales', name: 'Mil', format: 'Sac de 100 kg', price: null, icon: 'grain', promoPct: 0 },
  { id: 'c3', cat: 'cereales', name: 'Sorgho (rouge/blanc)', format: 'Sac de 100 kg', price: null, icon: 'grain', promoPct: 0 },
  { id: 'c4', cat: 'cereales', name: 'Riz local', format: 'Sac de 50 kg', price: null, icon: 'grain', promoPct: 0 },
  { id: 'c5', cat: 'cereales', name: 'Niébé (haricot local)', format: 'Sac de 100 kg', price: null, icon: 'grain', promoPct: 0 },
  { id: 'c6', cat: 'cereales', name: 'Arachide', format: 'Sac de 100 kg', price: null, icon: 'grain', promoPct: 0 },

  { id: 'f1', cat: 'farines', name: 'Farine de maïs', format: 'Sac de 25 kg', price: 10000, icon: 'flour', promoPct: 0 },
  { id: 'f2', cat: 'farines', name: 'Farine de maïs', format: 'Sac de 30 kg', price: 12500, icon: 'flour', promoPct: 0 },
  { id: 'f3', cat: 'farines', name: 'Farine de mil', format: 'Sac de 25 kg', price: null, icon: 'flour', promoPct: 0 },
  { id: 'f4', cat: 'farines', name: 'Farine de sorgho', format: 'Sac de 25 kg', price: null, icon: 'flour', promoPct: 0 },
  { id: 'f5', cat: 'farines', name: 'Farine de niébé', format: 'Sac de 25 kg', price: null, icon: 'flour', promoPct: 0 },
  { id: 'f6', cat: 'farines', name: 'Farine composée (bouillie)', format: 'Sac de 5 kg', price: null, icon: 'flour', promoPct: 0 },

  { id: 's1', cat: 'son', name: 'Son de maïs', format: 'Le plat', price: 200, icon: 'bran', promoPct: 0 },
  { id: 's2', cat: 'son', name: 'Son de maïs', format: 'Sac de 20 plats', price: 4000, icon: 'bran', promoPct: 0 },
  { id: 's3', cat: 'son', name: 'Tourteau de coton', format: 'Sac de 50 kg', price: null, icon: 'bran', promoPct: 0 },
  { id: 's4', cat: 'son', name: "Tourteau d'arachide", format: 'Sac de 50 kg', price: null, icon: 'bran', promoPct: 0 },
  { id: 's5', cat: 'son', name: 'Provende volaille (ponte / chair)', format: 'Sac de 50 kg', price: null, icon: 'bran', promoPct: 0 },
  { id: 's6', cat: 'son', name: 'Concentré minéral vitaminé (CMV)', format: 'Sac de 25 kg', price: null, icon: 'bran', promoPct: 0 },

  { id: 'i1', cat: 'couveuses', name: 'Couveuse artisanale', format: '50 à 100 œufs', price: null, icon: 'incubator', promoPct: 0 },
  { id: 'i2', cat: 'couveuses', name: 'Couveuse moyenne capacité', format: '200 à 500 œufs', price: null, icon: 'incubator', promoPct: 0 },
  { id: 'i3', cat: 'couveuses', name: 'Couveuse grande capacité', format: '1000 œufs et plus', price: null, icon: 'incubator', promoPct: 0 },
  { id: 'i4', cat: 'couveuses', name: 'Éleveuse / poussinière', format: 'Chauffage poussins', price: null, icon: 'incubator', promoPct: 0 },

  { id: 'm1', cat: 'materiel', name: 'Mangeoires & abreuvoirs', format: "À l'unité", price: null, icon: 'tool', promoPct: 0 },
  { id: 'm2', cat: 'materiel', name: 'Cages / parcs volaille', format: "À l'unité", price: null, icon: 'tool', promoPct: 0 },
  { id: 'm3', cat: 'materiel', name: 'Lampes chauffantes', format: "À l'unité", price: null, icon: 'tool', promoPct: 0 },
  { id: 'm4', cat: 'materiel', name: 'Pulvérisateurs, houes, dabas', format: "À l'unité", price: null, icon: 'tool', promoPct: 0 },
  { id: 'm5', cat: 'materiel', name: 'Petits moulins / décortiqueuses', format: "À l'unité", price: null, icon: 'tool', promoPct: 0 }
];

db.defaults({
  products: SEED_PRODUCTS,
  orders: [],
  subscribers: [],
  settings: {
    transport: { base: 500, perKm: 150, shopLat: 12.3714, shopLon: -1.5197 },
    payment: { installmentsEnabled: true, maxTranches: 3, minOrderForInstallments: 20000, mobileMoneyEnabled: true, sourceDeductionEnabled: true }
  },
  clients: [],       // { phone, name, discountPct (négatif = majoration), premium }
  messages: [],      // { id, clientPhone, clientName, from: 'client'|'admin', text, createdAt }
  notifications: [], // { id, text, createdAt }
  adminPasswordHash: bcrypt.hashSync(DEFAULT_ADMIN_PASSWORD, 10)
}).write();

function notify(text) {
  const { v4: uuid } = require('uuid');
  db.get('notifications').push({ id: uuid(), text, createdAt: new Date().toISOString() }).write();
}

module.exports = db;
module.exports.notify = notify;
