import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BRAND } from "../lib/brand";
import { formatDisplayDate, formatINR } from "../lib/calc";
import { getClient } from "../lib/store";
import type { Client, ScheduleItem } from "../lib/types";
import { formatWorkTypes } from "../lib/workTypes";
import {
  billPrintKindFromRoute,
  buildBillFileName,
  printBillAsPdf,
  setBillDocumentTitle,
} from "../lib/printBill";
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

function LetterheadShell({ children }: { children: ReactNode }) {
  return (
    <article className="invoice-page invoice-page--letterhead">
      <img
        src="/bill-format.jpg"
        alt=""
        className="inv-letterhead-bg"
        aria-hidden
      />
      <div className="inv-letterhead-body">{children}</div>
    </article>
  );
}

function ScheduleTable({
  client,
  advanceRows,
  paymentRows,
}: {
  client: Client;
  advanceRows: ScheduleItem[];
  paymentRows: ScheduleItem[];
}) {
  return (
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
              <td className="inv-col-num">{formatDisplayDate(row.dueDate)}</td>
              <td className="inv-col-amt">₹{formatINR(row.amount)}</td>
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
              <td className="inv-col-no">{advanceRows.length + i + 1}</td>
              <td className="inv-col-part">
                {client.paymentPlan === "one_time"
                  ? "Full balance payment"
                  : row.label}
              </td>
              <td className="inv-col-num">{formatDisplayDate(row.dueDate)}</td>
              <td className="inv-col-amt">₹{formatINR(row.amount)}</td>
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
  );
}

export function InvoicePrintPage() {
  const { id, type: typeParam } = useParams();
  const [search] = useSearchParams();
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

  const scheduleRow = useMemo(() => {
    if (!scheduleId) return null;
    return schedule.find((s) => s.id === scheduleId) || null;
  }, [schedule, scheduleId]);

  const billFileBase = useMemo(() => {
    if (!client) return "bill";
    const isQuotation = client.documentType === "quotation";
    const kind = isQuotation
      ? ("quotation" as const)
      : billPrintKindFromRoute(printType);
    const date =
      (scheduleRow?.dueDate && kind !== "invoice" && kind !== "quotation"
        ? scheduleRow.dueDate
        : null) || client.createdAt.slice(0, 10);
    return buildBillFileName({
      clientName: client.name,
      date,
      kind,
      invoiceNo: isQuotation ? undefined : client.invoiceNo,
    });
  }, [client, printType, scheduleRow]);

  useEffect(() => {
    if (!client || billFileBase === "bill") return;
    return setBillDocumentTitle(billFileBase);
  }, [client, billFileBase]);

  useEffect(() => {
    if (!client) return;
    if (search.get("autoprint") !== "1") return;
    const t = window.setTimeout(() => printBillAsPdf(billFileBase), 700);
    return () => window.clearTimeout(t);
  }, [client, search, billFileBase]);

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

  if (error) {
    return (
      <div className="print-loading print-loading--error">
        <img src="/logo.png" alt="" className="print-loading__logo" />
        <p className="print-loading__title">Couldn’t open bill</p>
        <p className="print-loading__text">{error}</p>
        <Link to="/clients" className="btn btn-primary print-loading__btn">
          Back to clients
        </Link>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="print-loading" aria-busy="true" aria-label="Loading bill">
        <img src="/logo.png" alt="" className="print-loading__logo" />
        <div className="print-loading__spinner" aria-hidden />
        <p className="print-loading__title">Preparing bill</p>
        <p className="print-loading__text">Loading invoice preview…</p>
        <Link to="/clients" className="btn btn-ghost print-loading__btn">
          ← Back
        </Link>
      </div>
    );
  }

  const isQuotation = client.documentType === "quotation";

  const invoiceDay = client.createdAt.slice(0, 10);
  const advanceDay = client.advanceDate
    ? String(client.advanceDate).slice(0, 10)
    : null;
  const advanceAmt = isQuotation ? 0 : Number(client.advanceAmount) || 0;
  const advanceIsFuture =
    advanceAmt > 0 && !!advanceDay && advanceDay > invoiceDay;
  const advanceLabel =
    !isQuotation && advanceAmt > 0
      ? advanceIsFuture
        ? `Advance to be paid (${formatDisplayDate(advanceDay!)})`
        : "Advance Received"
      : null;

  const paidInstallments = isQuotation
    ? 0
    : schedule
        .filter((s) => s.kind !== "advance" && s.paid)
        .reduce((s, r) => s + r.amount, 0);
  // Future advance is not counted as received yet
  const receivedAmount =
    (advanceIsFuture ? 0 : advanceAmt) + paidInstallments;

  const additionalTotal = (client.additionalWorks || []).reduce(
    (s, w) => s + w.qty * w.rate,
    0
  );
  // Visit charge is never part of invoice total — note only
  const invoiceTotal =
    Math.round((client.feeAmount + additionalTotal) * 100) / 100;
  const totalDue = isQuotation
    ? invoiceTotal
    : Math.max(0, invoiceTotal - receivedAmount);
  const showProjectTable =
    client.feeMode === "percentage" || client.feeMode === "area_sqft";

  const hasSchedule =
    !isQuotation && (advanceRows.length > 0 || paymentRows.length > 0);
  const scheduleOnSecondPage =
    hasSchedule &&
    (client.paymentPlan === "installment" || client.paymentPlan === "stage");

  const visitNote = client.visitIncluded
    ? "Per visit charge already included"
    : (client.visitFee || 0) > 0
      ? `Per visit charge — ₹${formatINR(client.visitFee)}`
      : null;

  const slipTitle =
    printType === "advance-demand"
      ? "Advance Payment Demand"
      : printType === "payment-demand"
        ? "Payment Demand Note"
        : isQuotation
          ? "Quotation"
          : `Invoice · ${client.invoiceNo}`;

  const hasAdvanceSlip =
    !isQuotation &&
    printType === "invoice" &&
    Number(client.advanceAmount) > 0;

  return (
    <div className="invoice-wrap print-shell">
      <div className="print-toolbar no-print">
        <div className="print-toolbar__title">
          <strong>Print preview</strong>
          <span>{slipTitle}</span>
        </div>
        <div className="print-toolbar__actions">
          <Link
            to={`/clients/${client.groupId || client.id}`}
            className="print-btn print-btn--ghost"
          >
            ← Back
          </Link>
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
            onClick={() => printBillAsPdf(billFileBase)}
          >
            Print / Save PDF
          </button>
        </div>
      </div>
      <p className="print-hint no-print">
        PDF file name: <strong>{billFileBase}.pdf</strong>
        <br />
        Print → Destination <strong>Save as PDF</strong> · Paper size{" "}
        <strong>A4</strong> · Margins <strong>None</strong> · enable background
        graphics.
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
        <>
          <LetterheadShell>
            <header className="inv-doc-title">
              <span>{isQuotation ? "Quotation" : "Tax Invoice"}</span>
              {!isQuotation && <strong>#{client.invoiceNo}</strong>}
            </header>

            <div className="inv-meta">
              <div className="inv-panel">
                <p className="inv-label">Bill to</p>
                <p className="inv-client-name">{client.name}</p>
                <div className="inv-fields">
                  <div className="inv-field">
                    <span>Address</span>
                    <strong>{client.location}</strong>
                  </div>
                  <div className="inv-field">
                    <span>Project</span>
                    <strong>{client.projectName}</strong>
                  </div>
                  <div className="inv-field">
                    <span>Working</span>
                    <strong>
                      {formatWorkTypes(client.workTypes, client.workTypeCustom)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="inv-panel">
                <div className="inv-date-row">
                  <p className="inv-label">
                    {isQuotation ? "Quotation date" : "Invoice date"}
                  </p>
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
                    <strong>{BRAND.bank.ifsc}</strong>
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
                  {(client.floors || []).length === 0 &&
                    client.costPerSqft != null && (
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
                    {(client.floors || []).length > 0 ? (
                      <>
                        {client.floors.map((floor, i) => {
                          const line =
                            Math.round(
                              floor.areaSqft * floor.costPerSqft * 100
                            ) / 100;
                          return (
                            <tr key={`${floor.label}-${i}`}>
                              <td className="inv-col-no">{i + 1}</td>
                              <td className="inv-col-part">
                                <strong>{floor.label}</strong>
                                <span>{client.projectName}</span>
                              </td>
                              <td className="inv-col-num">{floor.areaSqft}</td>
                              <td className="inv-col-num">
                                {formatINR(floor.costPerSqft)}
                              </td>
                              <td className="inv-col-amt">
                                ₹{formatINR(line)}
                              </td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td className="inv-col-no" />
                          <td className="inv-col-part">
                            <strong>Total project area</strong>
                          </td>
                          <td className="inv-col-num">
                            {client.areaSqft ?? "—"}
                          </td>
                          <td className="inv-col-num">—</td>
                          <td className="inv-col-amt">
                            ₹{formatINR(client.projectCost)}
                          </td>
                        </tr>
                      </>
                    ) : (
                      <tr>
                        <td className="inv-col-no">1</td>
                        <td className="inv-col-part">
                          <strong>Project area</strong>
                          <span>{client.projectName}</span>
                        </td>
                        <td className="inv-col-num">
                          {client.areaSqft ?? "—"}
                        </td>
                        <td className="inv-col-num">
                          {client.costPerSqft != null
                            ? formatINR(client.costPerSqft)
                            : "—"}
                        </td>
                        <td className="inv-col-amt">
                          ₹{formatINR(client.projectCost)}
                        </td>
                      </tr>
                    )}
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
                    <td>Total fees</td>
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
                  {advanceLabel && (
                    <tr>
                      <td>{advanceLabel}</td>
                      <td className="inv-col-amt">
                        ₹{formatINR(advanceAmt)}
                      </td>
                    </tr>
                  )}
                  {paidInstallments > 0 && (
                    <tr>
                      <td>Received (installments)</td>
                      <td className="inv-col-amt">
                        ₹{formatINR(paidInstallments)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="inv-payable">
                <span>{isQuotation ? "Quoted amount" : "Amount payable"}</span>
                <strong>₹{formatINR(totalDue)}</strong>
              </div>
            </section>

            {!scheduleOnSecondPage && hasSchedule && (
              <ScheduleTable
                client={client}
                advanceRows={advanceRows}
                paymentRows={paymentRows}
              />
            )}

            <footer className="inv-footer">
              <div className="inv-panel inv-terms inv-terms--brief">
                <p className="inv-label">Note</p>
                {visitNote ? (
                  <p className="inv-visit-note" style={{ border: "none", margin: 0, padding: 0 }}>
                    {visitNote}
                  </p>
                ) : (
                  <p className="meta" style={{ margin: 0 }}>
                    Full terms &amp; conditions on next page.
                  </p>
                )}
                {visitNote && (
                  <p className="meta" style={{ margin: "0.35rem 0 0" }}>
                    Full terms &amp; conditions on next page.
                  </p>
                )}
              </div>
              <div className="inv-panel inv-sign">
                <p className="inv-label">Authorised signatory</p>
                <div className="inv-sign-line" />
                <p className="inv-sign-name">{BRAND.designer}</p>
              </div>
            </footer>
          </LetterheadShell>

          <div className="invoice-page-break">
            <LetterheadShell>
              <header className="inv-doc-title">
                <span>
                  {scheduleOnSecondPage
                    ? planSectionTitle(client.paymentPlan)
                    : "Terms & conditions"}
                </span>
                {!isQuotation && <strong>#{client.invoiceNo}</strong>}
              </header>
              <p className="inv-page2-meta">
                {client.name} · {client.projectName}
              </p>
              {scheduleOnSecondPage && (
                <ScheduleTable
                  client={client}
                  advanceRows={advanceRows}
                  paymentRows={paymentRows}
                />
              )}
              <section className="inv-section inv-terms-page">
                <div className="inv-section-head">
                  <span>Terms &amp; conditions</span>
                </div>
                <div className="inv-panel inv-terms inv-terms--full">
                  <ol>
                    {BRAND.terms.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ol>
                  {visitNote && (
                    <p className="inv-visit-note">{visitNote}</p>
                  )}
                </div>
              </section>
            </LetterheadShell>
          </div>
        </>
      )}
    </div>
  );
}
