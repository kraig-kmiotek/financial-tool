const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM deposits ORDER BY id').all());
});

router.post('/', (req, res) => {
  const { label, amount } = req.body;
  if (!label) return res.status(400).json({ error: 'label required' });
  const result = db
    .prepare('INSERT INTO deposits (label, amount) VALUES (?, ?)')
    .run(label.trim(), amount || 0);
  res.json(db.prepare('SELECT * FROM deposits WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM deposits WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
