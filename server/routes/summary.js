const express = require('express');
const router = express.Router();
const { db } = require('../db');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM summary WHERE id = 1').get());
});

router.put('/', (req, res) => {
  const { bank_balance, paychecks_remaining, paycheck_amount, move_to_savings, savings_balance } =
    req.body;
  db.prepare(
    `UPDATE summary
     SET bank_balance = ?, paychecks_remaining = ?, paycheck_amount = ?,
         move_to_savings = ?, savings_balance = ?
     WHERE id = 1`
  ).run(
    bank_balance ?? 0,
    paychecks_remaining ?? 0,
    paycheck_amount ?? 0,
    move_to_savings ?? 0,
    savings_balance ?? 0
  );
  res.json(db.prepare('SELECT * FROM summary WHERE id = 1').get());
});

module.exports = router;
