const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-before-production';

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Connexion admin requise' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Accès admin requis' });
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session admin invalide ou expirée' });
  }
}

function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Connexion client requise' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'customer') return res.status(403).json({ error: 'Accès client requis' });
    req.customerPhone = payload.phone;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session client invalide ou expirée' });
  }
}

module.exports = { requireAdmin, requireCustomer, JWT_SECRET };
