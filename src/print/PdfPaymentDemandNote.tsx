import { useMemo, type ReactNode } from "react";
import type { Invoice } from "../lib/types";
import {
  formatAmount,
  formatSlashDate,
  type FieldSpec,
} from "./advancePaymentFields";
import { PAYMENT_DEMAND_FIELDS as F } from "./paymentDemandFields";
import "./paymentDemandPrint.css";

const BG = "/payment-demand-note.png";
const DATE_BG = "#faf6f3";

type FieldKey = keyof typeof F;

/** Only date fields get a background (covers template underlines). */
const DATE_FIELDS = new Set<FieldKey>(["date", "invoiceDate", "dueDate"]);

function Field({
  name,
  spec,
  children,
}: {
  name: FieldKey;
  spec: FieldSpec;
  children?: ReactNode;
}) {
  if (!children) return null;
  const withBg = DATE_FIELDS.has(name);
  return (
    <div
      className={`pdn-field pdn-note-field pdn-note-field--${name}`}
      style={{
        position: "absolute",
        left: spec.left,
        top: spec.top,
        width: spec.width,
        fontSize: spec.fontSize,
        fontWeight: spec.weight || 600,
        textAlign: spec.align || "left",
        color: spec.color || "#1a1a1a",
        lineHeight: 1.25,
        fontFamily: "Helvetica, Arial, sans-serif",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        background: withBg ? DATE_BG : "transparent",
        padding: withBg ? "2px 4px" : 0,
        borderRadius: withBg ? 4 : 0,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

type Props = {
  invoice: Invoice;
  /** EMI / installment row amount; falls back to invoice balance */
  amountDue?: number;
  /** Schedule due date; falls back to oneTimeDueDate / today */
  dueDate?: string | null;
};

/** Payment Demand Note — template image + invoice/EMI text overlay. */
export function PdfPaymentDemandNote({
  invoice,
  amountDue,
  dueDate,
}: Props) {
  const values = useMemo(() => {
    const invoiceDay = invoice.createdAt.slice(0, 10);
    const due = dueDate || invoice.oneTimeDueDate || invoiceDay;
    const amount =
      amountDue != null
        ? amountDue
        : invoice.balance > 0
          ? invoice.balance
          : invoice.totalBill;
    return {
      clientName: invoice.name || "",
      clientAddress: invoice.location || "",
      date: formatSlashDate(new Date().toISOString().slice(0, 10)),
      invoiceNo: invoice.invoiceNo || "",
      invoiceDate: formatSlashDate(invoiceDay),
      amountDue: formatAmount(amount),
      dueDate: formatSlashDate(due),
    };
  }, [invoice, amountDue, dueDate]);

  return (
    <div className="print-page pdn-sheet-wrap">
      <div className="pdn-sheet" id="payment-demand-print-root">
        <img className="pdn-sheet__bg" src={BG} alt="" draggable={false} />
        <Field name="clientName" spec={F.clientName}>
          {values.clientName}
        </Field>
        <Field name="clientAddress" spec={F.clientAddress}>
          {values.clientAddress}
        </Field>
        <Field name="date" spec={F.date}>
          {values.date}
        </Field>
        <Field name="invoiceNo" spec={F.invoiceNo}>
          {values.invoiceNo}
        </Field>
        <Field name="invoiceDate" spec={F.invoiceDate}>
          {values.invoiceDate}
        </Field>
        <Field name="amountDue" spec={F.amountDue}>
          {values.amountDue}
        </Field>
        <Field name="dueDate" spec={F.dueDate}>
          {values.dueDate}
        </Field>
      </div>
    </div>
  );
}
