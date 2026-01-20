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
      description: correctionDescription || `Rättelse av ${voucher.voucherNumber}`,
    });
    navigate(`/vouchers/${updated.id}`);
  };

  const total =
    voucher?.rows?.reduce((sum, row) => sum + row.debitCents, 0) ?? 0;

  return (
    <section>
      <h2>Verifikatdetalj</h2>
      {error && <p className="error">{error}</p>}
      {voucher && (
        <>
          <div className="card">
            <h3>Huvud</h3>
            <p>
              <strong>Nummer:</strong> {voucher.voucherNumber}
            </p>
            <p>
              <strong>Datum:</strong> {voucher.date}
            </p>
            <p>
              <strong>Beskrivning:</strong> {voucher.description}
            </p>
            <p>
              <strong>Motpart:</strong> {voucher.counterparty ?? "-"}
            </p>
            <p>
              <strong>Status:</strong> {voucher.postedAt ? "Bokförd" : "Utkast"}
            </p>
            {!voucher.postedAt && (
              <button onClick={handlePost}>Bokför verifikat</button>
            )}
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
            <p>Summa: {formatCents(total)}</p>
          </div>
          <div className="card">
            <h3>Bilagor</h3>
            {voucher.attachments?.length ? (
              <ul>
                {voucher.attachments.map((attachment) => (
                  <li key={attachment.id}>
                    {attachment.refType}: {attachment.refValue} {attachment.note}
                  </li>
                ))}
              </ul>
            ) : (
              <p>Inga bilagor.</p>
            )}
          </div>
          <div className="card">
            <h3>Skapa rättelseverifikat</h3>
            <div className="inline-form">
              <label>
                Datum
                <input
                  type="date"
                  value={correctionDate}
                  onChange={(event) => setCorrectionDate(event.target.value)}
                />
              </label>
              <label>
                Beskrivning
                <input
                  value={correctionDescription}
                  onChange={(event) => setCorrectionDescription(event.target.value)}
                />
              </label>
              <button onClick={handleCorrection}>Skapa rättelse</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default VoucherDetail;
