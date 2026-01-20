use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Company {
    pub id: String,
    pub name: String,
    pub org_number: Option<String>,
    pub fiscal_year_start: String,
    pub fiscal_year_end: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub id: String,
    pub company_id: String,
    pub number: i64,
    pub name: String,
    pub account_type: String,
    pub vat_code: Option<String>,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoucherSeries {
    pub id: String,
    pub company_id: String,
    pub code: String,
    pub description: String,
    pub next_number: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Voucher {
    pub id: String,
    pub company_id: String,
    pub series_id: String,
    pub voucher_number: i64,
    pub date: String,
    pub description: String,
    pub counterparty: Option<String>,
    pub created_at: String,
    pub created_by: String,
    pub posted_at: Option<String>,
    pub rows: Option<Vec<VoucherRow>>,
    pub attachments: Option<Vec<Attachment>>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoucherRow {
    pub id: String,
    pub voucher_id: String,
    pub account_id: String,
    pub description: Option<String>,
    pub debit_cents: i64,
    pub credit_cents: i64,
    pub vat_code: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Attachment {
    pub id: String,
    pub voucher_id: String,
    pub ref_type: String,
    pub ref_value: String,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PeriodLock {
    pub id: String,
    pub company_id: String,
    pub period_start: String,
    pub period_end: String,
    pub locked_at: String,
    pub locked_by: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoucherListItem {
    pub id: String,
    pub voucher_number: i64,
    pub date: String,
    pub description: String,
    pub total_cents: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LedgerRow {
    pub date: String,
    pub voucher_number: i64,
    pub description: String,
    pub debit_cents: i64,
    pub credit_cents: i64,
    pub balance_cents: i64,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVoucherInput {
    pub company_id: String,
    pub series_id: String,
    pub date: String,
    pub description: String,
    pub counterparty: Option<String>,
    pub rows: Vec<CreateVoucherRowInput>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVoucherRowInput {
    pub account_id: String,
    pub description: Option<String>,
    pub debit_cents: i64,
    pub credit_cents: i64,
    pub vat_code: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCorrectionInput {
    pub original_voucher_id: String,
    pub date: String,
    pub description: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpsertAccountInput {
    pub id: Option<String>,
    pub company_id: String,
    pub number: i64,
    pub name: String,
    pub account_type: String,
    pub vat_code: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCompanyInput {
    pub name: String,
    pub org_number: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyIdInput {
    pub company_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListVouchersInput {
    pub company_id: String,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoucherIdInput {
    pub voucher_id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LockPeriodInput {
    pub company_id: String,
    pub period_start: String,
    pub period_end: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportVoucherListInput {
    pub company_id: String,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportLedgerInput {
    pub company_id: String,
    pub account_id: String,
    pub from_date: Option<String>,
    pub to_date: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportInput {
    pub company_id: String,
    pub target_path: String,
}
