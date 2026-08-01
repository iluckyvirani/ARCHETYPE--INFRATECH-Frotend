import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { DetailSkeleton } from "../components/Skeleton";
import {
  formatDisplayDate,
  formatINR,
  isOverdue,
  toDayISO,
  todayISO,
} from "../lib/calc";
import {
  completeClientGroup,
  getClientGroup,
  markSchedulePaid,
} from "../lib/store";
import { formatWorkTypes } from "../lib/workTypes";
import type { Invoice, ScheduleItem } from "../lib/types";
import "./ClientDetail.css";

type Tab =
  | "overview"
  | "ledger"
  | "emi"
  | "products"
  | "sales"
  | "quotations";

export function ClientDetailPage() {
  const { id: groupId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [settling, setSettling] = useState(false);

  async function refresh() {
    if (!groupId) return;
    setLoading(true);
    const data = await getClientGroup(groupId);
    if (!data) {
      setError("Client not found");
      setInvoices([]);
    } else {
      setName(data.name);
      setLocation(data.location);
      setCreatedAt(data.createdAt);
      setInvoices(data.invoices);
      setSchedule(data.schedule);
      setError(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, [groupId]);

  const saleInvoices = useMemo(
    () => invoices.filter((i) => i.documentType !== "quotation"),
    [invoices]
  );
  const quotations = useMemo(
    () => invoices.filter((i) => i.documentType === "quotation"),
    [invoices]
  );

  const totals = useMemo(() => {
    const today = todayISO();
    const totalSales = saleInvoices.reduce((s, i) => s + i.totalBill, 0);

    const otherPayments = schedule
      .filter((s) => s.paid && s.kind !== "advance")
      .reduce((s, r) => s + r.amount, 0);

    // invoice.balance already = totalBill − advance at create time
    const openAfterAdvance = saleInvoices.reduce(
      (s, i) => s + (Number(i.balance) || 0),
      0
    );

    // Future advance not yet collected: add that advance back into outstanding
    const futureAdvanceUnpaid = saleInvoices.reduce((sum, inv) => {
      const amt = Number(inv.advanceAmount) || 0;
      if (amt <= 0) return sum;
      const advDay = toDayISO(inv.advanceDate);
      if (!advDay || advDay <= today) return sum;
      const collected = schedule.some(
        (row) =>
          row.invoiceId === inv.id && row.kind === "advance" && row.paid
      );
      return collected ? sum : sum + amt;
    }, 0);

    const outstanding = Math.max(
      0,
      openAfterAdvance - otherPayments + futureAdvanceUnpaid
    );
    const totalPayments = Math.max(0, totalSales - outstanding);

    const emiRows = schedule
      .filter(
        (s) =>
          s.kind === "installment" ||
          s.kind === "one_time" ||
          s.kind === "stage"
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const pendingEmi = emiRows.filter((s) => !s.paid);
    return {
      totalSales,
      totalPayments,
      outstanding,
      pendingEmi,
      emiRows,
    };
  }, [saleInvoices, schedule]);

  const paidTransactions = useMemo(
    () =>
      [...schedule]
        .filter((s) => s.paid)
        .sort((a, b) =>
          String(b.paidAt || b.dueDate).localeCompare(
            String(a.paidAt || a.dueDate)
          )
        ),
    [schedule]
  );

  const products = useMemo(() => {
    const rows: {
      name: string;
      qty: number;
      saleDate: string;
      amount: number;
      invoiceNo: string;
    }[] = [];
    for (const inv of saleInvoices) {
      rows.push({
        name: `${inv.projectName} (${inv.feeMode.replace("_", " ")})`,
        qty: 1,
        saleDate: inv.createdAt.slice(0, 10),
        amount: inv.feeAmount,
        invoiceNo: inv.invoiceNo,
      });
      for (const w of inv.additionalWorks || []) {
        rows.push({
          name: w.name,
          qty: w.qty,
          saleDate: inv.createdAt.slice(0, 10),
          amount: w.qty * w.rate,
          invoiceNo: inv.invoiceNo,
        });
      }
    }
    return rows;
  }, [saleInvoices]);

  const invoiceById = useMemo(() => {
    const m = new Map<string, Invoice>();
    for (const i of invoices) m.set(i.id, i);
    return m;
  }, [invoices]);

  async function togglePaid(item: ScheduleItem) {
    if (!groupId) return;
    await markSchedulePaid(groupId, item.id, !item.paid);
    await refresh();
  }

  async function onConfirmComplete() {
    if (!groupId) return;
    setSettling(true);
    try {
      await completeClientGroup(groupId);
      setConfirmComplete(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Complete failed");
      setConfirmComplete(false);
    } finally {
      setSettling(false);
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!groupId || error || !invoices.length) {
    return (
      <section className="panel">
        <p className="error-text">{error || "Not found"}</p>
        <Link to="/clients" className="btn btn-dark">
          Back to clients
        </Link>
      </section>
    );
  }

  const latest = saleInvoices[0] || invoices[0];
  const isCompleted = invoices.every((inv) => Boolean(inv.completed));
  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "ledger", label: "Ledger" },
    { id: "emi", label: "EMI History" },
    { id: "products", label: "Services" },
    { id: "sales", label: "Sales History" },
    { id: "quotations", label: "All Quotations" },
  ];

  return (
    <>
      <header className="page-header">
        <div className="client-header-top">
          <Link to="/clients" className="btn btn-ghost client-back-btn">
            ← Back
          </Link>
          <div>
            <h1>
              {name}
              {isCompleted ? (
                <span
                  className="badge ok"
                  style={{ marginLeft: 10, fontSize: "0.75rem" }}
                >
                  Complete
                </span>
              ) : null}
            </h1>
            <p>{location}</p>
          </div>
        </div>
        <div className="row-actions client-header-actions">
          {!isCompleted && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setConfirmComplete(true)}
            >
              Complete
            </button>
          )}
        </div>
      </header>

      {confirmComplete && (
        <ConfirmDeleteModal
          title="Mark customer complete?"
          message={`Make sure you want to complete "${name}". This will clear and settle all dues — mark all payments paid and set balance to zero.`}
          confirmLabel="Complete"
          confirmingLabel="Completing…"
          danger={false}
          confirming={settling}
          onCancel={() => setConfirmComplete(false)}
          onConfirm={onConfirmComplete}
        />
      )}

      <div className="stat-row">
        <div className="stat-card">
          <span className="stat-label">Client ID</span>
          <strong>{groupId}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Status</span>
          <span className="badge ok">
            {isCompleted ? "Complete" : "Active"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Invoices</span>
          <strong>{saleInvoices.length}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Member since</span>
          <strong>{formatDisplayDate(createdAt)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Last sale</span>
          <strong>
            {saleInvoices[0] ? `#${saleInvoices[0].invoiceNo}` : "—"}
          </strong>
        </div>
        <div className="stat-card" style={{ gridColumn: "1 / -1" }}>
          <span className="stat-label">Type of working</span>
          <strong>
            {formatWorkTypes(latest.workTypes, latest.workTypeCustom)}
          </strong>
        </div>
      </div>

      <nav className="detail-tabs" aria-label="Client sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`detail-tab${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <div className="detail-grid">
          <section className="panel">
            <h2 className="panel-title">Ledger summary</h2>
            <table className="data summary compact">
              <tbody>
                <tr>
                  <td>Total sales</td>
                  <td>₹{formatINR(totals.totalSales)}</td>
                </tr>
                <tr>
                  <td>Total payments</td>
                  <td className="ok-text">₹{formatINR(totals.totalPayments)}</td>
                </tr>
                <tr>
                  <td>
                    <strong className="error-text">Outstanding balance</strong>
                  </td>
                  <td>
                    <strong className="error-text">
                      ₹{formatINR(totals.outstanding)}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
            <div className="row-actions" style={{ marginTop: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: "#0b1f14", borderColor: "#0b1f14" }}
                onClick={() => setTab("ledger")}
              >
                View ledger
              </button>
              <button
                type="button"
                className="btn btn-dark"
                onClick={() => setTab("sales")}
              >
                Invoices
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">EMI overview</h2>
              <button
                type="button"
                className="link-btn"
                onClick={() => setTab("emi")}
              >
                View all EMI
              </button>
            </div>
            {totals.emiRows.length === 0 ? (
              totals.outstanding > 0 ? (
                <ul className="mini-list">
                  <li>
                    <span>Remaining balance due</span>
                    <span>₹{formatINR(totals.outstanding)}</span>
                  </li>
                  <li style={{ borderBottom: "none", color: "#64748b", fontSize: "0.85rem" }}>
                    No installment plan on this invoice — open Sales History to
                    copy an invoice with a payment plan.
                  </li>
                </ul>
              ) : (
                <p className="empty">No pending EMI / dues.</p>
              )
            ) : (
              <ul className="mini-list">
                {totals.emiRows.slice(0, 6).map((e) => {
                  const overdue = isOverdue(e.dueDate, e.paid);
                  return (
                    <li key={e.id}>
                      <span>
                        {e.label}
                        {e.paid
                          ? " · Paid"
                          : overdue
                            ? " · Overdue"
                            : " · Pending"}
                      </span>
                      <span>
                        ₹{formatINR(e.amount)} · {formatDisplayDate(e.dueDate)}
                      </span>
                    </li>
                  );
                })}
                {totals.emiRows.length > 6 && (
                  <li style={{ borderBottom: "none" }}>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => setTab("emi")}
                    >
                      +{totals.emiRows.length - 6} more — view all
                    </button>
                  </li>
                )}
              </ul>
            )}
          </section>

          <section className="panel" style={{ gridColumn: "1 / -1" }}>
            <div className="panel-head">
              <h2 className="panel-title">Recent transactions</h2>
              <button
                type="button"
                className="link-btn"
                onClick={() => setTab("ledger")}
              >
                View all
              </button>
            </div>
            <TxnTable
              rows={paidTransactions.slice(0, 6)}
              invoiceById={invoiceById}
              onToggle={togglePaid}
              emptyText="No successful payments yet."
            />
          </section>
        </div>
      )}

      {tab === "ledger" && (
        <section className="panel">
          <h2 className="panel-title">Ledger summary</h2>
          <table className="data summary compact" style={{ marginBottom: "1rem" }}>
            <tbody>
              <tr>
                <td>Total sales</td>
                <td>₹{formatINR(totals.totalSales)}</td>
              </tr>
              <tr>
                <td>Total payments</td>
                <td className="ok-text">₹{formatINR(totals.totalPayments)}</td>
              </tr>
              <tr>
                <td>
                  <strong className="error-text">Outstanding balance</strong>
                </td>
                <td>
                  <strong className="error-text">
                    ₹{formatINR(totals.outstanding)}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
          <h2 className="panel-title">All transactions</h2>
          <p className="meta" style={{ marginBottom: "0.75rem" }}>
            Successful payments only — pending EMIs are under EMI History
          </p>
          <TxnTable
            rows={paidTransactions}
            invoiceById={invoiceById}
            onToggle={togglePaid}
            emptyText="No successful payments yet."
          />
        </section>
      )}

      {tab === "emi" && (
        <section className="panel">
          <h2 className="panel-title">EMI history</h2>
          <p className="meta" style={{ marginBottom: "0.75rem" }}>
            Installments & dues across all invoices
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Particulars</th>
                  <th>Due date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Paid at</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {schedule.filter((s) => s.kind !== "advance").length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      {totals.outstanding > 0
                        ? `No EMI schedule rows yet. Remaining due ₹${formatINR(totals.outstanding)} — create invoice with One time / Installment / Stage to generate EMI.`
                        : "No EMI history."}
                    </td>
                  </tr>
                )}
                {schedule
                  .filter((s) => s.kind !== "advance")
                  .map((row) => {
                    const inv = invoiceById.get(row.invoiceId);
                    const overdue = isOverdue(row.dueDate, row.paid);
                    return (
                      <tr key={row.id}>
                        <td data-label="Invoice">#{inv?.invoiceNo || "—"}</td>
                        <td data-label="Particulars">{row.label}</td>
                        <td data-label="Due date">
                          {formatDisplayDate(row.dueDate)}
                        </td>
                        <td data-label="Amount">₹{formatINR(row.amount)}</td>
                        <td data-label="Status">
                          <span
                            className={`badge ${
                              row.paid ? "ok" : overdue ? "danger" : ""
                            }`}
                          >
                            {row.paid
                              ? "Paid"
                              : overdue
                                ? "Overdue"
                                : "Pending"}
                          </span>
                        </td>
                        <td data-label="Paid at">
                          {formatDisplayDate(row.paidAt)}
                        </td>
                        <td data-label="Action">
                          <button
                            type="button"
                            className="btn btn-dark"
                            onClick={() => togglePaid(row)}
                          >
                            {row.paid ? "Undo" : "Mark paid"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "products" && (
        <section className="panel">
          <h2 className="panel-title">Services / products</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Product / service</th>
                  <th>Qty</th>
                  <th>Sale date</th>
                  <th>Invoice</th>
                  <th>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr>
                    <td colSpan={5}>No services yet.</td>
                  </tr>
                )}
                {products.map((p, i) => (
                  <tr key={i}>
                    <td data-label="Service">{p.name}</td>
                    <td data-label="Qty">{p.qty}</td>
                    <td data-label="Sale date">
                      {formatDisplayDate(p.saleDate)}
                    </td>
                    <td data-label="Invoice">#{p.invoiceNo}</td>
                    <td data-label="Amount">₹{formatINR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "sales" && (
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">Sales history</h2>
            <p className="meta" style={{ margin: 0 }}>
              Print a bill per invoice, or copy one to create a new invoice
            </p>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Work type</th>
                  <th>Total</th>
                  <th>Advance</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {saleInvoices.length === 0 && (
                  <tr>
                    <td colSpan={9}>No invoices yet.</td>
                  </tr>
                )}
                {saleInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td data-label="Invoice">#{inv.invoiceNo}</td>
                    <td data-label="Date">
                      {formatDisplayDate(inv.createdAt.slice(0, 10))}
                    </td>
                    <td data-label="Project">{inv.projectName}</td>
                    <td data-label="Work type">
                      {formatWorkTypes(inv.workTypes, inv.workTypeCustom)}
                    </td>
                    <td data-label="Total">₹{formatINR(inv.totalBill)}</td>
                    <td data-label="Advance">
                      ₹{formatINR(inv.advanceAmount)}
                    </td>
                    <td data-label="Balance">₹{formatINR(inv.balance)}</td>
                    <td data-label="Status">
                      <span
                        className={`badge ${inv.balance <= 0 ? "ok" : "danger"}`}
                      >
                        {inv.balance <= 0 ? "Settled" : "Open"}
                      </span>
                    </td>
                    <td data-label="Action">
                      <div className="invoice-actions">
                        <Link
                          to={`/clients/${inv.id}/print`}
                          className="btn btn-dark"
                        >
                          Print bill
                        </Link>
                        {!isCompleted && (
                          <>
                            <Link
                              to={`/clients/${groupId}/invoice/${inv.id}/edit`}
                              className="btn btn-ghost invoice-actions__edit"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() =>
                                navigate(
                                  `/clients/${groupId}/invoice/new?copyFrom=${inv.id}`
                                )
                              }
                            >
                              Copy as new
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "quotations" && (
        <section className="panel">
          <div className="panel-head">
            <h2 className="panel-title">All quotations</h2>
            <p className="meta" style={{ margin: 0 }}>
              Estimates only — no invoice number, advance, or installments
            </p>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Work type</th>
                  <th>Quoted amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {quotations.length === 0 && (
                  <tr>
                    <td colSpan={5}>No quotations yet.</td>
                  </tr>
                )}
                {quotations.map((inv) => (
                  <tr key={inv.id}>
                    <td data-label="Date">
                      {formatDisplayDate(inv.createdAt.slice(0, 10))}
                    </td>
                    <td data-label="Project">{inv.projectName}</td>
                    <td data-label="Work type">
                      {formatWorkTypes(inv.workTypes, inv.workTypeCustom)}
                    </td>
                    <td data-label="Quoted amount">
                      ₹{formatINR(inv.totalBill)}
                    </td>
                    <td data-label="Action">
                      <div className="invoice-actions">
                        <Link
                          to={`/clients/${inv.id}/print`}
                          className="btn btn-dark"
                        >
                          Print quote
                        </Link>
                        {!isCompleted && (
                          <>
                            <Link
                              to={`/clients/${groupId}/invoice/${inv.id}/edit`}
                              className="btn btn-ghost invoice-actions__edit"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() =>
                                navigate(
                                  `/clients/${groupId}/invoice/new?copyFrom=${inv.id}`
                                )
                              }
                            >
                              Copy as new
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function TxnTable({
  rows,
  invoiceById,
  onToggle,
  emptyText = "No transactions yet.",
}: {
  rows: ScheduleItem[];
  invoiceById: Map<string, Invoice>;
  onToggle: (row: ScheduleItem) => void;
  emptyText?: string;
}) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Invoice</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7}>{emptyText}</td>
            </tr>
          )}
          {rows.map((row) => {
            const inv = invoiceById.get(row.invoiceId);
            const overdue = isOverdue(row.dueDate, row.paid);
            const advanceSlip =
              row.kind === "advance" && inv
                ? `/clients/${inv.id}/print/advance-demand?scheduleId=${row.id}`
                : null;
            const emiSlip =
              row.kind !== "advance" && inv
                ? `/clients/${inv.id}/print/payment-demand?scheduleId=${row.id}`
                : null;
            return (
              <tr key={row.id}>
                <td data-label="Date">
                  {formatDisplayDate(row.paidAt || row.dueDate)}
                </td>
                <td data-label="Type">{row.kind}</td>
                <td data-label="Invoice">#{inv?.invoiceNo || "—"}</td>
                <td data-label="Description">{row.label}</td>
                <td data-label="Amount">₹{formatINR(row.amount)}</td>
                <td data-label="Status">
                  <span
                    className={`badge ${
                      row.paid ? "ok" : overdue ? "danger" : ""
                    }`}
                  >
                    {row.paid ? "Paid" : overdue ? "Overdue" : "Pending"}
                  </span>
                </td>
                <td data-label="Action">
                  <div className="row-actions">
                    {advanceSlip && (
                      <Link
                        to={advanceSlip}
                        className="btn btn-ghost"
                        style={{ color: "#0b1f14", borderColor: "#0b1f14" }}
                      >
                        Print adv
                      </Link>
                    )}
                    {emiSlip && (
                      <Link
                        to={emiSlip}
                        className="btn btn-ghost"
                        style={{ color: "#0b1f14", borderColor: "#0b1f14" }}
                      >
                        Demand
                      </Link>
                    )}
                    <button
                      type="button"
                      className="btn btn-dark"
                      onClick={() => onToggle(row)}
                    >
                      {row.paid ? "Undo" : "Mark paid"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
