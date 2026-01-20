import { useState } from "react";
import { api } from "../api/client";
import { getActiveCompanyId } from "../utils/company";

const ExportView = () => {
  const [targetPath, setTargetPath] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleCsv = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      setMessage("Select a company on the dashboard.");
      return;
    }
    const result = await api.exportCsv({ companyId, targetPath });
    setMessage(result);
  };

  const handleSie = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      setMessage("Select a company on the dashboard.");
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
          Target path (folder or file path depending on export)
          <input
            value={targetPath}
            onChange={(event) => setTargetPath(event.target.value)}
            placeholder="/path/to/export"
          />
        </label>
        <div className="inline-form">
          <button onClick={handleCsv}>Export CSV</button>
          <button onClick={handleSie}>Export SIE4 stub</button>
        </div>
        {message && <p>{message}</p>}
      </div>
    </section>
  );
};

export default ExportView;
