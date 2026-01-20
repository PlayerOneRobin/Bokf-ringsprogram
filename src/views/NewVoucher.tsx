import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import {
  Account,
  CreateAttachmentInput,
  CreateVoucherRowInput,
  VoucherSeries,
} from "../api/types";
import { getActiveCompanyId } from "../utils/company";
import { formatCents, parseCents } from "../utils/money";

const emptyRow = (): CreateVoucherRowInput => ({
  accountId: "",
  description: "",
  debitCents: 0,
  creditCents: 0,
  vatCode: null,
});

const emptyAttachment = (): CreateAttachmentInput => ({
  refType: "Fil",
  refValue: "",
  note: "",
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
  const [attachments, setAttachments] = useState<CreateAttachmentInput[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const companyId = getActiveCompanyId();
      if (!companyId) {
        setError("Välj ett företag i översikten.");
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

  const updateAttachment = (
    index: number,
    updates: Partial<CreateAttachmentInput>
  ) => {
    setAttachments((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...updates } : item
      )
    );
  };

  const addAttachment = () =>
    setAttachments((prev) => [...prev, emptyAttachment()]);

  const removeAttachment = (index: number) =>
    setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index));

  const handleSubmit = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      setError("Välj ett företag i översikten.");
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
        attachments: attachments.filter((item) => item.refValue.trim().length > 0),
      };
      const voucher = await api.createVoucher(payload);
      navigate(`/vouchers/${voucher.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section>
      <h2>Nytt verifikat</h2>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <div className="grid">
          <label>
            Datum
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            Serie
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
            Beskrivning
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <label>
            Motpart
            <input
              value={counterparty}
              onChange={(event) => setCounterparty(event.target.value)}
            />
          </label>
        </div>
      </div>
      <div className="card">
        <h3>Rader</h3>
        <table>
          <thead>
            <tr>
              <th>Konto</th>
              <th>Beskrivning</th>
              <th>Debet</th>
              <th>Kredit</th>
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
                    <option value="">Välj</option>
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
                  <button onClick={() => removeRow(index)}>Ta bort</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addRow}>Lägg till rad</button>
        <div className="balance">
          Balans: {formatCents(balance)}
        </div>
      </div>
      <div className="card">
        <h3>Bilagor</h3>
        <table>
          <thead>
            <tr>
              <th>Typ</th>
              <th>Referens</th>
              <th>Anteckning</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {attachments.map((attachment, index) => (
              <tr key={index}>
                <td>
                  <select
                    value={attachment.refType}
                    onChange={(event) =>
                      updateAttachment(index, { refType: event.target.value })
                    }
                  >
                    <option value="Fil">Fil</option>
                    <option value="URL">URL</option>
                  </select>
                </td>
                <td>
                  <input
                    value={attachment.refValue}
                    onChange={(event) =>
                      updateAttachment(index, { refValue: event.target.value })
                    }
                    placeholder="Sökväg eller URL"
                  />
                </td>
                <td>
                  <input
                    value={attachment.note ?? ""}
                    onChange={(event) =>
                      updateAttachment(index, { note: event.target.value })
                    }
                    placeholder="Valfri anteckning"
                  />
                </td>
                <td>
                  <button onClick={() => removeAttachment(index)}>Ta bort</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={addAttachment}>Lägg till bilaga</button>
        <p className="hint">
          Du kan lägga till filvägar eller URL:er till kvitton här.
        </p>
      </div>
      <button onClick={handleSubmit} className="primary">
        Skapa verifikat
      </button>
    </section>
  );
};

export default NewVoucher;
