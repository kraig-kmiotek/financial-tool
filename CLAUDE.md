# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack bill tracker web app replacing an Excel workflow. Single-service deployment to Railway: Express serves the React build as static files and also exposes a REST API.

## Commands

```bash
# Install all dependencies (root installs server deps; client installs frontend deps)
npm install
cd client && npm install

# Development (run both concurrently from root)
npm run dev          # starts Express on :3001 + Vite dev server on :5173

# Build for production
npm run build        # builds React into client/dist, which Express then serves

# Start production server
npm start            # Express serves client/dist at root and API at /api

# Run backend tests
npm test

# Run frontend tests
cd client && npm test
```

## Architecture

```
financial-tool/
├── server/
│   ├── index.js          # Express entry point, serves static + mounts routes
│   ├── db.js             # SQLite setup (better-sqlite3), schema init, seed
│   ├── routes/
│   │   ├── auth.js       # POST /api/auth — password check, session issue
│   │   ├── bills.js      # CRUD for current-month bill state
│   │   ├── template.js   # CRUD for bill template (source of truth for monthly reset)
│   │   ├── summary.js    # GET/PUT for financial summary fields
│   │   └── deposits.js   # CRUD for non-recurring one-off items
│   └── middleware/
│       └── requireAuth.js # Session check; 401 if missing
├── client/               # Vite + React app
│   ├── src/
│   │   ├── App.jsx       # Route setup, auth gate
│   │   ├── pages/
│   │   │   ├── Tracker.jsx    # Main daily-use view
│   │   │   └── Settings.jsx   # Template management
│   │   ├── components/
│   │   │   ├── BillList.jsx
│   │   │   ├── SummaryPanel.jsx
│   │   │   └── DepositsPanel.jsx
│   │   └── api.js        # Axios instance with base URL + credentials
│   └── dist/             # Built output (gitignored); Express serves this
├── data/
│   └── bills.db          # SQLite file (gitignored)
└── package.json          # Root: scripts for dev, build, start; depends on server deps
```

## Key Design Decisions

**Single service**: In production, Express serves `client/dist` at `/` and all API routes under `/api`. No separate frontend service or reverse proxy needed on Railway.

**Auth**: Single password stored in `APP_PASSWORD` env var. Successful auth sets a `connect-session` cookie (httpOnly, 7-day expiry). `requireAuth` middleware protects all `/api` routes except `/api/auth`.

**Database schema** (SQLite via `better-sqlite3`):
- `template_bills` — canonical bill list (name, amount, sort_order); source for monthly reset
- `current_bills` — active month's bills (name, amount, paid bool, template_bill_id FK)
- `summary` — single-row table for bank_balance, paychecks_remaining, paycheck_amount, move_to_savings, savings_balance
- `deposits` — non-recurring one-off items (label, amount, can be negative)

**Net Remaining formula**:
```
income_remaining    = paychecks_remaining × paycheck_amount
unpaid_total        = sum of current_bills where paid = false
deposit_total       = sum of deposits.amount (positive or negative)
net_remaining       = (bank_balance + income_remaining - unpaid_total + deposit_total) - move_to_savings
```

**Monthly reset**: Copies `template_bills` into `current_bills` (all unpaid), clears `deposits`, leaves `summary` fields intact. Triggered manually via `POST /api/bills/reset`.

## Environment Variables

| Variable | Description |
|---|---|
| `APP_PASSWORD` | Required. Plain-text password for the app gate. |
| `SESSION_SECRET` | Required. Secret for `express-session` cookie signing. |
| `PORT` | Optional. Defaults to `3001`. Railway sets this automatically. |
| `NODE_ENV` | Set to `production` on Railway. |

## Railway Deployment

- One service, one `npm run build && npm start` command.
- Attach a Railway Volume mounted at `/app/data` so `bills.db` persists across deploys.
- Set `DATABASE_PATH=/app/data/bills.db` or default to `./data/bills.db` locally.
