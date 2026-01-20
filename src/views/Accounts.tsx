import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Account } from "../api/types";
import { getActiveCompanyId } from "../utils/company";

const Accounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("Asset");

  const load = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      setError("Select a company on the dashboard.");
      return;
    }
    setError(null);
    const data = await api.listAccounts(companyId);
    setAccounts(data);
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async () => {
    const companyId = getActiveCompanyId();
    if (!companyId) {
      return;
    }
    const newAccount = await api.upsertAccount({
      companyId,
      number: Number(number),
      name,
      accountType,
      isActive: true,
    });
    setAccounts((prev) => [...prev, newAccount]);
    setNumber("");
    setName("");
  };

  const handleToggle = async (account: Account) => {
    const updated = await api.upsertAccount({
      id: account.id,
      companyId: account.companyId,
      number: account.number,
      name: account.name,
      accountType: account.accountType,
      vatCode: account.vatCode,
      isActive: !account.isActive,
    });
    setAccounts((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  return (
    <section>
      <h2>Chart of Accounts</h2>
      {error && <p className="error">{error}</p>}
      <div className="card">
        <h3>Create account</h3>
        <div className="inline-form">
          <input
            placeholder="Number"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
          />
          <input
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <select
            value={accountType}
            onChange={(event) => setAccountType(event.target.value)}
          >
            <option value="Asset">Asset</option>
            <option value="Liability">Liability</option>
            <option value="Equity">Equity</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
          <button onClick={handleCreate}>Create</button>
        </div>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Number</th>
              <th>Name</th>
              <th>Type</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account.id}>
                <td>{account.number}</td>
                <td>{account.name}</td>
                <td>{account.accountType}</td>
                <td>
                  <button onClick={() => handleToggle(account)}>
                    {account.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default Accounts;
