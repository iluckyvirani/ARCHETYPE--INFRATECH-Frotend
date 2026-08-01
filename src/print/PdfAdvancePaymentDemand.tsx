import { useMemo, type ReactNode } from "react";
import type { Invoice } from "../lib/types";
import {
  ADVANCE_PAYMENT_FIELDS as F,
  formatAmount,
  formatSlashDate,
  type FieldSpec,
} from "./advancePaymentFields";
import "./advancePaymentPrint.css";

const BG = "/advance-payment-demand.png";

type FieldKey = keyof typeof F;

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
  const withBg = name === "date" || name === "dueDate";
  const bgColor =
    name === "dueDate" ? "#00261a" : name === "date" ? "#f7f6f3" : "transparent";
  return (
    <div
      className={`pdn-field apd-field apd-field--${name}`}
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
        background: withBg ? bgColor : "transparent",
        padding: withBg ? "2px 6px" : 0,
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
  amountDue?: number;
  dueDate?: string | null;
};

/** Advance Payment Demand — template image has bank details; overlay client/amount only. */
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
    };
  }, [invoice, amountDue, dueDate]);

  return (
    <div className="print-page pdn-sheet-wrap">
      <div className="pdn-sheet" id="advance-payment-print-root">
        <img className="pdn-sheet__bg" src={BG} alt="" draggable={false} />
        <Field name="noteNo" spec={F.noteNo}>
          {values.noteNo}
        </Field>
        <Field name="date" spec={F.date}>
          {values.date}
        </Field>
        <Field name="clientName" spec={F.clientName}>
          {values.clientName}
        </Field>
        <Field name="projectName" spec={F.projectName}>
          {values.projectName}
        </Field>
        <Field name="projectLocation" spec={F.projectLocation}>
          {values.projectLocation}
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
