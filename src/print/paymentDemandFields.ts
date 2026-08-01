/**
 * Field positions as % of A4 for Payment Demand Note — SCREEN PREVIEW.
 * Print positions are a separate copy in paymentDemandPrint.css
 * Background: /payment-demand-note.png
 */
import type { FieldSpec } from "./advancePaymentFields";

export const PAYMENT_DEMAND_FIELDS = {
  // TO line (client name) — left under "To,"
  clientName: {
    left: "12%",
    top: "37.5%",
    width: "48%",
    fontSize: 14,
    weight: 700,
  },
  // Address lines under name (3 template underlines ≈ 40.4 / 42.4 / 44.4%)
  clientAddress: {
    left: "12%",
    top: "40.2%",
    width: "48%",
    fontSize: 14,
    weight: 700,
  },
  // Date top-right
  date: {
    left: "68%",
    top: "37.5%",
    width: "24%",
    fontSize: 13,
    weight: 700,
  },

  // Four boxes: Invoice No | Invoice Date | Amount Due | Due Date
  invoiceNo: {
    left: "10%",
    top: "68.5%",
    width: "16%",
    fontSize: 12,
    weight: 500,
    align: "center" as const,
  },
  invoiceDate: {
    left: "30%",
    top: "68.5%",
    width: "16%",
    fontSize: 12,
    weight: 500,
    align: "center" as const,
  },
  amountDue: {
    left: "50%",
    top: "68.5%",
    width: "16%",
    fontSize: 13,
    weight: 600,
    align: "center" as const,
  },
  dueDate: {
    left: "72%",
    top: "68.5%",
    width: "18%",
    fontSize: 12,
    weight: 500,
    align: "center" as const,
  },
} satisfies Record<string, FieldSpec>;
