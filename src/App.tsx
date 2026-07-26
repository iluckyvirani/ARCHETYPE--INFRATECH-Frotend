import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { AllClientsPage } from "./pages/AllClientsPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { CreateInvoicePage } from "./pages/CreateInvoicePage";
import { InvoicePrintPage } from "./pages/InvoicePrintPage";
import { NewClientPage } from "./pages/NewClientPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { StartPage } from "./pages/StartPage";
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<StartPage />} />
          <Route path="clients" element={<AllClientsPage />} />
          <Route path="clients/new" element={<NewClientPage />} />
          <Route path="clients/:id/invoice/new" element={<CreateInvoicePage />} />
          <Route path="clients/:id/print/:type?" element={<InvoicePrintPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
