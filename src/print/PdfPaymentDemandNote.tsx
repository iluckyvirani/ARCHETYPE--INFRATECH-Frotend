import { useMemo, type ReactNode } from "react";
import type { Invoice } from "../lib/types";
import {
  formatAmount,
  formatSlashDate,
  type FieldSpec,
} from "./advancePaymentFields";
import { PAYMENT_DEMAND_FIELDS as F } from "./paymentDemandFields";

const BG = "/payment-demand-note.jpg";
const CREAM = "#faf6f3";

function Field({
  spec,
  children,
  cover,
}: {
  spec: FieldSpec;
  children?: ReactNode;
  cover?: boolean;
}) {
  if (!children) return null;
  return (
    <div
      className="pdn-field"
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
        background: cover ? CREAM : "transparent",
        padding: cover ? "2px 4px" : 0,
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

/** Payment Demand Note — JPEG template + invoice/EMI text overlay. */
export function PdfPaymentDemandNote({
  invoice,
  amountDue,
  dueDate,
}: Props) {
  const values = useMemo(() => {
    const invoiceDay = invoice.createdAt.slice(0, 10);
    const due =
      dueDate || invoice.oneTimeDueDate || invoiceDay;
    const amount =
      amountDue != null
        ? amountDue
        : invoice.balance > 0
          ? invoice.balance
          : invoice.totalBill;
    return {
      clientName: invoice.name || "",
      date: formatSlashDate(new Date().toISOString().slice(0, 10)),
      invoiceNo: invoice.invoiceNo || "",
      invoiceDate: formatSlashDate(invoiceDay),
      amountDue: `₹${formatAmount(amount)}`,
      dueDate: formatSlashDate(due),
    };
  }, [invoice, amountDue, dueDate]);

  return (
    <div className="print-page pdn-sheet-wrap">
      <div className="pdn-sheet" id="payment-demand-print-root">
        <img className="pdn-sheet__bg" src={BG} alt="" draggable={false} />
        <Field spec={F.clientName}>{values.clientName}</Field>
        <Field spec={F.date} cover>
          {values.date}
        </Field>
        <Field spec={F.invoiceNo} cover>
          {values.invoiceNo}
        </Field>
        <Field spec={F.invoiceDate} cover>
          {values.invoiceDate}
        </Field>
        <Field spec={F.amountDue} cover>
          {values.amountDue}
        </Field>
        <Field spec={F.dueDate} cover>
          {values.dueDate}
        </Field>
      </div>
    </div>
  );
}
