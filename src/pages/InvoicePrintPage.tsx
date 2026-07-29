import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BRAND } from "../lib/brand";
import { formatDisplayDate, formatINR } from "../lib/calc";
import { getClient } from "../lib/store";
import type { Client, ScheduleItem } from "../lib/types";
import { PdfAdvancePaymentDemand } from "../print/PdfAdvancePaymentDemand";
import { PdfPaymentDemandNote } from "../print/PdfPaymentDemandNote";
import "../print/print.css";
import "./InvoicePrint.css";

type PrintType = "invoice" | "advance-demand" | "payment-demand";

function resolveType(raw: string | undefined): PrintType {
  if (raw === "advance-demand" || raw === "payment-demand") return raw;
  return "invoice";
}

function planSectionTitle(plan: Client["paymentPlan"]): string {
  if (plan === "installment") return "Installment schedule";
  if (plan === "stage") return "Stage payment schedule";
  if (plan === "one_time") return "Full payment";
  return "Payment schedule";
}

export function InvoicePrintPage() {
  const { id, type: typeParam } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const printType = resolveType(typeParam);
  const scheduleId = search.get("scheduleId");

  const [client, setClient] = useState<Client | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getClient(id).then((data) => {
      if (!data) setError("Client not found");
      else {
        setClient(data.client);
        setSchedule(data.schedule);
      }
    });
  }, [id]);

  useEffect(() => {
    if (!client) return;
    if (search.get("autoprint") !== "1") return;
    const t = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(t);
  }, [client, search, printType]);

  const scheduleRow = useMemo(() => {
    if (!scheduleId) return null;
    return schedule.find((s) => s.id === scheduleId) || null;
  }, [schedule, scheduleId]);

  const paymentRows = useMemo(
    () =>
      schedule
        .filter((s) => s.kind !== "advance")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [schedule]
  );

  const advanceRows = useMemo(
    () => schedule.filter((s) => s.kind === "advance"),
    [schedule]
  );

  if (error || !client) {
    return (
      <div className="invoice-page invoice-page--plain">
        <p>{error || "Loading…"}</p>
        <Link to="/clients">Back</Link>
      </div>
    );
  }

  const receivedAmount =
    client.advanceAmount +
    schedule
      .filter((s) => s.kind !== "advance" && s.paid)
      .reduce((s, r) => s + r.amount, 0);

  const totalDue = Math.max(0, client.totalBill - receivedAmount);
  const showProjectTable =
    client.feeMode === "percentage" || client.feeMode === "area_sqft";

  const slipTitle =
    printType === "advance-demand"
      ? "Advance Payment Demand"
      : printType === "payment-demand"
        ? "Payment Demand Note"
        : `Invoice · ${client.invoiceNo}`;

  const hasAdvanceSlip =
    printType === "invoice" && Number(client.advanceAmount) > 0;

  return (
    <div className="invoice-wrap print-shell">
      <div className="print-toolbar no-print">
        <div className="print-toolbar__title">
          <strong>Print preview</strong>
          <span>{slipTitle}</span>
        </div>
        <div className="print-toolbar__actions">
          <button
            type="button"
            className="print-btn print-btn--ghost"
            onClick={() => navigate(-1)}
          >
            ← Back
          </button>
          {hasAdvanceSlip && (
            <Link
              to={`/clients/${client.id}/print/advance-demand`}
              className="print-btn print-btn--ghost"
            >
              Adv slip
            </Link>
          )}
          {printType === "advance-demand" && (
            <Link
              to={`/clients/${client.id}/print`}
              className="print-btn print-btn--ghost"
            >
              Invoice
            </Link>
          )}
          <button
            type="button"
            className="print-btn print-btn--primary"
            onClick={() => window.print()}
          >
            Print / Save PDF
          </button>
        </div>
      </div>
      <p className="print-hint no-print">
        Letterhead background — set Margins to <strong>None</strong> and enable
        background graphics.
      </p>

      {printType === "advance-demand" && (
        <PdfAdvancePaymentDemand
          invoice={client}
          amountDue={scheduleRow?.amount}
          dueDate={scheduleRow?.dueDate || client.advanceDate}
        />
      )}

      {printType === "payment-demand" && (
        <PdfPaymentDemandNote
          invoice={client}
          amountDue={scheduleRow?.amount}
          dueDate={scheduleRow?.dueDate}
        />
      )}

      {printType === "invoice" && (
        <article className="invoice-page invoice-page--letterhead">
          <div className="inv-letterhead-body">
            <div className="inv-doc-title">
              <span>TAX INVOICE</span>
              <strong>#{client.invoiceNo}</strong>
            </div>

            <div className="inv-meta">
              <div className="inv-billto">
                <p className="inv-label">Bill to</p>
                <p className="inv-client-name">{client.name}</p>
                <p>
                  <span className="inv-muted">Project</span> {client.projectName}
                </p>
                <p>
                  <span className="inv-muted">Address</span> {client.location}
                </p>
              </div>
              <div className="inv-bank">
                <p className="inv-label">Invoice date</p>
                <p className="inv-date">
                  {formatDisplayDate(client.createdAt.slice(0, 10))}
                </p>
                <p className="inv-label" style={{ marginTop: "0.35rem" }}>
                  Bank details
                </p>
                <div className="inv-bank-grid">
                  <p>
                    <span className="inv-muted">A/C name</span>
                    {BRAND.bank.accountName}
                  </p>
                  <p>
                    <span className="inv-muted">A/C no.</span>
                    {BRAND.bank.accountNo}
                  </p>
                  <p>
                    <span className="inv-muted">Bank</span>
                    {BRAND.bank.bankName}
                  </p>
                  <p>
                    <span className="inv-muted">Branch</span>
                    {BRAND.bank.branch}
                  </p>
                  <p>
                    <span className="inv-muted">IFSC</span>
                    {BRAND.bank.ifsc.replace(/\s*\(.*\)\s*$/, "").trim()}
                  </p>
                  <p>
                    <span className="inv-muted">MSME</span>
                    {BRAND.bank.msme}
                  </p>
                </div>
              </div>
            </div>

            {showProjectTable && (
              <section className="inv-section">
                <div className="inv-banner">
                  Complete project fees
                  {client.costPerSqft
                    ? ` — ₹${formatINR(client.costPerSqft)} / sqft`
                    : ""}
                </div>
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Particulars</th>
                      <th>Area sqft</th>
                      <th>Fees / sqft</th>
                      <th>Total fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>1</td>
                      <td className="inv-particulars">
                        <strong>Project area</strong>
                        <span>{client.projectName}</span>
                      </td>
                      <td>{client.areaSqft ?? "—"}</td>
                      <td>
                        {client.costPerSqft != null
                          ? formatINR(client.costPerSqft)
                          : "—"}
                      </td>
                      <td>{formatINR(client.projectCost)}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="inv-subtotal inv-subtotal--end">
                  <strong>₹{formatINR(client.projectCost)}</strong>
                </div>
              </section>
            )}

            <section className="inv-section">
              <table className="inv-table fees">
                <thead>
                  <tr>
                    <th>Particulars</th>
                    <th>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="inv-particulars">
                      <strong>
                        {client.visitIncluded
                          ? "Total fees (visit included)"
                          : "Total fees"}
                      </strong>
                    </td>
                    <td>{formatINR(client.feeAmount)}</td>
                  </tr>
                  {(client.additionalWorks || []).map((work, i) => (
                    <tr key={i}>
                      <td className="inv-particulars">{work.name}</td>
                      <td>{formatINR(work.qty * work.rate)}</td>
                    </tr>
                  ))}
                  {!client.visitIncluded && (client.visitFee || 0) > 0 && (
                    <tr>
                      <td className="inv-particulars">Visit fee</td>
                      <td>{formatINR(client.visitFee)}</td>
                    </tr>
                  )}
                  {client.visitIncluded && (
                    <tr>
                      <td className="inv-particulars">Visit</td>
                      <td>Included</td>
                    </tr>
                  )}
                  <tr>
                    <td className="inv-particulars">
                      <strong>Total received amount</strong>
                    </td>
                    <td>{formatINR(receivedAmount)}</td>
                  </tr>
                  <tr className="due-row">
                    <td>Total due</td>
                    <td>₹{formatINR(totalDue)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="inv-grand">
                <span>Amount payable</span>
                <strong>₹{formatINR(totalDue)}</strong>
              </div>
            </section>

            {(advanceRows.length > 0 || paymentRows.length > 0) && (
              <section className="inv-section">
                <div className="inv-banner">
                  {planSectionTitle(client.paymentPlan)}
                </div>
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Particulars</th>
                      <th>Due date</th>
                      <th>Amount (₹)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advanceRows.map((row, i) => (
                      <tr key={row.id}>
                        <td>{i + 1}</td>
                        <td className="inv-particulars">
                          <strong>{row.label}</strong>
                        </td>
                        <td>{formatDisplayDate(row.dueDate)}</td>
                        <td>{formatINR(row.amount)}</td>
                        <td>{row.paid ? "Paid" : "Pending"}</td>
                      </tr>
                    ))}
                    {paymentRows.map((row, i) => (
                      <tr key={row.id}>
                        <td>{advanceRows.length + i + 1}</td>
                        <td className="inv-particulars">
                          <strong>
                            {client.paymentPlan === "one_time"
                              ? "Full balance payment"
                              : row.label}
                          </strong>
                        </td>
                        <td>{formatDisplayDate(row.dueDate)}</td>
                        <td>{formatINR(row.amount)}</td>
                        <td>{row.paid ? "Paid" : "Pending"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <footer className="inv-footer inv-footer--letterhead">
              <div className="inv-terms">
                <strong>Terms and conditions</strong>
                <ol>
                  {BRAND.terms.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              </div>
              <div className="inv-sign">
                <p className="inv-label">Authorised signatory</p>
                <div className="inv-sign-line" />
                <p className="inv-sign-name">{BRAND.designer}</p>
              </div>
            </footer>
          </div>
        </article>
      )}
    </div>
  );
}
