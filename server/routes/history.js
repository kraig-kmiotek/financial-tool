const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Returns the 200 most recent payment events, newest first
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT id, bill_id, bill_name, amount, action, month_key, occurred_at
       FROM payment_history
       ORDER BY id DESC
       LIMIT 200`
    )
    .all();
  res.json(rows);
});

module.exports = router;
