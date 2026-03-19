const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  const { password } = req.body;
  if (!process.env.APP_PASSWORD) {
    return res.status(500).json({ error: 'APP_PASSWORD not configured' });
  }
  if (password === process.env.APP_PASSWORD) {
    req.session.authenticated = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid password' });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/check', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.authenticated) });
});

module.exports = router;
