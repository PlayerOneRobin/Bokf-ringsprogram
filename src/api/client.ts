import { invoke } from "@tauri-apps/api/core";
import {
  Account,
  Company,
  CreateCorrectionInput,
  CreateVoucherInput,
  LedgerRow,
  PeriodLock,
  Voucher,
  VoucherListItem,
  VoucherSeries,
} from "./types";

export const api = {
  listCompanies: () => invoke<Company[]>("list_companies"),
  createCompany: (payload: { name: string; orgNumber?: string | null }) =>
    invoke<Company>("create_company", payload),
  listAccounts: (companyId: string) =>
    invoke<Account[]>("list_accounts", { companyId }),
  upsertAccount: (payload: {
    id?: string | null;
    companyId: string;
    number: number;
    name: string;
    accountType: string;
    vatCode?: string | null;
    isActive: boolean;
  }) => invoke<Account>("upsert_account", payload),
  listVoucherSeries: (companyId: string) =>
    invoke<VoucherSeries[]>("list_voucher_series", { companyId }),
  listVouchers: (companyId: string, fromDate?: string, toDate?: string) =>
    invoke<Voucher[]>("list_vouchers", { companyId, fromDate, toDate }),
  getVoucher: (voucherId: string) =>
    invoke<Voucher>("get_voucher", { voucherId }),
  createVoucher: (payload: CreateVoucherInput) =>
    invoke<Voucher>("create_voucher", payload),
  postVoucher: (voucherId: string) =>
    invoke<Voucher>("post_voucher", { voucherId }),
  createCorrectionVoucher: (payload: CreateCorrectionInput) =>
    invoke<Voucher>("create_correction_voucher", payload),
  listPeriodLocks: (companyId: string) =>
    invoke<PeriodLock[]>("list_period_locks", { companyId }),
  lockPeriod: (payload: {
    companyId: string;
    periodStart: string;
    periodEnd: string;
  }) => invoke<PeriodLock>("lock_period", payload),
  reportVoucherList: (payload: {
    companyId: string;
    fromDate?: string;
    toDate?: string;
  }) => invoke<VoucherListItem[]>("report_voucher_list", payload),
  reportLedger: (payload: {
    companyId: string;
    accountId: string;
    fromDate?: string;
    toDate?: string;
  }) => invoke<LedgerRow[]>("report_ledger_for_account", payload),
  exportCsv: (payload: { companyId: string; targetPath: string }) =>
    invoke<string>("export_csv", payload),
  exportSie: (payload: { companyId: string; targetPath: string }) =>
    invoke<string>("export_sie_stub", payload),
};
