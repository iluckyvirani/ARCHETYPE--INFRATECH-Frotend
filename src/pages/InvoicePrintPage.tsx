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
          <img
            src="/bill-format.jpg"
            alt=""
            className="inv-letterhead-bg"
            aria-hidden
          />
          <div className="inv-letterhead-body">
            <header className="inv-doc-title">
              <span>Tax Invoice</span>
              <strong>#{client.invoiceNo}</strong>
            </header>

            <div className="inv-meta">
              <div className="inv-panel">
                <p className="inv-label">Bill to</p>
                <p className="inv-client-name">{client.name}</p>
                <div className="inv-fields">
                  <div className="inv-field">
                    <span>Project</span>
                    <strong>{client.projectName}</strong>
                  </div>
                  <div className="inv-field">
                    <span>Address</span>
                    <strong>{client.location}</strong>
                  </div>
                </div>
              </div>

              <div className="inv-panel">
                <div className="inv-date-row">
                  <p className="inv-label">Invoice date</p>
                  <p className="inv-date">
                    {formatDisplayDate(client.createdAt.slice(0, 10))}
                  </p>
                </div>
                <p className="inv-label inv-label--spaced">Bank details</p>
                <div className="inv-bank-grid">
                  <div className="inv-field">
                    <span>A/C name</span>
                    <strong>{BRAND.bank.accountName}</strong>
                  </div>
                  <div className="inv-field">
                    <span>A/C no.</span>
                    <strong>{BRAND.bank.accountNo}</strong>
                  </div>
                  <div className="inv-field">
                    <span>Bank</span>
                    <strong>{BRAND.bank.bankName}</strong>
                  </div>
                  <div className="inv-field">
                    <span>Branch</span>
                    <strong>{BRAND.bank.branch}</strong>
                  </div>
                  <div className="inv-field">
                    <span>IFSC</span>
                    <strong>
                      {BRAND.bank.ifsc.replace(/\s*\(.*\)\s*$/, "").trim()}
                    </strong>
                  </div>
                  <div className="inv-field">
                    <span>MSME</span>
                    <strong>{BRAND.bank.msme}</strong>
                  </div>
                </div>
              </div>
            </div>

            {showProjectTable && (
              <section className="inv-section">
                <div className="inv-section-head">
                  <span>Project fees</span>
                  {client.costPerSqft != null && (
                    <em>₹{formatINR(client.costPerSqft)} / sqft</em>
                  )}
                </div>
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th className="inv-col-no">No.</th>
                      <th className="inv-col-part">Particulars</th>
                      <th className="inv-col-num">Area</th>
                      <th className="inv-col-num">Fees / sqft</th>
                      <th className="inv-col-amt">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="inv-col-no">1</td>
                      <td className="inv-col-part">
                        <strong>Project area</strong>
                        <span>{client.projectName}</span>
                      </td>
                      <td className="inv-col-num">{client.areaSqft ?? "—"}</td>
                      <td className="inv-col-num">
                        {client.costPerSqft != null
                          ? formatINR(client.costPerSqft)
                          : "—"}
                      </td>
                      <td className="inv-col-amt">
                        ₹{formatINR(client.projectCost)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>
            )}

            <section className="inv-section">
              <div className="inv-section-head">
                <span>Payment summary</span>
              </div>
              <table className="inv-table inv-table--summary">
                <tbody>
                  <tr>
                    <td>
                      {client.visitIncluded
                        ? "Total fees (visit included)"
                        : "Total fees"}
                    </td>
                    <td className="inv-col-amt">
                      ₹{formatINR(client.feeAmount)}
                    </td>
                  </tr>
                  {(client.additionalWorks || []).map((work, i) => (
                    <tr key={i}>
                      <td>{work.name}</td>
                      <td className="inv-col-amt">
                        ₹{formatINR(work.qty * work.rate)}
                      </td>
                    </tr>
                  ))}
                  {!client.visitIncluded && (client.visitFee || 0) > 0 && (
                    <tr>
                      <td>Visit fee</td>
                      <td className="inv-col-amt">
                        ₹{formatINR(client.visitFee)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>Received</td>
                    <td className="inv-col-amt">
                      ₹{formatINR(receivedAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="inv-payable">
                <span>Amount payable</span>
                <strong>₹{formatINR(totalDue)}</strong>
              </div>
            </section>

            {(advanceRows.length > 0 || paymentRows.length > 0) && (
              <section className="inv-section">
                <div className="inv-section-head">
                  <span>{planSectionTitle(client.paymentPlan)}</span>
                </div>
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th className="inv-col-no">No.</th>
                      <th className="inv-col-part">Particulars</th>
                      <th className="inv-col-num">Due date</th>
                      <th className="inv-col-amt">Amount</th>
                      <th className="inv-col-status">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advanceRows.map((row, i) => (
                      <tr key={row.id}>
                        <td className="inv-col-no">{i + 1}</td>
                        <td className="inv-col-part">{row.label}</td>
                        <td className="inv-col-num">
                          {formatDisplayDate(row.dueDate)}
                        </td>
                        <td className="inv-col-amt">
                          ₹{formatINR(row.amount)}
                        </td>
                        <td className="inv-col-status">
                          <span
                            className={
                              row.paid ? "inv-status inv-status--paid" : "inv-status"
                            }
                          >
                            {row.paid ? "Paid" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {paymentRows.map((row, i) => (
                      <tr key={row.id}>
                        <td className="inv-col-no">
                          {advanceRows.length + i + 1}
                        </td>
                        <td className="inv-col-part">
                          {client.paymentPlan === "one_time"
                            ? "Full balance payment"
                            : row.label}
                        </td>
                        <td className="inv-col-num">
                          {formatDisplayDate(row.dueDate)}
                        </td>
                        <td className="inv-col-amt">
                          ₹{formatINR(row.amount)}
                        </td>
                        <td className="inv-col-status">
                          <span
                            className={
                              row.paid ? "inv-status inv-status--paid" : "inv-status"
                            }
                          >
                            {row.paid ? "Paid" : "Pending"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            <footer className="inv-footer">
              <div className="inv-panel inv-terms">
                <p className="inv-label">Terms &amp; conditions</p>
                <ol>
                  {BRAND.terms.slice(0, 2).map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              </div>
              <div className="inv-panel inv-sign">
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
