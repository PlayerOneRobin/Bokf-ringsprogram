import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Account, CreateVoucherRowInput, VoucherSeries } from "../api/types";
import { getActiveCompanyId } from "../utils/company";
import { formatCents, parseCents } from "../utils/money";

const emptyRow = (): CreateVoucherRowInput => ({
  accountId: "",
  description: "",
  debitCents: 0,
  creditCents: 0,
  vatCode: null,
});

const NewVoucher = () => {
  const navigate = useNavigate();
  const [series, setSeries] = useState<VoucherSeries[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [date, setDate] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [rows, setRows] = useState<CreateVoucherRowInput[]>([emptyRow()]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const companyId = getActiveCompanyId();
      if (!companyId) {
        setError("Select a company on the dashboard.");
        return;
      }
      const [seriesData, accountData] = await Promise.all([
        api.listVoucherSeries(companyId),
        api.listAccounts(companyId),
      ]);
      setSeries(seriesData);
      setAccounts(accountData);
      if (seriesData[0]) {
        setSeriesId(seriesData[0].id);
      }
    };
    void load();
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.debit += row.debitCents;
        acc.credit += row.creditCents;
        return acc;
      },
      { debit: 0, credit: 0 }
    );
  }, [rows]);

  const balance = totals.debit - totals.credit;

  const updateRow = (
    index: number,
    updates: Partial<CreateVoucherRowInput>
  ) => {
    setRows((prev) =>
      prev.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...updates } : row
      )
    );
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);

  const removeRow = (index: number) =>
    setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));

  const handleSubmit = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      setError("Select a company on the dashboard.");
      return;
    }
    try {
      const payload = {
        companyId,
        seriesId,
        date,
        description,
        counterparty: counterparty || null,
        rows,
      };
      const voucher = await api.createVoucher(payload);
      navigate(`/vouchers/${voucher.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section>
      <h2>New Voucher</h2>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <div className="grid">
          <label>
            Date
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            Series
            <select
              value={seriesId}
              onChange={(event) => setSeriesId(event.target.value)}
            >
              {series.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} - {item.description}
                </option>
              ))}
            </select>
          </label>
          <label>
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label>
            Counterparty
            <input
              value={counterparty}
              onChange={(event) => setCounterparty(event.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="card">
        <h3>Rows</h3>
        <table>
          <thead>
            <tr>
              <th>Account</th>
              <th>Description</th>
              <th>Debit</th>
              <th>Credit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index}>
                <td>
                  <select
                    value={row.accountId}
                    onChange={(event) =>
                      updateRow(index, { accountId: event.target.value })
                    }
                  >
                    <option value="">Select</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.number} {account.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    value={row.description ?? ""}
                    onChange={(event) =>
                      updateRow(index, { description: event.target.value })
                    }
                  />
                </td>
                <td>
                  <input
                    value={row.debitCents ? row.debitCents / 100 : ""}
                    onChange={(event) =>
                      updateRow(index, {
                        debitCents: parseCents(event.target.value),
                      })
                    }
                  />
                </td>
                <td>
                  <input
                    value={row.creditCents ? row.creditCents / 100 : ""}
                    onChange={(event) =>
                      updateRow(index, {
                        creditCents: parseCents(event.target.value),
                      })
                    }
                  />
                </td>
                <td>
                  <button onClick={() => removeRow(index)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow}>Add row</button>
        <div className="balance">
          Balance: {formatCents(balance)}
        </div>
      </div>
      <button onClick={handleSubmit} className="primary">
        Create Voucher
      </button>
    </section>
  );
};

export default NewVoucher;
