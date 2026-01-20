use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use tauri::AppHandle;
use thiserror::Error;

const DEFAULT_USER: &str = "local";

const MIGRATIONS: &str = r#"
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  org_number TEXT,
  fiscal_year_start TEXT NOT NULL,
  fiscal_year_end TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  number INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  vat_code TEXT,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS voucher_series (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  next_number INTEGER NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  series_id TEXT NOT NULL,
  voucher_number INTEGER NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  counterparty TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  posted_at TEXT,
  corrected_voucher_id TEXT,
  FOREIGN KEY(company_id) REFERENCES companies(id),
  FOREIGN KEY(series_id) REFERENCES voucher_series(id)
);

CREATE TABLE IF NOT EXISTS voucher_rows (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  description TEXT,
  debit_cents INTEGER NOT NULL,
  credit_cents INTEGER NOT NULL,
  vat_code TEXT,
  FOREIGN KEY(voucher_id) REFERENCES vouchers(id)
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  voucher_id TEXT NOT NULL,
  ref_type TEXT NOT NULL,
  ref_value TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(voucher_id) REFERENCES vouchers(id)
);

CREATE TABLE IF NOT EXISTS period_locks (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  locked_at TEXT NOT NULL,
  locked_by TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  FOREIGN KEY(company_id) REFERENCES companies(id)
);
"#;

#[derive(Debug, Error)]
pub enum DbError {
    #[error("Database error: {0}")]
    Sqlite(#[from] rusqlite::Error),
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid operation: {0}")]
    Invalid(String),
}

pub struct DbState {
    pub connection: Mutex<Connection>,
}

pub fn init_db(app: &AppHandle) -> Result<DbState, DbError> {
    let db_path = database_path(app)?;
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent)?;
    }
    let conn = Connection::open(db_path)?;
    conn.execute_batch(MIGRATIONS)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    seed_if_needed(&conn)?;
    Ok(DbState {
        connection: Mutex::new(conn),
    })
}

fn database_path(app: &AppHandle) -> Result<PathBuf, DbError> {
    let base_dir = app.path().app_data_dir()?;
    Ok(base_dir.join("bokforing.sqlite"))
}

fn seed_if_needed(conn: &Connection) -> Result<(), DbError> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM companies", [], |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }

    let now = Utc::now().to_rfc3339();
    let company_id = uuid::Uuid::new_v4().to_string();
    let tx = conn.transaction()?;
    tx.execute(
        "INSERT INTO companies (id, name, org_number, fiscal_year_start, fiscal_year_end, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            company_id,
            "Demo AB",
            Option::<String>::None,
            "2024-01-01",
            "2024-12-31",
            now
        ],
    )?;

    tx.execute(
        "INSERT INTO voucher_series (id, company_id, code, description, next_number)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            uuid::Uuid::new_v4().to_string(),
            company_id,
            "A",
            "Main series",
            1
        ],
    )?;

    let accounts = vec![
        ("1930", "Bankkonto", "Asset"),
        ("3010", "Försäljning", "Income"),
        ("4010", "Varuinköp", "Expense"),
        ("2641", "Ingående moms", "Asset"),
        ("2611", "Utgående moms", "Liability"),
    ];

    for (number, name, account_type) in accounts {
        tx.execute(
            "INSERT INTO accounts (id, company_id, number, name, type, vat_code, is_active, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                uuid::Uuid::new_v4().to_string(),
                company_id,
                number.parse::<i64>().unwrap_or_default(),
                name,
                account_type,
                Option::<String>::None,
                1,
                now
            ],
        )?;
    }

    tx.execute(
        "INSERT INTO audit_log (id, company_id, entity_type, entity_id, action, payload_json, created_at, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            uuid::Uuid::new_v4().to_string(),
            company_id,
            "company",
            company_id,
            "seed",
            "{}",
            now,
            DEFAULT_USER
        ],
    )?;

    tx.commit()?;
    Ok(())
}

pub fn is_period_locked(conn: &Connection, company_id: &str, date: &str) -> Result<bool, DbError> {
    let locked: Option<i64> = conn
        .query_row(
            "SELECT 1 FROM period_locks WHERE company_id = ?1 AND ?2 BETWEEN period_start AND period_end LIMIT 1",
            params![company_id, date],
            |row| row.get(0),
        )
        .optional()?;
    Ok(locked.is_some())
}
