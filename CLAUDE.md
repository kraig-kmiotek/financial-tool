# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack bill tracker web app replacing an Excel workflow. Single-service deployment to Railway: Express serves the React build as static files and also exposes a REST API under `/api`.

## Commands

```bash
# Install all dependencies
npm install && cd client && npm install && cd ..

# Development (Express on :3001 + Vite on :5173 with API proxy)
npm run dev

# Build for production (outputs to client/dist)
npm run build

# Start production server (serves client/dist + API on one port)
npm start
```

## Architecture

```
financial-tool/
├── server/
│   ├── index.js            # Express entry: session, routes, serves client/dist in prod
│   ├── db.js               # SQLite init (better-sqlite3), schema creation, seed data
│   ├── middleware/
│   │   └── requireAuth.js  # 401 if session.authenticated is falsy
│   └── routes/
│       ├── auth.js         # POST /api/auth, GET /api/auth/check, POST /api/auth/logout
│       ├── bills.js        # GET, PATCH /:id/toggle, POST /reset
│       ├── template.js     # GET, POST, PUT /reorder, PUT /:id, DELETE /:id
│       ├── summary.js      # GET and PUT single-row summary
│       └── deposits.js     # GET, POST, DELETE /:id
├── client/                 # Vite + React
│   ├── vite.config.js      # Proxies /api → :3001 in dev
│   └── src/
│       ├── App.jsx         # BrowserRouter, auth check on mount, route guard
│       ├── api.js          # Axios instance (baseURL=/api, withCredentials=true)
│       ├── index.css       # All styles (mobile-first, CSS custom properties)
│       ├── pages/
│       │   ├── Login.jsx   # Password gate
│       │   ├── Tracker.jsx # Main daily view: loads bills/summary/deposits in parallel
│       │   └── Settings.jsx # Template CRUD + @dnd-kit drag-and-drop reorder
│       └── components/
│           ├── BillList.jsx      # Renders list + unpaid footer total
│           ├── BillItem.jsx      # Single bill row, click-to-toggle
│           ├── SummaryPanel.jsx  # Inputs with 600ms debounced auto-save; calculated fields
│           └── DepositsPanel.jsx # Add/delete one-off items
└── data/bills.db           # SQLite file (gitignored; created on first run)
```

## Key Design Decisions

**Single service**: In production, Express serves `client/dist` at `/`. No separate frontend host or reverse proxy needed.

**Auth**: Passkey (WebAuthn / Face ID / Touch ID) via `@simplewebauthn/server` + `@simplewebauthn/browser`. `APP_PASSWORD` is still required to *register* new passkeys (acts as an admin gate), but day-to-day login uses a passkey only. Session cookie expires when the browser closes. All `/api` routes except `/api/auth` are protected by `requireAuth` middleware.

**SQLite schema**:
- `template_bills` — canonical bill list (name, amount, autopay, due_day, sort_order)
- `current_bills` — active month's bills (name, amount, paid, autopay, due_day, skipped, FK to template)
- `summary` — single row (id=1) for all financial inputs
- `deposits` — one-off items (label, amount; can be negative)
- `passkeys` — registered WebAuthn credentials (credential_id, public_key, counter, device_name)

**Net Remaining formula**:
```
income_remaining = paychecks_remaining × paycheck_amount
net_remaining    = (bank_balance + income_remaining - unpaid_bill_total + deposit_total) - move_to_savings
total_savings    = savings_balance + move_to_savings
```

**Monthly reset** (`POST /api/bills/reset`): copies `template_bills` → `current_bills` (all unpaid), clears `deposits`, leaves `summary` fields intact. Manual only — no auto-detection.

**Bill amounts**: Only editable in the template settings screen, not on the main tracker.

**Summary auto-save**: `SummaryPanel` debounces 600ms after the last field change, then PUTs to `/api/summary`. No save button.

**Template reorder**: Uses `@dnd-kit/sortable`. On drag end, client reorders state optimistically then calls `PUT /api/template/reorder` with an array of IDs. `TouchSensor` has a 150ms delay to distinguish scroll from drag on mobile.

## Environment Variables

| Variable | Description |
|---|---|
| `APP_PASSWORD` | Required. Used to gate passkey registration (not used for login). |
| `SESSION_SECRET` | Required. Secret for `express-session` cookie signing. |
| `RP_ID` | Required in production. WebAuthn Relying Party ID — just the domain, e.g. `myapp.up.railway.app`. Defaults to `localhost` in dev. |
| `RP_ORIGIN` | Required in production. Full origin URL(s), comma-separated if multiple, e.g. `https://myapp.up.railway.app`. Defaults to `http://localhost:5173,http://localhost:3001` in dev. |
| `DATABASE_PATH` | Optional. Defaults to `./data/bills.db`. |
| `PORT` | Optional. Defaults to `3001`. Railway sets this automatically. |
| `NODE_ENV` | Set to `production` on Railway to enable static file serving. |

## Railway Deployment

1. Push this repo to GitHub.
2. Create a new Railway project → "Deploy from GitHub repo".
3. Set env vars: `APP_PASSWORD`, `SESSION_SECRET`, `NODE_ENV=production`.
4. Set the start command to: `npm run build && npm start`
5. Add a Railway Volume mounted at `/app/data` and set `DATABASE_PATH=/app/data/bills.db` so the SQLite file persists across deploys.
