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
          <NavLink to="/">Översikt</NavLink>
          <NavLink to="/vouchers">Verifikat</NavLink>
          <NavLink to="/accounts">Kontoplan</NavLink>
          <NavLink to="/period-locks">Periodlås</NavLink>
          <NavLink to="/reports">Rapporter</NavLink>
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
