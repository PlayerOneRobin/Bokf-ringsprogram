import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Company } from "../api/types";
import { getActiveCompanyId, setActiveCompanyId } from "../utils/company";

const Dashboard = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeId, setActiveId] = useState<string | null>(
    getActiveCompanyId()
  );
  const [newName, setNewName] = useState("");

  const load = async () => {
    const data = await api.listCompanies();
    setCompanies(data);
    if (!activeId && data.length > 0) {
      setActiveId(data[0].id);
      setActiveCompanyId(data[0].id);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) {
      return;
    }
    const company = await api.createCompany({ name: newName.trim() });
    setCompanies((prev) => [...prev, company]);
    setNewName("");
  };

  const handleSelect = (id: string) => {
    setActiveId(id);
    setActiveCompanyId(id);
  };

  return (
    <section>
      <h2>Översikt</h2>
      <div className="card">
        <h3>Välj företag</h3>
        <select
          value={activeId ?? ""}
          onChange={(event) => handleSelect(event.target.value)}
        >
          <option value="" disabled>
            Välj företag
          </option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        <div className="inline-form">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Nytt företagsnamn"
          />
          <button onClick={handleCreate}>Skapa</button>
        </div>
      </div>
      <div className="card">
        <h3>Snabblänkar</h3>
        <ul className="link-grid">
          <li>
            <Link to="/vouchers">Verifikat</Link>
          </li>
          <li>
            <Link to="/accounts">Kontoplan</Link>
          </li>
          <li>
            <Link to="/reports">Rapporter</Link>
          </li>
          <li>
            <Link to="/export">Export</Link>
          </li>
        </ul>
      </div>
    </section>
  );
};

export default Dashboard;
