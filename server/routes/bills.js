const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  const bills = db.prepare('SELECT * FROM current_bills ORDER BY rowid').all();
  res.json(bills);
});

router.patch('/:id/toggle', (req, res) => {
  const bill = db.prepare('SELECT * FROM current_bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Not found' });
  const newPaid = bill.paid ? 0 : 1;
  db.prepare('UPDATE current_bills SET paid = ? WHERE id = ?').run(newPaid, bill.id);
  res.json({ ...bill, paid: newPaid });
});

// Reset: copy template into current_bills and clear deposits
router.post('/reset', (req, res) => {
  const templates = db
    .prepare('SELECT * FROM template_bills ORDER BY sort_order')
    .all();

  db.transaction(() => {
    db.prepare('DELETE FROM current_bills').run();
    db.prepare('DELETE FROM deposits').run();
    const insert = db.prepare(
      'INSERT INTO current_bills (name, amount, paid, template_bill_id) VALUES (?, ?, 0, ?)'
    );
    templates.forEach((t) => insert.run(t.name, t.amount, t.id));
  })();

  const bills = db.prepare('SELECT * FROM current_bills ORDER BY rowid').all();
  res.json(bills);
});

module.exports = router;
