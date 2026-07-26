import { useMemo, type ReactNode } from "react";
import { BRAND } from "../lib/brand";
import type { Invoice } from "../lib/types";
import {
  ADVANCE_PAYMENT_FIELDS as F,
  formatAmount,
  formatSlashDate,
  type FieldSpec,
} from "./advancePaymentFields";

const BG = "/advance-payment-demand.jpg";
const CREAM = "#f6f0e8";

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
        lineHeight: 1.15,
        fontFamily: "Helvetica, Arial, sans-serif",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        background: cover ? CREAM : "transparent",
        padding: cover ? "1px 4px 2px" : 0,
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}

type Props = {
  invoice: Invoice;
  amountDue?: number;
  dueDate?: string | null;
};

/** Advance Payment Demand — JPEG template + invoice/bank text overlay. */
export function PdfAdvancePaymentDemand({
  invoice,
  amountDue,
  dueDate,
}: Props) {
  const values = useMemo(() => {
    const invoiceDay = String(invoice.createdAt).slice(0, 10);
    const due =
      dueDate ||
      invoice.advanceDate ||
      invoice.oneTimeDueDate ||
      invoiceDay;
    const amount =
      amountDue != null ? amountDue : invoice.advanceAmount;
    return {
      noteNo: invoice.invoiceNo || "",
      date: formatSlashDate(invoiceDay),
      clientName: invoice.name || "",
      projectName: invoice.projectName || "",
      projectLocation: invoice.location || "",
      amountDue: formatAmount(amount),
      dueDate: formatSlashDate(due),
      accountName: BRAND.bank.accountName,
      bankName: BRAND.bank.bankName,
      accountNo: BRAND.bank.accountNo,
      // Keep IFSC short so it fits the line
      ifsc: BRAND.bank.ifsc.replace(/\s*\(.*\)\s*$/, "").trim(),
    };
  }, [invoice, amountDue, dueDate]);

  return (
    <div className="print-page pdn-sheet-wrap">
      <div className="pdn-sheet" id="advance-payment-print-root">
        <img className="pdn-sheet__bg" src={BG} alt="" draggable={false} />
        <Field spec={F.noteNo} cover>
          {values.noteNo}
        </Field>
        <Field spec={F.date} cover>
          {values.date}
        </Field>
        <Field spec={F.clientName}>{values.clientName}</Field>
        <Field spec={F.projectName}>{values.projectName}</Field>
        <Field spec={F.projectLocation}>{values.projectLocation}</Field>
        <Field spec={F.amountDue}>{values.amountDue}</Field>
        <Field spec={F.dueDate} cover>
          {values.dueDate}
        </Field>
        <Field spec={F.accountName} cover>
          {values.accountName}
        </Field>
        <Field spec={F.bankName} cover>
          {values.bankName}
        </Field>
        <Field spec={F.accountNo} cover>
          {values.accountNo}
        </Field>
        <Field spec={F.ifsc} cover>
          {values.ifsc}
        </Field>
      </div>
    </div>
  );
}
