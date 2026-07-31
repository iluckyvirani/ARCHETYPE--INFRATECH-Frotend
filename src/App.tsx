import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { RequireAccess } from "./components/RequireAccess";
import { AllClientsPage } from "./pages/AllClientsPage";
import { ClientDetailPage } from "./pages/ClientDetailPage";
import { CreateInvoicePage } from "./pages/CreateInvoicePage";
import { EditInvoicePage } from "./pages/EditInvoicePage";
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
          <Route element={<RequireAccess />}>
            <Route path="clients" element={<AllClientsPage />} />
            <Route path="clients/new" element={<NewClientPage />} />
            <Route
              path="clients/:id/invoice/new"
              element={<CreateInvoicePage />}
            />
            <Route
              path="clients/:id/invoice/:invoiceId/edit"
              element={<EditInvoicePage />}
            />
            <Route
              path="clients/:id/print/:type?"
              element={<InvoicePrintPage />}
            />
            <Route path="clients/:id" element={<ClientDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
