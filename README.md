# Bill Tracker v1.0

A personal bill tracking web app built to replace a monthly Excel workflow. Track bills, log payments, manage one-off deposits, and monitor your financial position — all in one place.

## Try the Prototype

Want to see it before deploying? Check out the **[live prototype](https://kraig-kmiotek.github.io/financial-tool/prototype.html)** — a fully interactive, zero-dependency mock of the app. No server or install required, runs entirely in the browser.

## Features

- **Bill tracking** — Mark bills paid/unpaid with a single click. Bills sort by due date automatically, and paid bills move to the bottom.
- **Financial summary** — Track bank balance, paychecks remaining, move-to-savings, and see net remaining calculated in real time.
- **One-off items** — Add deposits or extra expenses that apply only to the current month.
- **Insights panel** — Visual charts showing bills progress (donut), budget breakdown (bar), and top bills by amount.
- **Template management** — Maintain a canonical bill list that seeds each new month on reset. Drag to reorder, inline edit, autopay toggle.
- **Payment history** — Every paid/unpaid toggle is recorded with a timestamp and grouped by month.
- **CSV export** — Export the current month's bills, summary, and deposits to a spreadsheet.
- **Monthly reset** — One click copies the template into the current month, clears one-off items, and preserves your financial summary fields.
- **Passkey authentication** — Log in with Face ID or Touch ID (WebAuthn). No passwords to type day-to-day.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | WebAuthn via @simplewebauthn |
| Hosting | Railway |
| Drag & drop | @dnd-kit/sortable |

## Deployment (Railway)

1. Fork or clone this repo and push to GitHub.
2. Create a new Railway project → **Deploy from GitHub repo**.
3. Set the following environment variables:

| Variable | Description |
|---|---|
| `APP_PASSWORD` | Gates new passkey registration (acts as an admin password). |
| `SESSION_SECRET` | Secret used to sign session cookies. |
| `RP_ID` | WebAuthn Relying Party ID — just the domain, e.g. `myapp.up.railway.app`. |
| `RP_ORIGIN` | Full origin URL, e.g. `https://myapp.up.railway.app`. |
| `NODE_ENV` | Set to `production`. |
| `DATABASE_PATH` | Optional. Set to `/app/data/bills.db` if using a volume. |

4. Set the start command to: `npm run build && npm start`
5. Add a Railway Volume mounted at `/app/data` so the SQLite database persists across deploys.

## Local Development

```bash
# Install dependencies
npm install && cd client && npm install && cd ..

# Start dev servers (Express on :3001, Vite on :5173)
npm run dev
```

The Vite dev server proxies `/api` requests to Express, so the frontend and backend work together seamlessly without any extra configuration.

## First-Time Setup

1. Open the app and navigate to **Template → Security — Passkeys**.
2. Enter a device name and your `APP_PASSWORD` to register your first passkey.
3. From that point on, log in with Face ID / Touch ID — no password needed.

To give a friend their own instance, they deploy their own copy on Railway with their own environment variables and get a completely separate database and URL.

## Architecture

```
financial-tool/
├── server/
│   ├── index.js            # Express entry point
│   ├── db.js               # SQLite schema and initialization
│   ├── middleware/
│   │   └── requireAuth.js  # Session auth guard
│   └── routes/
│       ├── auth.js         # Passkey registration + login
│       ├── bills.js        # Current month bills
│       ├── template.js     # Template bill CRUD + reorder
│       ├── summary.js      # Financial summary (single row)
│       ├── deposits.js     # One-off items
│       └── history.js      # Payment history log
├── client/
│   └── src/
│       ├── pages/
│       │   ├── Tracker.jsx   # Main daily view
│       │   ├── Settings.jsx  # Template management
│       │   └── History.jsx   # Payment history
│       └── components/
│           ├── AppHeader.jsx     # Shared header (nav, export, reset)
│           ├── BillList.jsx      # Bill list + add form
│           ├── BillItem.jsx      # Single bill row
│           ├── SummaryPanel.jsx  # Financial inputs (auto-saved)
│           ├── DepositsPanel.jsx # One-off items
│           └── ChartsPanel.jsx   # Insights charts
├── prototype.html          # Single-file vanilla JS prototype
└── data/bills.db           # SQLite database (gitignored)
```

## Net Remaining Formula

```
income_remaining = paychecks_remaining × paycheck_amount
net_remaining    = bank_balance + income_remaining + deposit_total − unpaid_bill_total − move_to_savings
total_savings    = savings_balance + move_to_savings
```
