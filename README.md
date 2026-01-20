# Bokföringsprogram (MVP)

Minimal but legally compliant bookkeeping MVP for Swedish small businesses. The focus is on vouchers, traceability, period locks, and basic reports/exports.

## Features
- Vouchers with immutable posting and correction vouchers (reversing rows).
- Append-only workflow (no edits after posting).
- Period locks that prevent new vouchers in locked ranges.
- Reports: voucher list (general journal) and general ledger.
- Exports: CSV (vouchers + voucher rows) and SIE4 stub.
- Attachment references (file path or URL metadata).
- Seeded demo company + minimal BAS accounts.

## Tech stack
- Tauri v2 + Vite + React + TypeScript
- Local SQLite database (single file in app data directory)
- Rust backend for database access and exports

## Setup
1. Install dependencies
   ```bash
   pnpm install
   ```
2. Run the app in development mode
   ```bash
   pnpm tauri dev
   ```

## Notes & limitations
- This project is **not tax advice**.
- The user is responsible for storing receipts and keeping backups.
- SIE4 export is a stub structure with TODOs for full spec coverage.
- Fiscal year defaults to the current calendar year for new companies.
- If you see `ERR_PNPM_FETCH_403` during install, ensure the project `.npmrc` is used and retry. It pins the registry to `https://registry.npmjs.org/`.

## Data model highlights
- All monetary values are stored as integer cents.
- All writes are executed inside SQL transactions.
- Audit log entries are created for seeded data and voucher creation.
