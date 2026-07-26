/**
 * Field positions as % of A4 for Payment Demand Note template.
 * Background: /payment-demand-note.jpg
 */
import type { FieldSpec } from "./advancePaymentFields";

export const PAYMENT_DEMAND_FIELDS: Record<string, FieldSpec> = {
  // TO line (client name) — left under "To,"
  clientName: {
    left: "12%",
    top: "37.5%",
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
    top: "62.5%",
    width: "16%",
    fontSize: 12,
    weight: 700,
    align: "center",
  },
  invoiceDate: {
    left: "30%",
    top: "62.5%",
    width: "16%",
    fontSize: 12,
    weight: 700,
    align: "center",
  },
  amountDue: {
    left: "50%",
    top: "62.5%",
    width: "16%",
    fontSize: 13,
    weight: 800,
    align: "center",
  },
  dueDate: {
    left: "70%",
    top: "62.5%",
    width: "18%",
    fontSize: 12,
    weight: 700,
    align: "center",
  },
};
