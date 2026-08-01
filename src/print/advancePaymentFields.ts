/**
 * Field positions as % of A4 for Advance Payment Demand — SCREEN PREVIEW.
 * Print positions are a separate copy in advancePaymentPrint.css
 * Background: /advance-payment-demand.png (1023×1537)
 */
export const ADVANCE_PAYMENT_FIELDS = {
  // Top card — DEMAND NOTE NO. | DATE
  noteNo: {
    left: "34%",
    top: "30.2%",
    width: "16%",
    fontSize: 12,
    weight: 500,
  },
  date: {
    left: "71%",
    top: "30.7%",
    width: "28%",
    fontSize: 12,
    weight: 500,
  },

  // Middle card — sit just above underlines
  clientName: {
    left: "38%",
    top: "36.3%",
    width: "50%",
    fontSize: 12,
    weight: 500,
  },
  projectName: {
    left: "38%",
    top: "39.7%",
    width: "50%",
    fontSize: 12,
    weight: 500,
  },
  projectLocation: {
    left: "38%",
    top: "43%",
    width: "50%",
    fontSize: 12,
    weight: 500,
  },

  // Green bar — clear of ₹ icon (icon ends ~20–28%); value under label
  amountDue: {
    left: "32%",
    top: "53.3%",
    width: "26%",
    fontSize: 15,
    weight: 700,
    color: "#f6f0e8",
    align: "left" as const,
  },
  dueDate: {
    left: "70%",
    top: "52.6%",
    width: "24%",
    fontSize: 12,
    weight: 600,
    color: "#f6f0e8",
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
  /** Background when field uses cover (e.g. white box on green bar) */
  coverColor?: string;
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
