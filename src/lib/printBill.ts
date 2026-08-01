/** Build a safe PDF / print filename and trigger A4 print. */

export type BillPrintKind =
  | "invoice"
  | "quotation"
  | "advance-slip"
  | "demand-payment";

export const DEFAULT_APP_TITLE = "Archetive Infratech — Billing";

const TYPE_LABEL: Record<BillPrintKind, string> = {
  invoice: "invoice",
  quotation: "quotation",
  "advance-slip": "advance",
  "demand-payment": "demand",
};

export function billPrintKindFromRoute(
  type: string | undefined
): BillPrintKind {
  if (type === "advance-demand") return "advance-slip";
  if (type === "payment-demand") return "demand-payment";
  return "invoice";
}

/** Sanitize for Save-as-PDF default filename */
export function slugFilePart(value: string): string {
  return (
    String(value || "")
      .trim()
      .replace(/[^\w\u0900-\u097F]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "bill"
  );
}

/** Prefer YYYY-MM-DD for filenames */
export function fileDatePart(isoOrDisplay: string): string {
  const raw = String(isoOrDisplay || "").trim();
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const dmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return new Date().toISOString().slice(0, 10);
}

export function buildBillFileName(opts: {
  clientName: string;
  date: string;
  kind: BillPrintKind;
  invoiceNo?: string;
}): string {
  const name = slugFilePart(opts.clientName);
  const date = fileDatePart(opts.date);
  const type = TYPE_LABEL[opts.kind];
  const no =
    opts.kind !== "quotation" && opts.invoiceNo
      ? `_${slugFilePart(String(opts.invoiceNo))}`
      : "";
  return `${name}_${date}${no}_${type}`;
}

function applyDocumentTitle(title: string): void {
  const next = title.replace(/\.pdf$/i, "");
  document.title = next;
  const el = document.querySelector("title");
  if (el) el.textContent = next;
}

/** Keep tab/PDF title as the bill filename while on the print page. */
export function setBillDocumentTitle(fileBaseName: string): () => void {
  applyDocumentTitle(fileBaseName);
  return () => applyDocumentTitle(DEFAULT_APP_TITLE);
}

/**
 * Print with A4. Title must already be the bill filename (Chrome/Edge
 * use document.title as the Save as PDF default name).
 * Do not restore title in afterprint — that resets the name before save.
 */
export function printBillAsPdf(fileBaseName: string): void {
  applyDocumentTitle(fileBaseName);
  // Two frames so Chrome picks up the new <title> before opening the dialog
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.print();
    });
  });
}
