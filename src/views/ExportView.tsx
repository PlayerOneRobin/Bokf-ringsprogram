import { useState } from "react";
import { api } from "../api/client";
import { getActiveCompanyId } from "../utils/company";

const ExportView = () => {
  const [targetPath, setTargetPath] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleCsv = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      setMessage("Välj ett företag i översikten.");
      return;
    }
    const result = await api.exportCsv({ companyId, targetPath });
    setMessage(result);
  };

  const handleSie = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      setMessage("Välj ett företag i översikten.");
      return;
    }
    const result = await api.exportSie({ companyId, targetPath });
    setMessage(result);
  };

  return (
    <section>
      <h2>Export</h2>
      <div className="card">
        <label>
          Målväg (mapp eller fil beroende på export)
          <input
            value={targetPath}
            onChange={(event) => setTargetPath(event.target.value)}
            placeholder="/sökväg/till/export"
          />
        </label>
        <div className="inline-form">
          <button onClick={handleCsv}>Exportera CSV</button>
          <button onClick={handleSie}>Exportera SIE4-stub</button>
        </div>
        {message && <p>{message}</p>}
      </div>
    </section>
  );
};

export default ExportView;
