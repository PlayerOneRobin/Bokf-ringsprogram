import { NavLink, Route, Routes } from "react-router-dom";
import Dashboard from "./views/Dashboard";
import VouchersList from "./views/VouchersList";
import NewVoucher from "./views/NewVoucher";
import VoucherDetail from "./views/VoucherDetail";
import Accounts from "./views/Accounts";
import PeriodLocks from "./views/PeriodLocks";
import Reports from "./views/Reports";
import ExportView from "./views/ExportView";

const App = () => {
  return (
    <div className="app">
      <header className="topbar">
        <h1>Bokföringsprogram</h1>
        <nav className="nav">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/vouchers">Vouchers</NavLink>
          <NavLink to="/accounts">Accounts</NavLink>
          <NavLink to="/period-locks">Period Locks</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/export">Export</NavLink>
        </nav>
      </header>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vouchers" element={<VouchersList />} />
          <Route path="/vouchers/new" element={<NewVoucher />} />
          <Route path="/vouchers/:id" element={<VoucherDetail />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/period-locks" element={<PeriodLocks />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/export" element={<ExportView />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
