import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Voucher } from "../api/types";
import { formatCents } from "../utils/money";

const VoucherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [correctionDate, setCorrectionDate] = useState("");
  const [correctionDescription, setCorrectionDescription] = useState("");

  const load = async () => {
    if (!id) {
      return;
    }
    try {
      const data = await api.getVoucher(id);
      setVoucher(data);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const handlePost = async () => {
    if (!voucher) {
      return;
    }
    const updated = await api.postVoucher(voucher.id);
    setVoucher(updated);
  };

  const handleCorrection = async () => {
    if (!voucher) {
      return;
    }
    const updated = await api.createCorrectionVoucher({
      originalVoucherId: voucher.id,
      date: correctionDate,
      description: correctionDescription || `Correction of ${voucher.voucherNumber}`,
    });
    navigate(`/vouchers/${updated.id}`);
  };

  const total =
    voucher?.rows?.reduce((sum, row) => sum + row.debitCents, 0) ?? 0;

  return (
    <section>
      <h2>Voucher Detail</h2>
      {error && <p className="error">{error}</p>}
      {voucher && (
        <>
          <div className="card">
            <h3>Header</h3>
            <p>
              <strong>Number:</strong> {voucher.voucherNumber}
            </p>
            <p>
              <strong>Date:</strong> {voucher.date}
            </p>
            <p>
              <strong>Description:</strong> {voucher.description}
            </p>
            <p>
              <strong>Counterparty:</strong> {voucher.counterparty ?? "-"}
            </p>
            <p>
              <strong>Status:</strong> {voucher.postedAt ? "Posted" : "Draft"}
            </p>
            {!voucher.postedAt && (
              <button onClick={handlePost}>Post voucher</button>
            )}
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
                </tr>
              </thead>
              <tbody>
                {voucher.rows?.map((row) => (
                  <tr key={row.id}>
                    <td>{row.accountId}</td>
                    <td>{row.description}</td>
                    <td>{formatCents(row.debitCents)}</td>
                    <td>{formatCents(row.creditCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Total: {formatCents(total)}</p>
          </div>
          <div className="card">
            <h3>Attachments</h3>
            {voucher.attachments?.length ? (
              <ul>
                {voucher.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    {attachment.refType}: {attachment.refValue} {attachment.note}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No attachments.</p>
            )}
          </div>
          <div className="card">
            <h3>Create correction voucher</h3>
            <div className="inline-form">
              <label>
                Date
                <input
                  type="date"
                  value={correctionDate}
                  onChange={(event) => setCorrectionDate(event.target.value)}
                />
              </label>
              <label>
                Description
                <input
                  value={correctionDescription}
                  onChange={(event) => setCorrectionDescription(event.target.value)}
                />
              </label>
              <button onClick={handleCorrection}>Create correction</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default VoucherDetail;
