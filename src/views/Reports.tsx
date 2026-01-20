import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Account, LedgerRow, VoucherListItem } from "../api/types";
import { getActiveCompanyId } from "../utils/company";
import { formatCents } from "../utils/money";

const Reports = () => {
  const [voucherList, setVoucherList] = useState<VoucherListItem[]>([]);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      setError("Select a company on the dashboard.");
      return;
    }
    const data = await api.listAccounts(companyId);
    setAccounts(data);
    if (data[0]) {
      setAccountId(data[0].id);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const runVoucherList = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      return;
    }
    const data = await api.reportVoucherList({
      companyId,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    setVoucherList(data);
  };

  const runLedger = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId || !accountId) {
      return;
    }
    const data = await api.reportLedger({
      companyId,
      accountId,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    setLedgerRows(data);
  };

  return (
    <section>
      <h2>Reports</h2>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <h3>Filters</h3>
        <div className="inline-form">
          <label>
            From
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>
          <button onClick={runVoucherList}>Run voucher list</button>
        </div>
      </div>
      <div className="card">
        <h3>Voucher list (general journal)</h3>
        <table>
          <thead>
            <tr>
              <th>No.</th>
              <th>Date</th>
              <th>Description</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {voucherList.map((row) => (
              <tr key={row.id}>
                <td>{row.voucherNumber}</td>
                <td>{row.date}</td>
                <td>{row.description}</td>
                <td>{formatCents(row.totalCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h3>General ledger</h3>
        <div className="inline-form">
          <label>
            Account
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.number} {account.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={runLedger}>Run ledger</button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Voucher</th>
              <th>Description</th>
              <th>Debit</th>
              <th>Credit</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {ledgerRows.map((row, index) => (
              <tr key={`${row.voucherNumber}-${index}`}>
                <td>{row.date}</td>
                <td>{row.voucherNumber}</td>
                <td>{row.description}</td>
                <td>{formatCents(row.debitCents)}</td>
                <td>{formatCents(row.creditCents)}</td>
                <td>{formatCents(row.balanceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Reports;
