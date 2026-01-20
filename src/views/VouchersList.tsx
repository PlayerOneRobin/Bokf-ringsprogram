import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Voucher } from "../api/types";
import { formatCents } from "../utils/money";
import { getActiveCompanyId } from "../utils/company";

const sumVoucher = (voucher: Voucher) => {
  if (!voucher.rows) {
    return 0;
  }
  return voucher.rows.reduce((sum, row) => sum + row.debitCents, 0);
};

const VouchersList = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      setError("Välj ett företag i översikten.");
      return;
    }
    setError(null);
    const data = await api.listVouchers(
      companyId,
      fromDate || undefined,
      toDate || undefined
    );
    setVouchers(data);
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <section>
      <div className="section-header">
        <h2>Verifikat</h2>
        <Link className="button" to="/vouchers/new">
          Nytt verifikat
        </Link>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <h3>Filter</h3>
        <div className="inline-form">
          <label>
            Från
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
            />
          </label>
          <label>
            Till
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
            />
          </label>
          <button onClick={load}>Applicera</button>
        </div>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Nr</th>
              <th>Datum</th>
              <th>Beskrivning</th>
              <th>Summa</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((voucher) => (
              <tr key={voucher.id}>
                <td>
                  <Link to={`/vouchers/${voucher.id}`}>
                    {voucher.voucherNumber}
                  </Link>
                </td>
                <td>{voucher.date}</td>
                <td>{voucher.description}</td>
                <td>{formatCents(sumVoucher(voucher))}</td>
                <td>{voucher.postedAt ? "Bokförd" : "Utkast"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default VouchersList;
