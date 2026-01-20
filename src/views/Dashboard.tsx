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
      <h2>Dashboard</h2>
      <div className="card">
        <h3>Select company</h3>
        <select
          value={activeId ?? ""}
          onChange={(event) => handleSelect(event.target.value)}
        >
          <option value="" disabled>
            Select company
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
            placeholder="New company name"
          />
          <button onClick={handleCreate}>Create</button>
        </div>
      </div>
      <div className="card">
        <h3>Quick links</h3>
        <ul className="link-grid">
          <li>
            <Link to="/vouchers">Vouchers</Link>
          </li>
          <li>
            <Link to="/accounts">Chart of accounts</Link>
          </li>
          <li>
            <Link to="/reports">Reports</Link>
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
