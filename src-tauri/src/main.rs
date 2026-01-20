use chrono::Utc;
use rusqlite::{params, Connection};
use serde_json::json;
use tauri::State;

mod db;
mod models;

use db::{is_period_locked, DbError, DbState};
use models::{
    Account, Attachment, Company, CompanyIdInput, CreateCompanyInput, CreateCorrectionInput,
    CreateVoucherInput, ExportInput, LedgerRow, ListVouchersInput, LockPeriodInput, PeriodLock,
    ReportLedgerInput, ReportVoucherListInput, UpsertAccountInput, Voucher, VoucherIdInput,
    VoucherListItem, VoucherRow, VoucherSeries,
};

const DEFAULT_USER: &str = "local";

fn map_error(error: DbError) -> String {
    error.to_string()
}

fn map_sql_error(error: rusqlite::Error) -> String {
    error.to_string()
}

#[tauri::command]
fn list_companies(state: State<DbState>) -> Result<Vec<Company>, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, name, org_number, fiscal_year_start, fiscal_year_end, created_at FROM companies",
        )
        .map_err(map_sql_error)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Company {
                id: row.get(0)?,
                name: row.get(1)?,
                org_number: row.get(2)?,
                fiscal_year_start: row.get(3)?,
                fiscal_year_end: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(map_sql_error)?;
    let mut companies = Vec::new();
    for row in rows {
        companies.push(row.map_err(map_sql_error)?);
    }
    Ok(companies)
}

#[tauri::command]
fn create_company(state: State<DbState>, payload: CreateCompanyInput) -> Result<Company, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let now = Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    let name = payload.name.clone();
    let org_number = payload.org_number.clone();
    let tx = conn.transaction().map_err(map_sql_error)?;
    tx.execute(
        "INSERT INTO companies (id, name, org_number, fiscal_year_start, fiscal_year_end, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            id,
            &name,
            &org_number,
            "2024-01-01",
            "2024-12-31",
            now
        ],
    )
    .map_err(map_sql_error)?;

    tx.execute(
        "INSERT INTO voucher_series (id, company_id, code, description, next_number)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![uuid::Uuid::new_v4().to_string(), id, "A", "Main series", 1],
    )
    .map_err(map_sql_error)?;
    tx.commit().map_err(map_sql_error)?;

    Ok(Company {
        id,
        name,
        org_number,
        fiscal_year_start: "2024-01-01".to_string(),
        fiscal_year_end: "2024-12-31".to_string(),
        created_at: now,
    })
}

#[tauri::command]
fn list_accounts(state: State<DbState>, payload: CompanyIdInput) -> Result<Vec<Account>, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, number, name, type, vat_code, is_active, created_at
             FROM accounts WHERE company_id = ?1 ORDER BY number",
        )
        .map_err(map_sql_error)?;
    let rows = stmt
        .query_map([payload.company_id], |row| {
            Ok(Account {
                id: row.get(0)?,
                company_id: row.get(1)?,
                number: row.get(2)?,
                name: row.get(3)?,
                account_type: row.get(4)?,
                vat_code: row.get(5)?,
                is_active: row.get::<_, i64>(6)? == 1,
                created_at: row.get(7)?,
            })
        })
        .map_err(map_sql_error)?;
    let mut accounts = Vec::new();
    for row in rows {
        accounts.push(row.map_err(map_sql_error)?);
    }
    Ok(accounts)
}

#[tauri::command]
fn upsert_account(
    state: State<DbState>,
    payload: UpsertAccountInput,
) -> Result<Account, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let now = Utc::now().to_rfc3339();
    let account_id = payload
        .id
        .clone()
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let tx = conn.transaction().map_err(map_sql_error)?;
    tx.execute(
        "INSERT INTO accounts (id, company_id, number, name, type, vat_code, is_active, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
           number = excluded.number,
           name = excluded.name,
           type = excluded.type,
           vat_code = excluded.vat_code,
           is_active = excluded.is_active",
        params![
            account_id,
            &payload.company_id,
            payload.number,
            &payload.name,
            &payload.account_type,
            &payload.vat_code,
            if payload.is_active { 1 } else { 0 },
            now
        ],
    )
    .map_err(map_sql_error)?;
    tx.commit().map_err(map_sql_error)?;

    Ok(Account {
        id: account_id,
        company_id: payload.company_id,
        number: payload.number,
        name: payload.name,
        account_type: payload.account_type,
        vat_code: payload.vat_code,
        is_active: payload.is_active,
        created_at: now,
    })
}

#[tauri::command]
fn list_voucher_series(state: State<DbState>, payload: CompanyIdInput) -> Result<Vec<VoucherSeries>, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, code, description, next_number FROM voucher_series WHERE company_id = ?1",
        )
        .map_err(map_sql_error)?;
    let rows = stmt
        .query_map([payload.company_id], |row| {
            Ok(VoucherSeries {
                id: row.get(0)?,
                company_id: row.get(1)?,
                code: row.get(2)?,
                description: row.get(3)?,
                next_number: row.get(4)?,
            })
        })
        .map_err(map_sql_error)?;
    let mut series = Vec::new();
    for row in rows {
        series.push(row.map_err(map_sql_error)?);
    }
    Ok(series)
}

#[tauri::command]
fn list_vouchers(
    state: State<DbState>,
    payload: ListVouchersInput,
) -> Result<Vec<Voucher>, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    fetch_vouchers_with_rows(
        &conn,
        &payload.company_id,
        payload.from_date.as_deref(),
        payload.to_date.as_deref(),
    )
}

#[tauri::command]
fn get_voucher(state: State<DbState>, payload: VoucherIdInput) -> Result<Voucher, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let voucher = conn
        .query_row(
            "SELECT id, company_id, series_id, voucher_number, date, description, counterparty, created_at, created_by, posted_at
             FROM vouchers WHERE id = ?1",
            [payload.voucher_id],
            |row| {
                Ok(Voucher {
                    id: row.get(0)?,
                    company_id: row.get(1)?,
                    series_id: row.get(2)?,
                    voucher_number: row.get(3)?,
                    date: row.get(4)?,
                    description: row.get(5)?,
                    counterparty: row.get(6)?,
                    created_at: row.get(7)?,
                    created_by: row.get(8)?,
                    posted_at: row.get(9)?,
                    rows: None,
                    attachments: None,
                })
            },
        )
        .map_err(map_sql_error)?;

    let mut voucher = voucher;
    voucher.rows = Some(fetch_voucher_rows(&conn, &voucher.id)?);
    voucher.attachments = Some(fetch_attachments(&conn, &voucher.id)?);
    Ok(voucher)
}

#[tauri::command]
fn create_voucher(state: State<DbState>, payload: CreateVoucherInput) -> Result<Voucher, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    if payload.rows.is_empty() {
        return Err("Voucher must have rows".to_string());
    }
    let debit_total: i64 = payload.rows.iter().map(|row| row.debit_cents).sum();
    let credit_total: i64 = payload.rows.iter().map(|row| row.credit_cents).sum();
    if debit_total != credit_total {
        return Err("Voucher does not balance".to_string());
    }
    if is_period_locked(&conn, &payload.company_id, &payload.date).map_err(map_error)? {
        return Err("Period is locked".to_string());
    }

    let tx = conn.transaction().map_err(map_sql_error)?;
    let (series_company_id, next_number): (String, i64) = tx
        .query_row(
            "SELECT company_id, next_number FROM voucher_series WHERE id = ?1",
            [payload.series_id.clone()],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(map_sql_error)?;

    if series_company_id != payload.company_id {
        return Err("Series does not belong to company".to_string());
    }

    tx.execute(
        "UPDATE voucher_series SET next_number = next_number + 1 WHERE id = ?1",
        [payload.series_id.clone()],
    )
    .map_err(map_sql_error)?;

    let voucher_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let company_id = payload.company_id.clone();
    let series_id = payload.series_id.clone();
    let description = payload.description.clone();
    let counterparty = payload.counterparty.clone();
    let date = payload.date.clone();
    tx.execute(
        "INSERT INTO vouchers (id, company_id, series_id, voucher_number, date, description, counterparty, created_at, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            voucher_id,
            &company_id,
            &series_id,
            next_number,
            &date,
            &description,
            &counterparty,
            now,
            DEFAULT_USER
        ],
    )
    .map_err(map_sql_error)?;

    for row in &payload.rows {
        tx.execute(
            "INSERT INTO voucher_rows (id, voucher_id, account_id, description, debit_cents, credit_cents, vat_code)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                uuid::Uuid::new_v4().to_string(),
                voucher_id,
                row.account_id,
                row.description,
                row.debit_cents,
                row.credit_cents,
                row.vat_code
            ],
        )
        .map_err(map_sql_error)?;
    }

    if let Some(attachments) = &payload.attachments {
        for attachment in attachments {
            if attachment.ref_value.trim().is_empty() {
                continue;
            }
            tx.execute(
                "INSERT INTO attachments (id, voucher_id, ref_type, ref_value, note, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    uuid::Uuid::new_v4().to_string(),
                    voucher_id,
                    attachment.ref_type,
                    attachment.ref_value,
                    attachment.note,
                    now
                ],
            )
            .map_err(map_sql_error)?;
        }
    }

    tx.execute(
        "INSERT INTO audit_log (id, company_id, entity_type, entity_id, action, payload_json, created_at, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            uuid::Uuid::new_v4().to_string(),
            &company_id,
            "voucher",
            voucher_id,
            "create",
            json!({ "voucher_number": next_number }).to_string(),
            now,
            DEFAULT_USER
        ],
    )
    .map_err(map_sql_error)?;

    tx.commit().map_err(map_sql_error)?;

    Ok(Voucher {
        id: voucher_id,
        company_id,
        series_id,
        voucher_number: next_number,
        date,
        description,
        counterparty,
        created_at: now,
        created_by: DEFAULT_USER.to_string(),
        posted_at: None,
        rows: Some(fetch_voucher_rows(&conn, &voucher_id)?),
        attachments: Some(vec![]),
    })
}

#[tauri::command]
fn post_voucher(state: State<DbState>, payload: VoucherIdInput) -> Result<Voucher, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let tx = conn.transaction().map_err(map_sql_error)?;
    let (company_id, date, posted_at): (String, String, Option<String>) = tx
        .query_row(
            "SELECT company_id, date, posted_at FROM vouchers WHERE id = ?1",
            [payload.voucher_id.clone()],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map_err(map_sql_error)?;

    if posted_at.is_some() {
        return Err("Voucher is already posted".to_string());
    }

    if is_period_locked(&tx, &company_id, &date).map_err(map_error)? {
        return Err("Period is locked".to_string());
    }

    let now = Utc::now().to_rfc3339();
    tx.execute(
        "UPDATE vouchers SET posted_at = ?1 WHERE id = ?2",
        params![now, payload.voucher_id],
    )
    .map_err(map_sql_error)?;

    tx.commit().map_err(map_sql_error)?;

    get_voucher(state, payload)
}

#[tauri::command]
fn create_correction_voucher(
    state: State<DbState>,
    payload: CreateCorrectionInput,
) -> Result<Voucher, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let original = conn
        .query_row(
            "SELECT id, company_id, series_id, voucher_number FROM vouchers WHERE id = ?1",
            [payload.original_voucher_id.clone()],
            |row| Ok((row.get::<_, String>(0)?, row.get(1)?, row.get(2)?, row.get::<_, i64>(3)?)),
        )
        .map_err(map_sql_error)?;

    if is_period_locked(&conn, &original.1, &payload.date).map_err(map_error)? {
        return Err("Period is locked".to_string());
    }

    let rows = fetch_voucher_rows(&conn, &original.0)?;
    let reversed_rows: Vec<_> = rows
        .into_iter()
        .map(|row| models::CreateVoucherRowInput {
            account_id: row.account_id,
            description: row.description,
            debit_cents: row.credit_cents,
            credit_cents: row.debit_cents,
            vat_code: row.vat_code,
        })
        .collect();

    let payload = CreateVoucherInput {
        company_id: original.1,
        series_id: original.2,
        date: payload.date,
        description: format!("{} (Correction of {})", payload.description, original.3),
        counterparty: None,
        rows: reversed_rows,
    };

    create_voucher(state, payload)
}

#[tauri::command]
fn list_period_locks(state: State<DbState>, payload: CompanyIdInput) -> Result<Vec<PeriodLock>, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, period_start, period_end, locked_at, locked_by
             FROM period_locks WHERE company_id = ?1 ORDER BY period_start DESC",
        )
        .map_err(map_sql_error)?;
    let rows = stmt
        .query_map([payload.company_id], |row| {
            Ok(PeriodLock {
                id: row.get(0)?,
                company_id: row.get(1)?,
                period_start: row.get(2)?,
                period_end: row.get(3)?,
                locked_at: row.get(4)?,
                locked_by: row.get(5)?,
            })
        })
        .map_err(map_sql_error)?;
    let mut locks = Vec::new();
    for row in rows {
        locks.push(row.map_err(map_sql_error)?);
    }
    Ok(locks)
}

#[tauri::command]
fn lock_period(
    state: State<DbState>,
    payload: LockPeriodInput,
) -> Result<PeriodLock, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let tx = conn.transaction().map_err(map_sql_error)?;
    let lock_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let company_id = payload.company_id.clone();
    let period_start = payload.period_start.clone();
    let period_end = payload.period_end.clone();
    tx.execute(
        "INSERT INTO period_locks (id, company_id, period_start, period_end, locked_at, locked_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            lock_id,
            &company_id,
            &period_start,
            &period_end,
            now,
            DEFAULT_USER
        ],
    )
    .map_err(map_sql_error)?;

    tx.commit().map_err(map_sql_error)?;

    Ok(PeriodLock {
        id: lock_id,
        company_id,
        period_start,
        period_end,
        locked_at: now,
        locked_by: DEFAULT_USER.to_string(),
    })
}

#[tauri::command]
fn report_voucher_list(
    state: State<DbState>,
    payload: ReportVoucherListInput,
) -> Result<Vec<VoucherListItem>, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let mut query = String::from(
        "SELECT v.id, v.voucher_number, v.date, v.description, SUM(r.debit_cents)
         FROM vouchers v
         JOIN voucher_rows r ON r.voucher_id = v.id
         WHERE v.company_id = ?1",
    );
    if payload.from_date.is_some() {
        query.push_str(" AND v.date >= ?2");
    }
    if payload.to_date.is_some() {
        query.push_str(if payload.from_date.is_some() { " AND v.date <= ?3" } else { " AND v.date <= ?2" });
    }
    query.push_str(" GROUP BY v.id ORDER BY v.date ASC, v.voucher_number ASC");

    let mut stmt = conn.prepare(&query).map_err(map_sql_error)?;
    let mut params_vec: Vec<&dyn rusqlite::ToSql> = vec![&payload.company_id];
    if let Some(ref value) = payload.from_date {
        params_vec.push(value);
    }
    if let Some(ref value) = payload.to_date {
        params_vec.push(value);
    }

    let rows = stmt
        .query_map(params_vec.as_slice(), |row| {
            Ok(VoucherListItem {
                id: row.get(0)?,
                voucher_number: row.get(1)?,
                date: row.get(2)?,
                description: row.get(3)?,
                total_cents: row.get(4)?,
            })
        })
        .map_err(map_sql_error)?;
    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(map_sql_error)?);
    }
    Ok(list)
}

#[tauri::command]
fn report_ledger_for_account(
    state: State<DbState>,
    payload: ReportLedgerInput,
) -> Result<Vec<LedgerRow>, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let mut query = String::from(
        "SELECT v.date, v.voucher_number, v.description, r.debit_cents, r.credit_cents
         FROM voucher_rows r
         JOIN vouchers v ON v.id = r.voucher_id
         WHERE v.company_id = ?1 AND r.account_id = ?2",
    );
    if payload.from_date.is_some() {
        query.push_str(" AND v.date >= ?3");
    }
    if payload.to_date.is_some() {
        query.push_str(if payload.from_date.is_some() { " AND v.date <= ?4" } else { " AND v.date <= ?3" });
    }
    query.push_str(" ORDER BY v.date ASC, v.voucher_number ASC");

    let mut stmt = conn.prepare(&query).map_err(map_sql_error)?;
    let mut params_vec: Vec<&dyn rusqlite::ToSql> = vec![&payload.company_id, &payload.account_id];
    if let Some(ref value) = payload.from_date {
        params_vec.push(value);
    }
    if let Some(ref value) = payload.to_date {
        params_vec.push(value);
    }

    let rows = stmt
        .query_map(params_vec.as_slice(), |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, i64>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, i64>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })
        .map_err(map_sql_error)?;

    let mut balance = 0;
    let mut ledger = Vec::new();
    for row in rows {
        let (date, voucher_number, description, debit, credit) = row.map_err(map_sql_error)?;
        balance += debit - credit;
        ledger.push(LedgerRow {
            date,
            voucher_number,
            description,
            debit_cents: debit,
            credit_cents: credit,
            balance_cents: balance,
        });
    }
    Ok(ledger)
}

#[tauri::command]
fn export_csv(state: State<DbState>, payload: ExportInput) -> Result<String, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let vouchers = fetch_vouchers_with_rows(&conn, &payload.company_id, None, None)?;
    let base_path = std::path::PathBuf::from(payload.target_path);
    let (voucher_path, row_path) = if base_path.extension().and_then(|ext| ext.to_str()) == Some("csv") {
        let rows_path = base_path
            .with_file_name("voucher_rows.csv");
        (base_path, rows_path)
    } else {
        (base_path.join("vouchers.csv"), base_path.join("voucher_rows.csv"))
    };

    if let Some(parent) = voucher_path.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let mut voucher_lines = vec!["id,voucher_number,date,description,counterparty,posted_at".to_string()];
    let mut row_lines = vec!["voucher_id,account_id,description,debit_cents,credit_cents,vat_code".to_string()];
    for voucher in &vouchers {
        voucher_lines.push(format!(
            "{},{},{},{},{},{}",
            voucher.id,
            voucher.voucher_number,
            voucher.date,
            voucher.description.replace(',', " "),
            voucher.counterparty.clone().unwrap_or_default().replace(',', " "),
            voucher.posted_at.clone().unwrap_or_default()
        ));
        if let Some(rows) = &voucher.rows {
            for row in rows {
                row_lines.push(format!(
                    "{},{},{},{},{},{}",
                    voucher.id,
                    row.account_id,
                    row.description.clone().unwrap_or_default().replace(',', " "),
                    row.debit_cents,
                    row.credit_cents,
                    row.vat_code.clone().unwrap_or_default()
                ));
            }
        }
    }

    std::fs::write(&voucher_path, voucher_lines.join("\n")).map_err(|err| err.to_string())?;
    std::fs::write(&row_path, row_lines.join("\n")).map_err(|err| err.to_string())?;

    Ok(format!(
        "CSV exported to {} and {}",
        voucher_path.display(),
        row_path.display()
    ))
}

#[tauri::command]
fn export_sie_stub(state: State<DbState>, payload: ExportInput) -> Result<String, String> {
    let conn = state.connection.lock().map_err(|_| "Lock error")?;
    let accounts = fetch_accounts(&conn, &payload.company_id)?;
    let vouchers = fetch_vouchers_with_rows(&conn, &payload.company_id, None, None)?;
    let base_path = std::path::PathBuf::from(payload.target_path);
    let sie_path = if base_path.extension().and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("se") || ext.eq_ignore_ascii_case("sie"))
        .unwrap_or(false)
    {
        base_path
    } else {
        base_path.join("export.sie")
    };

    if let Some(parent) = sie_path.parent() {
        std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }

    let account_lookup: std::collections::HashMap<String, i64> = accounts
        .iter()
        .map(|account| (account.id.clone(), account.number))
        .collect();

    let mut lines = vec![
        "#FLAGGA 0".to_string(),
        "#PROGRAM Bokforingsprogram 0.1".to_string(),
        "#FORMAT PC8".to_string(),
        "#SIETYP 4".to_string(),
        "#TODO Implement full SIE4 export".to_string(),
    ];

    for account in &accounts {
        lines.push(format!(
            "#KONTO {} \"{}\"",
            account.number, account.name
        ));
    }

    for voucher in vouchers {
        lines.push(format!(
            "#VER A {} {} \"{}\" {}",
            voucher.voucher_number,
            voucher.date,
            voucher.description,
            voucher.created_at
        ));
        if let Some(rows) = voucher.rows {
            for row in rows {
                let account_number = account_lookup
                    .get(&row.account_id)
                    .copied()
                    .unwrap_or_default();
                lines.push(format!(
                    "#TRANS {} {} {}",
                    account_number, row.debit_cents, row.credit_cents
                ));
            }
        }
    }

    std::fs::write(&sie_path, lines.join("\n")).map_err(|err| err.to_string())?;

    Ok(format!("SIE stub exported to {}", sie_path.display()))
}

fn fetch_voucher_rows(conn: &Connection, voucher_id: &str) -> Result<Vec<VoucherRow>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, voucher_id, account_id, description, debit_cents, credit_cents, vat_code
             FROM voucher_rows WHERE voucher_id = ?1",
        )
        .map_err(map_sql_error)?;
    let rows = stmt
        .query_map([voucher_id], |row| {
            Ok(VoucherRow {
                id: row.get(0)?,
                voucher_id: row.get(1)?,
                account_id: row.get(2)?,
                description: row.get(3)?,
                debit_cents: row.get(4)?,
                credit_cents: row.get(5)?,
                vat_code: row.get(6)?,
            })
        })
        .map_err(map_sql_error)?;
    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(map_sql_error)?);
    }
    Ok(list)
}

fn fetch_attachments(conn: &Connection, voucher_id: &str) -> Result<Vec<Attachment>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, voucher_id, ref_type, ref_value, note, created_at
             FROM attachments WHERE voucher_id = ?1",
        )
        .map_err(map_sql_error)?;
    let rows = stmt
        .query_map([voucher_id], |row| {
            Ok(Attachment {
                id: row.get(0)?,
                voucher_id: row.get(1)?,
                ref_type: row.get(2)?,
                ref_value: row.get(3)?,
                note: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(map_sql_error)?;
    let mut list = Vec::new();
    for row in rows {
        list.push(row.map_err(map_sql_error)?);
    }
    Ok(list)
}

fn fetch_accounts(conn: &Connection, company_id: &str) -> Result<Vec<Account>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, company_id, number, name, type, vat_code, is_active, created_at
             FROM accounts WHERE company_id = ?1 ORDER BY number",
        )
        .map_err(map_sql_error)?;
    let rows = stmt
        .query_map([company_id], |row| {
            Ok(Account {
                id: row.get(0)?,
                company_id: row.get(1)?,
                number: row.get(2)?,
                name: row.get(3)?,
                account_type: row.get(4)?,
                vat_code: row.get(5)?,
                is_active: row.get::<_, i64>(6)? == 1,
                created_at: row.get(7)?,
            })
        })
        .map_err(map_sql_error)?;
    let mut accounts = Vec::new();
    for row in rows {
        accounts.push(row.map_err(map_sql_error)?);
    }
    Ok(accounts)
}

fn fetch_vouchers_with_rows(
    conn: &Connection,
    company_id: &str,
    from_date: Option<&str>,
    to_date: Option<&str>,
) -> Result<Vec<Voucher>, String> {
    let mut query = String::from(
        "SELECT id, company_id, series_id, voucher_number, date, description, counterparty, created_at, created_by, posted_at
         FROM vouchers WHERE company_id = ?1",
    );
    if from_date.is_some() {
        query.push_str(" AND date >= ?2");
    }
    if to_date.is_some() {
        query.push_str(if from_date.is_some() { " AND date <= ?3" } else { " AND date <= ?2" });
    }
    query.push_str(" ORDER BY date DESC, voucher_number DESC");

    let mut stmt = conn.prepare(&query).map_err(map_sql_error)?;
    let mut params_vec: Vec<&dyn rusqlite::ToSql> = vec![company_id];
    if let Some(value) = from_date {
        params_vec.push(value);
    }
    if let Some(value) = to_date {
        params_vec.push(value);
    }

    let rows = stmt
        .query_map(params_vec.as_slice(), |row| {
            Ok(Voucher {
                id: row.get(0)?,
                company_id: row.get(1)?,
                series_id: row.get(2)?,
                voucher_number: row.get(3)?,
                date: row.get(4)?,
                description: row.get(5)?,
                counterparty: row.get(6)?,
                created_at: row.get(7)?,
                created_by: row.get(8)?,
                posted_at: row.get(9)?,
                rows: None,
                attachments: None,
            })
        })
        .map_err(map_sql_error)?;

    let mut vouchers = Vec::new();
    for row in rows {
        let mut voucher = row.map_err(map_sql_error)?;
        voucher.rows = Some(fetch_voucher_rows(conn, &voucher.id)?);
        vouchers.push(voucher);
    }
    Ok(vouchers)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let db_state = db::init_db(app.handle()).map_err(|err| err.to_string())?;
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_companies,
            create_company,
            list_accounts,
            upsert_account,
            list_voucher_series,
            list_vouchers,
            get_voucher,
            create_voucher,
            post_voucher,
            create_correction_voucher,
            list_period_locks,
            lock_period,
            report_voucher_list,
            report_ledger_for_account,
            export_csv,
            export_sie_stub
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
