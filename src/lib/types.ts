export type FeeMode = "percentage" | "fixed" | "area_sqft";
export type PaymentPlan = "one_time" | "installment" | "stage" | "none";
export type InstallmentMode = "by_months" | "count_over_months";
export type ScheduleKind = "advance" | "one_time" | "installment" | "stage";

export type StageInput = {
  name: string;
  amount: number;
  dueDate: string;
};

export type AdditionalWork = {
  name: string;
  qty: number;
  rate: number;
};

export type ScheduleItem = {
  id: string;
  clientId: string;
  invoiceId: string;
  kind: ScheduleKind;
  label: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidAt: string | null;
};

/** One invoice / sale */
export type Invoice = {
  id: string;
  groupId: string;
  invoiceNo: string;
  name: string;
  location: string;
  projectName: string;
  feeMode: FeeMode;
  areaSqft: number | null;
  costPerSqft: number | null;
  feePercent: number | null;
  projectCost: number;
  feeAmount: number;
  fixedAmount: number | null;
  additionalWorks: AdditionalWork[];
  additionalTotal: number;
  totalBill: number;
  advanceAmount: number;
  advanceDate: string | null;
  balance: number;
  paymentPlan: PaymentPlan;
  installmentMode: InstallmentMode | null;
  installmentMonths: number | null;
  installmentCount: number | null;
  oneTimeDueDate: string | null;
  createdAt: string;
};

/** @deprecated alias — invoice row */
export type Client = Invoice;

export type ClientListItem = {
  groupId: string;
  /** All group ids merged into this customer card (dedupe) */
  groupIds?: string[];
  name: string;
  location: string;
  projectName: string;
  invoiceCount: number;
  totalBill: number;
  balance: number;
  latestInvoiceNo: string;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  clientId: string;
  scheduleItemId: string | null;
  title: string;
  message: string;
  dueDate: string;
  read: boolean;
  createdAt: string;
};

/** Enriched alert row for Alerts page / slip actions */
export type AlertRow = NotificationItem & {
  clientName?: string;
  scheduleKind?: ScheduleKind | null;
  schedulePaid?: boolean;
  amount?: number;
  scheduleLabel?: string;
  invoiceId?: string | null;
};

export type ClientPayload = {
  name: string;
  location: string;
  projectName: string;
  feeMode: FeeMode;
  areaSqft?: number | null;
  costPerSqft?: number | null;
  feePercent?: number | null;
  fixedAmount?: number | null;
  additionalWorks?: AdditionalWork[];
  advanceAmount: number;
  advanceDate?: string | null;
  paymentPlan: PaymentPlan;
  installmentMode?: InstallmentMode | null;
  installmentMonths?: number | null;
  installmentCount?: number | null;
  /** Per-installment due dates (YYYY-MM-DD), index 0 = first EMI */
  installmentDueDates?: string[] | null;
  oneTimeDueDate?: string | null;
  stages?: StageInput[];
};

/** Create another invoice for existing client — name locked on server/UI */
export type InvoicePayload = Omit<ClientPayload, "name"> & {
  name?: string;
};
