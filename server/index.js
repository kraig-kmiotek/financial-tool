require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

initDb();

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      // No maxAge = session cookie (expires when browser closes)
    },
  })
);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth/passkey', require('./routes/passkeys'));

const requireAuth = require('./middleware/requireAuth');
app.use('/api/bills', requireAuth, require('./routes/bills'));
app.use('/api/template', requireAuth, require('./routes/template'));
app.use('/api/summary', requireAuth, require('./routes/summary'));
app.use('/api/deposits', requireAuth, require('./routes/deposits'));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
