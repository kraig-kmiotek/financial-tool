# TODO

## Desktop / Responsive Layout
- [ ] App feels too condensed on desktop — design a proper desktop layout that doesn't feel like a mobile app (wider content area, multi-column layout, better use of whitespace)
- [ ] Login button is in the wrong place — move to a more natural position

## Deployment Checklist
- [ ] Set `RP_ID` and `RP_ORIGIN` env vars on Railway for WebAuthn to work in production
- [ ] Confirm Railway Volume is mounted at `/app/data` with `DATABASE_PATH=/app/data/bills.db` so the database persists across deploys

## Polish / Bug Fixes
- [x] Add empty state message to deposits panel when no deposits exist
- [x] Improve silent error handling in catch blocks (e.g. deposits) — show user-facing feedback
- [x] Add React error boundary so a JS crash doesn't show a white screen

## Future Features
- [ ] Bill payment history / audit trail
- [ ] CSV / JSON export
- [ ] Recurring deposits (not just one-off)
