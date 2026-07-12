const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications?since=ISO_DATE → admin uniquement
router.get('/', requireAdmin, (req, res) => {
  let list = db.get('notifications').orderBy('createdAt', 'desc').value();
  if (req.query.since) {
    const since = new Date(req.query.since).getTime();
    list = list.filter(n => new Date(n.createdAt).getTime() > since);
  }
  res.json(list.slice(0, 50));
});

module.exports = router;
