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
  const { name, amount, autopay, due_day } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const max = db.prepare('SELECT MAX(sort_order) as m FROM template_bills').get();
  const result = db
    .prepare('INSERT INTO template_bills (name, amount, autopay, due_day, sort_order) VALUES (?, ?, ?, ?, ?)')
    .run(name.trim(), amount || 0, autopay ? 1 : 0, due_day || null, (max.m ?? -1) + 1);
  res.json(db.prepare('SELECT * FROM template_bills WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, amount, autopay, due_day } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  db.prepare('UPDATE template_bills SET name = ?, amount = ?, autopay = ?, due_day = ? WHERE id = ?').run(
    name.trim(),
    amount || 0,
    autopay ? 1 : 0,
    due_day || null,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM template_bills WHERE id = ?').get(req.params.id));
});

// Quick autopay toggle without opening full edit
router.patch('/:id/autopay', (req, res) => {
  const bill = db.prepare('SELECT * FROM template_bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE template_bills SET autopay = ? WHERE id = ?').run(bill.autopay ? 0 : 1, bill.id);
  res.json(db.prepare('SELECT * FROM template_bills WHERE id = ?').get(bill.id));
});

router.delete('/:id', (req, res) => {
  try {
    db.transaction(() => {
      // Null out FK references in current_bills before deleting the template row
      db.prepare('UPDATE current_bills SET template_bill_id = NULL WHERE template_bill_id = ?').run(req.params.id);
      db.prepare('DELETE FROM template_bills WHERE id = ?').run(req.params.id);
    })();
    res.json({ ok: true });
  } catch (err) {
    console.error('Template delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
