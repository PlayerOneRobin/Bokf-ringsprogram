export type Company = {
  id: string;
  name: string;
  orgNumber?: string | null;
  fiscalYearStart: string;
  fiscalYearEnd: string;
};

export type Account = {
  id: string;
  companyId: string;
  number: number;
  name: string;
  accountType: string;
  vatCode?: string | null;
  isActive: boolean;
};

export type VoucherSeries = {
  id: string;
  companyId: string;
  code: string;
  description: string;
  nextNumber: number;
};

export type VoucherRow = {
  id: string;
  voucherId: string;
  accountId: string;
  description?: string | null;
  debitCents: number;
  creditCents: number;
  vatCode?: string | null;
};

export type Voucher = {
  id: string;
  companyId: string;
  seriesId: string;
  voucherNumber: number;
  date: string;
  description: string;
  counterparty?: string | null;
  postedAt?: string | null;
  createdAt: string;
  createdBy: string;
  rows?: VoucherRow[];
  attachments?: Attachment[];
};

export type Attachment = {
  id: string;
  voucherId: string;
  refType: string;
  refValue: string;
  note?: string | null;
  createdAt: string;
};

export type PeriodLock = {
  id: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  lockedAt: string;
  lockedBy: string;
};

export type VoucherListItem = {
  id: string;
  voucherNumber: number;
  date: string;
  description: string;
  totalCents: number;
};

export type LedgerRow = {
  date: string;
  voucherNumber: number;
  description: string;
  debitCents: number;
  creditCents: number;
  balanceCents: number;
};

export type CreateVoucherRowInput = {
  accountId: string;
  description?: string | null;
  debitCents: number;
  creditCents: number;
  vatCode?: string | null;
};

export type CreateAttachmentInput = {
  refType: string;
  refValue: string;
  note?: string | null;
};

export type CreateVoucherInput = {
  companyId: string;
  seriesId: string;
  date: string;
  description: string;
  counterparty?: string | null;
  rows: CreateVoucherRowInput[];
  attachments?: CreateAttachmentInput[];
};

export type CreateCorrectionInput = {
  originalVoucherId: string;
  date: string;
  description: string;
};
