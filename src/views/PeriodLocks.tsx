import { useEffect, useState } from "react";
import { api } from "../api/client";
import { PeriodLock } from "../api/types";
import { getActiveCompanyId } from "../utils/company";

const PeriodLocks = () => {
  const [locks, setLocks] = useState<PeriodLock[]>([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      setError("Välj ett företag i översikten.");
      return;
    }
    setError(null);
    const data = await api.listPeriodLocks(companyId);
    setLocks(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleLock = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      return;
    }
    const lock = await api.lockPeriod({ companyId, periodStart, periodEnd });
    setLocks((prev) => [...prev, lock]);
    setPeriodStart("");
    setPeriodEnd("");
  };

  return (
    <section>
      <h2>Periodlås</h2>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <h3>Lås period</h3>
        <div className="inline-form">
          <label>
            Start
            <input
              type="date"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
          </label>
          <label>
            Slut
            <input
              type="date"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
          </label>
          <button onClick={handleLock}>Lås</button>
        </div>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Start</th>
              <th>Slut</th>
              <th>Låst</th>
              <th>Låst av</th>
            </tr>
          </thead>
          <tbody>
            {locks.map((lock) => (
              <tr key={lock.id}>
                <td>{lock.periodStart}</td>
                <td>{lock.periodEnd}</td>
                <td>{lock.lockedAt}</td>
                <td>{lock.lockedBy}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PeriodLocks;
