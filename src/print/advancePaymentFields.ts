/**
 * Field positions as % of A4 sheet for Advance Payment Demand template.
 * Background: /advance-payment-demand.jpg
 */
export const ADVANCE_PAYMENT_FIELDS = {
  noteNo: { left: "34%", top: "31.6%", width: "20%", fontSize: 13, weight: 700 },
  date: { left: "66%", top: "31.9%", width: "22%", fontSize: 13, weight: 700 },

  clientName: { left: "33%", top: "36.8%", width: "40%", fontSize: 13, weight: 700 },
  projectName: { left: "33%", top: "40.1%", width: "60%", fontSize: 13, weight: 600 },
  projectLocation: {
    left: "33%",
    top: "44%",
    width: "60%",
    fontSize: 11,
    weight: 600,
  },

  amountDue: {
    left: "19%",
    top: "52.8%",
    width: "30%",
    fontSize: 17,
    weight: 800,
    color: "#ffffff",
    align: "left" as const,
  },
  dueDate: { left: "66.9%", top: "52.7%", width: "22%", fontSize: 14, weight: 700 },

  // BANK DETAILS — measured from advance-payment-demand.jpg (1054×1492)
  accountName: {
    left: "26%",
    top: "61.05%",
    width: "38%",
    fontSize: 12,
    weight: 700,
  },
  bankName: {
    left: "26%",
    top: "64.15%",
    width: "38%",
    fontSize: 12,
    weight: 600,
  },
  accountNo: {
    left: "26%",
    top: "66.75%",
    width: "38%",
    fontSize: 12,
    weight: 600,
  },
  ifsc: {
    left: "26%",
    top: "69.1%",
    width: "40%",
    fontSize: 11,
    weight: 600,
  },
  upiId: {
    left: "26%",
    top: "71.4%",
    width: "38%",
    fontSize: 11,
    weight: 600,
  },
};

export type FieldSpec = {
  left: string;
  top: string;
  width: string;
  fontSize: number;
  weight?: number;
  color?: string;
  align?: "left" | "center" | "right";
};

export function formatSlashDate(value: string | null | undefined): string {
  if (!value) return "";
  const str = String(value);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]} / ${m[2]} / ${m[1]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")} / ${String(d.getMonth() + 1).padStart(2, "0")} / ${d.getFullYear()}`;
}

export function formatAmount(n: number | null | undefined): string {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

/** True when advance was taken on the same calendar day as the invoice. */
export function isSameDayAdvance(
  invoiceCreatedAt: string | null | undefined,
  advanceDate: string | null | undefined,
  advanceAmount: number | null | undefined
): boolean {
  if (!advanceAmount || advanceAmount <= 0) return false;
  if (!advanceDate || !invoiceCreatedAt) return false;
  const invDay = String(invoiceCreatedAt).slice(0, 10);
  const advDay = String(advanceDate).slice(0, 10);
  return invDay === advDay;
}
