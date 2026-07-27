import type {
  AdditionalWork,
  FeeMode,
  InstallmentMode,
  PaymentPlan,
  ScheduleItem,
  StageInput,
} from "./types";

export function calcProjectCost(area: number, costPerSqft: number): number {
  return round2(area * costPerSqft);
}

export function calcFee(projectCost: number, percent: number): number {
  return round2(projectCost * (percent / 100));
}

export function additionalWorkAmount(item: AdditionalWork): number {
  return round2((Number(item.qty) || 0) * (Number(item.rate) || 0));
}

export function additionalWorksSum(items: AdditionalWork[] | undefined): number {
  return round2(
    (items || []).reduce((s, r) => s + additionalWorkAmount(r), 0)
  );
}

export function calcTotals(input: {
  feeMode: FeeMode;
  areaSqft?: number | null;
  costPerSqft?: number | null;
  feePercent?: number | null;
  fixedAmount?: number | null;
  advanceAmount?: number;
  additionalWorks?: AdditionalWork[];
}): {
  projectCost: number;
  feeAmount: number;
  additionalTotal: number;
  totalBill: number;
  balance: number;
} {
  const area = Number(input.areaSqft) || 0;
  const rate = Number(input.costPerSqft) || 0;
  const pct = Number(input.feePercent) || 0;
  const fixed = Number(input.fixedAmount) || 0;
  const advance = Number(input.advanceAmount) || 0;
  const additionalTotal = additionalWorksSum(input.additionalWorks);

  let projectCost = 0;
  let feeAmount = 0;

  if (input.feeMode === "percentage") {
    projectCost = calcProjectCost(area, rate);
    feeAmount = calcFee(projectCost, pct);
  } else if (input.feeMode === "fixed") {
    projectCost = fixed;
    feeAmount = fixed;
  } else {
    projectCost = calcProjectCost(area, rate);
    feeAmount = projectCost;
  }

  // Billable is fee (+ additional) only — project/post cost is reference, not billed.
  const totalBill = round2(feeAmount + additionalTotal);
  const balance = round2(Math.max(0, totalBill - advance));
  return { projectCost, feeAmount, additionalTotal, totalBill, balance };
}

export function floorsAreaSum(
  floors: { areaSqft?: number | string | null }[] | undefined
): number {
  return round2(
    (floors || []).reduce((s, f) => s + (Number(f.areaSqft) || 0), 0)
  );
}

/** Sum of each floor's area × its own cost per sqft */
export function floorsProjectCost(
  floors:
    | {
        areaSqft?: number | string | null;
        costPerSqft?: number | string | null;
      }[]
    | undefined
): number {
  return round2(
    (floors || []).reduce(
      (s, f) =>
        s + (Number(f.areaSqft) || 0) * (Number(f.costPerSqft) || 0),
      0
    )
  );
}

export function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  return formatDateISO(d);
}

export function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return formatDateISO(new Date());
}

export function toDayISO(value: string | null | undefined): string | null {
  if (!value) return null;
  const str = String(value).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const day = toDayISO(iso);
  if (!day) return "—";
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(n);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function getInstallmentCount(input: {
  installmentMode?: InstallmentMode | null;
  installmentMonths?: number | null;
  installmentCount?: number | null;
}): number {
  const months = Math.max(1, Number(input.installmentMonths) || 1);
  if (input.installmentMode === "count_over_months") {
    return Math.max(1, Number(input.installmentCount) || 1);
  }
  return months;
}

/** Build default due dates: 1st on firstDue, then spaced by interval months. */
export function buildInstallmentDueDates(
  firstDue: string,
  count: number,
  installmentMode?: InstallmentMode | null,
  installmentMonths?: number | null
): string[] {
  const n = Math.max(1, count);
  const months = Math.max(1, Number(installmentMonths) || 1);
  const interval =
    installmentMode === "count_over_months" ? months / n : 1;
  const start = firstDue || todayISO();
  const dates: string[] = [];
  for (let i = 0; i < n; i++) {
    dates.push(addMonths(start, Math.round(interval * i)));
  }
  return dates;
}

export function buildSchedulePreview(input: {
  clientId: string;
  balance: number;
  advanceAmount: number;
  advanceDate: string | null | undefined;
  paymentPlan: PaymentPlan;
  installmentMode?: InstallmentMode | null;
  installmentMonths?: number | null;
  installmentCount?: number | null;
  installmentDueDates?: string[] | null;
  oneTimeDueDate?: string | null;
  stages?: StageInput[];
  startDate?: string;
}): Omit<ScheduleItem, "id" | "invoiceId">[] {
  const rows: Omit<ScheduleItem, "id" | "invoiceId">[] = [];
  const start = input.startDate || todayISO();

  if (input.advanceAmount > 0 && input.advanceDate) {
    const due = input.advanceDate;
    const alreadyDue = due <= todayISO();
    rows.push({
      clientId: input.clientId,
      kind: "advance",
      label: "Advance",
      amount: round2(input.advanceAmount),
      dueDate: due,
      paid: alreadyDue,
      paidAt: alreadyDue ? due : null,
    });
  }

  if (input.balance <= 0 || input.paymentPlan === "none") {
    return rows;
  }

  if (input.paymentPlan === "one_time") {
    rows.push({
      clientId: input.clientId,
      kind: "one_time",
      label: "Full balance",
      amount: round2(input.balance),
      dueDate: input.oneTimeDueDate || start,
      paid: false,
      paidAt: null,
    });
    return rows;
  }

  if (input.paymentPlan === "installment") {
    const months = Math.max(1, Number(input.installmentMonths) || 1);
    let count = months;
    let interval = 1;

    if (input.installmentMode === "count_over_months") {
      count = Math.max(1, Number(input.installmentCount) || 1);
      interval = months / count;
    }

    const custom = (input.installmentDueDates || []).filter(Boolean);
    const base = round2(input.balance / count);
    let allocated = 0;

    for (let i = 0; i < count; i++) {
      const isLast = i === count - 1;
      const amount = isLast
        ? round2(input.balance - allocated)
        : base;
      allocated = round2(allocated + amount);
      const monthOffset = Math.round(interval * i);
      rows.push({
        clientId: input.clientId,
        kind: "installment",
        label: `Installment ${i + 1}`,
        amount,
        dueDate:
          custom[i] ||
          addMonths(custom[0] || start, monthOffset),
        paid: false,
        paidAt: null,
      });
    }
    return rows;
  }

  if (input.paymentPlan === "stage") {
    for (const stage of input.stages || []) {
      if (!stage.name && !stage.amount) continue;
      rows.push({
        clientId: input.clientId,
        kind: "stage",
        label: stage.name || "Stage",
        amount: round2(Number(stage.amount) || 0),
        dueDate: stage.dueDate || start,
        paid: false,
        paidAt: null,
      });
    }
  }

  return rows;
}

export function stagesSum(stages: StageInput[]): number {
  return round2(stages.reduce((s, r) => s + (Number(r.amount) || 0), 0));
}

export function isOverdue(dueDate: string, paid: boolean): boolean {
  if (paid) return false;
  return dueDate < todayISO();
}
