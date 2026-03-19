const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM template_bills ORDER BY sort_order').all());
});

// Reorder must come before /:id to avoid param conflict
router.put('/reorder', (req, res) => {
  const { order } = req.body; // array of ids in new sort order
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order must be an array' });
  const update = db.prepare('UPDATE template_bills SET sort_order = ? WHERE id = ?');
  db.transaction(() => {
    order.forEach((id, i) => update.run(i, id));
  })();
  res.json({ ok: true });
});

router.post('/', (req, res) => {
  const { name, amount } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const max = db.prepare('SELECT MAX(sort_order) as m FROM template_bills').get();
  const result = db
    .prepare('INSERT INTO template_bills (name, amount, sort_order) VALUES (?, ?, ?)')
    .run(name.trim(), amount || 0, (max.m ?? -1) + 1);
  res.json(db.prepare('SELECT * FROM template_bills WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, amount } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  db.prepare('UPDATE template_bills SET name = ?, amount = ? WHERE id = ?').run(
    name.trim(),
    amount || 0,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM template_bills WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM template_bills WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
