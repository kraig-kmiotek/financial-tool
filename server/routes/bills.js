const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  const bills = db.prepare('SELECT * FROM current_bills ORDER BY rowid').all();
  res.json(bills);
});

router.patch('/:id', (req, res) => {
  const bill = db.prepare('SELECT * FROM current_bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Not found' });
  const name    = req.body.name    !== undefined ? req.body.name.trim()                        : bill.name;
  const due_day = req.body.due_day !== undefined ? (req.body.due_day || null)                  : bill.due_day;
  const autopay = req.body.autopay !== undefined ? (req.body.autopay ? 1 : 0)                  : bill.autopay;
  const amount  = req.body.amount  !== undefined ? (parseFloat(req.body.amount) || 0)          : bill.amount;
  const skipped = req.body.skipped !== undefined ? (req.body.skipped ? 1 : 0)                  : bill.skipped;
  db.prepare('UPDATE current_bills SET name = ?, due_day = ?, autopay = ?, amount = ?, skipped = ? WHERE id = ?')
    .run(name, due_day, autopay, amount, skipped, bill.id);
  res.json(db.prepare('SELECT * FROM current_bills WHERE id = ?').get(bill.id));
});

router.patch('/:id/toggle', (req, res) => {
  const bill = db.prepare('SELECT * FROM current_bills WHERE id = ?').get(req.params.id);
  if (!bill) return res.status(404).json({ error: 'Not found' });
  const newPaid = bill.paid ? 0 : 1;
  const action = newPaid ? 'paid' : 'unpaid';
  // YYYY-MM of the current server date
  const monthKey = new Date().toISOString().slice(0, 7);
  db.transaction(() => {
    db.prepare('UPDATE current_bills SET paid = ? WHERE id = ?').run(newPaid, bill.id);
    db.prepare(
      'INSERT INTO payment_history (bill_id, bill_name, amount, action, month_key) VALUES (?, ?, ?, ?, ?)'
    ).run(bill.id, bill.name, bill.amount, action, monthKey);
  })();
  res.json({ ...bill, paid: newPaid });
});

// Add a one-off bill to the current month
router.post('/', (req, res) => {
  const { name, amount } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
  const result = db
    .prepare('INSERT INTO current_bills (name, amount, paid, autopay, skipped) VALUES (?, ?, 0, 0, 0)')
    .run(name.trim(), parseFloat(amount) || 0);
  res.json(db.prepare('SELECT * FROM current_bills WHERE id = ?').get(result.lastInsertRowid));
});

// Delete a current bill mid-month
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM current_bills WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
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
      'INSERT INTO current_bills (name, amount, paid, autopay, due_day, template_bill_id) VALUES (?, ?, 0, ?, ?, ?)'
    );
    templates.forEach((t) => insert.run(t.name, t.amount, t.autopay, t.due_day, t.id));
  })();

  const bills = db.prepare('SELECT * FROM current_bills ORDER BY rowid').all();
  res.json(bills);
});

module.exports = router;
