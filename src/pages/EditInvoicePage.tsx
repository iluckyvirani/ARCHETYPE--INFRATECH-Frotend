import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FormSkeleton } from "../components/Skeleton";
import { WorkTypeSelect } from "../components/WorkTypeSelect";
import {
  additionalWorksSum,
  buildInstallmentDueDates,
  buildSchedulePreview,
  calcTotals,
  floorsAreaSum,
  floorsProjectCost,
  formatDisplayDate,
  formatINR,
  getInstallmentCount,
  stagesSum,
  todayISO,
} from "../lib/calc";
import { getClient, updateInvoice } from "../lib/store";
import type {
  AdditionalWork,
  AreaMode,
  FeeMode,
  InstallmentMode,
  Invoice,
  PaymentPlan,
  ScheduleItem,
  StageInput,
} from "../lib/types";

const emptyWork = (): AdditionalWork => ({ name: "", qty: 0, rate: 0 });

const emptyStage = (): StageInput => ({
  name: "",
  amount: 0,
  dueDate: todayISO(),
});

type FloorRow = { label: string; area: string; cost: string };

const emptyFloor = (n: number): FloorRow => ({
  label: `Floor ${n}`,
  area: "",
  cost: "",
});

export function EditInvoicePage() {
  const { id: groupId, invoiceId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [clientInfoUnlocked, setClientInfoUnlocked] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [projectName, setProjectName] = useState("");
  const [workTypes, setWorkTypes] = useState<string[]>([]);
  const [workTypeCustom, setWorkTypeCustom] = useState("");
  const [workTypeCustomEnabled, setWorkTypeCustomEnabled] = useState(false);
  const [feeMode, setFeeMode] = useState<FeeMode>("percentage");
  const [areaMode, setAreaMode] = useState<AreaMode>("total");
  const [areaSqft, setAreaSqft] = useState("");
  const [floors, setFloors] = useState<FloorRow[]>([emptyFloor(1)]);
  const [costPerSqft, setCostPerSqft] = useState("");
  const [feePercent, setFeePercent] = useState("7");
  const [fixedAmount, setFixedAmount] = useState("");
  const [additionalWorks, setAdditionalWorks] = useState<AdditionalWork[]>([]);
  const [visitIncluded, setVisitIncluded] = useState(true);
  const [visitFee, setVisitFee] = useState("");
  const [advanceAmount, setAdvanceAmount] = useState("0");
  const [advanceDate, setAdvanceDate] = useState(todayISO());
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>("one_time");
  const [installmentMode, setInstallmentMode] =
    useState<InstallmentMode>("by_months");
  const [installmentMonths, setInstallmentMonths] = useState("6");
  const [installmentCount, setInstallmentCount] = useState("3");
  const [installmentFirstDue, setInstallmentFirstDue] = useState(todayISO());
  const [installmentDueDates, setInstallmentDueDates] = useState<string[]>([]);
  const [oneTimeDueDate, setOneTimeDueDate] = useState(todayISO());
  const [stages, setStages] = useState<StageInput[]>([emptyStage()]);
  const [existingSchedule, setExistingSchedule] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    if (!invoiceId) return;
    getClient(invoiceId).then((data) => {
      if (!data) {
        setError("Invoice not found");
        setLoading(false);
        return;
      }
      const inv = data.client;
      const schedule = data.schedule || [];
      setInvoice(inv);
      setExistingSchedule(schedule);
      setName(inv.name);
      setLocation(inv.location);
      setProjectName(inv.projectName);
      setWorkTypes([...(inv.workTypes || [])]);
      setWorkTypeCustom(inv.workTypeCustom || "");
      setWorkTypeCustomEnabled(Boolean(inv.workTypeCustom));
      setFeeMode(inv.feeMode);
      if ((inv.floors || []).length > 0) {
        setAreaMode("floors");
        setFloors(
          inv.floors.map((f, i) => ({
            label: f.label || `Floor ${i + 1}`,
            area: String(f.areaSqft || ""),
            cost: String(f.costPerSqft || ""),
          }))
        );
      } else {
        setAreaMode("total");
        setFloors([emptyFloor(1)]);
      }
      setAreaSqft(inv.areaSqft != null ? String(inv.areaSqft) : "");
      setCostPerSqft(inv.costPerSqft != null ? String(inv.costPerSqft) : "");
      setFeePercent(inv.feePercent != null ? String(inv.feePercent) : "7");
      setFixedAmount(inv.fixedAmount != null ? String(inv.fixedAmount) : "");
      setAdditionalWorks((inv.additionalWorks || []).map((w) => ({ ...w })));
      setVisitIncluded(inv.visitIncluded !== false);
      setVisitFee(
        inv.visitIncluded ? "" : inv.visitFee ? String(inv.visitFee) : ""
      );
      setAdvanceAmount(String(inv.advanceAmount || 0));
      setAdvanceDate(inv.advanceDate || todayISO());
      setPaymentPlan(
        inv.paymentPlan === "none" ? "one_time" : inv.paymentPlan
      );
      setInstallmentMode(inv.installmentMode || "by_months");
      setInstallmentMonths(
        inv.installmentMonths != null ? String(inv.installmentMonths) : "6"
      );
      setInstallmentCount(
        inv.installmentCount != null ? String(inv.installmentCount) : "3"
      );
      const firstInstallment = schedule.find((s) => s.kind === "installment");
      setInstallmentFirstDue(
        firstInstallment?.dueDate || inv.oneTimeDueDate || todayISO()
      );
      setOneTimeDueDate(inv.oneTimeDueDate || todayISO());
      const stageRows = schedule.filter((s) => s.kind === "stage" && !s.paid);
      setStages(
        stageRows.length > 0
          ? stageRows.map((s) => ({
              name: s.label || "",
              amount: Number(s.amount) || 0,
              dueDate: s.dueDate || todayISO(),
            }))
          : [emptyStage()]
      );
      setLoading(false);
    });
  }, [invoiceId]);

  const floorInputs = floors.map((f) => ({
    areaSqft: Number(f.area) || 0,
    costPerSqft: Number(f.cost) || 0,
  }));
  const effectiveArea =
    areaMode === "floors" ? floorsAreaSum(floorInputs) : Number(areaSqft) || 0;
  const floorProjectCost = floorsProjectCost(floorInputs);
  const effectiveRate =
    areaMode === "floors"
      ? effectiveArea > 0
        ? floorProjectCost / effectiveArea
        : 0
      : Number(costPerSqft) || 0;

  const totals = useMemo(
    () =>
      calcTotals({
        feeMode,
        areaSqft: effectiveArea,
        costPerSqft: effectiveRate,
        feePercent: Number(feePercent) || 0,
        fixedAmount: Number(fixedAmount) || 0,
        advanceAmount: Number(advanceAmount) || 0,
        additionalWorks,
        visitIncluded,
        visitFee: Number(visitFee) || 0,
      }),
    [
      feeMode,
      effectiveArea,
      effectiveRate,
      feePercent,
      fixedAmount,
      advanceAmount,
      additionalWorks,
      visitIncluded,
      visitFee,
    ]
  );

  const alreadyCollected = useMemo(
    () =>
      existingSchedule
        .filter((s) => s.kind !== "advance" && s.paid)
        .reduce(
          (sum, s) => sum + (Number(s.paidAmount) || Number(s.amount) || 0),
          0
        ),
    [existingSchedule]
  );

  const unpaidBalance = Math.max(0, totals.balance - alreadyCollected);

  const effectivePlan: PaymentPlan =
    invoice?.documentType === "quotation" || unpaidBalance <= 0
      ? "none"
      : paymentPlan;

  const emiCount = useMemo(
    () =>
      getInstallmentCount({
        installmentMode,
        installmentMonths: Number(installmentMonths) || 0,
        installmentCount: Number(installmentCount) || 0,
      }),
    [installmentMode, installmentMonths, installmentCount]
  );

  useEffect(() => {
    if (paymentPlan !== "installment") return;
    setInstallmentDueDates(
      buildInstallmentDueDates(
        installmentFirstDue,
        emiCount,
        installmentMode,
        Number(installmentMonths) || 0
      )
    );
  }, [
    paymentPlan,
    emiCount,
    installmentMode,
    installmentMonths,
    installmentFirstDue,
  ]);

  const preview = useMemo(
    () =>
      invoice?.documentType === "quotation"
        ? []
        : buildSchedulePreview({
            clientId: invoiceId || "preview",
            balance: unpaidBalance,
            advanceAmount: Number(advanceAmount) || 0,
            advanceDate: Number(advanceAmount) > 0 ? advanceDate : null,
            paymentPlan: effectivePlan,
            installmentMode,
            installmentMonths: Number(installmentMonths) || 0,
            installmentCount: Number(installmentCount) || 0,
            installmentDueDates,
            oneTimeDueDate,
            stages,
          }),
    [
      invoice?.documentType,
      invoiceId,
      unpaidBalance,
      advanceAmount,
      advanceDate,
      effectivePlan,
      installmentMode,
      installmentMonths,
      installmentCount,
      installmentDueDates,
      oneTimeDueDate,
      stages,
    ]
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!invoiceId || !invoice) return;
    if (invoice.completed) {
      setError("Completed invoices cannot be edited");
      return;
    }
    if (!projectName.trim()) {
      setError("Project name is required");
      return;
    }
    if (
      workTypes.length === 0 &&
      !(workTypeCustomEnabled && workTypeCustom.trim())
    ) {
      setError("Select at least one working type");
      return;
    }
    if (workTypeCustomEnabled && !workTypeCustom.trim()) {
      setError("Enter custom working type, or turn off Customise.");
      return;
    }
    if (!visitIncluded && !(Number(visitFee) > 0)) {
      setError("Enter visit fee amount, or check Visit included.");
      return;
    }

    if (feeMode === "percentage") {
      if (areaMode === "floors") {
        const ok = floors.every(
          (f) => f.label.trim() && Number(f.area) > 0 && Number(f.cost) > 0
        );
        if (!ok || !(Number(feePercent) > 0)) {
          setError(
            "Enter floor name, area, fee per sqft for each floor, and fee %."
          );
          return;
        }
      } else if (
        !(effectiveArea > 0 && Number(costPerSqft) > 0 && Number(feePercent) > 0)
      ) {
        setError("Enter area, fee per sqft and percentage.");
        return;
      }
    }
    if (feeMode === "fixed" && !(Number(fixedAmount) > 0)) {
      setError("Enter a fixed amount.");
      return;
    }
    if (feeMode === "area_sqft") {
      if (areaMode === "floors") {
        const ok = floors.every(
          (f) => f.label.trim() && Number(f.area) > 0 && Number(f.cost) > 0
        );
        if (!ok) {
          setError("Enter floor name, area and fee per sqft for each floor.");
          return;
        }
      } else if (!(effectiveArea > 0 && Number(costPerSqft) > 0)) {
        setError("Enter area and fee per sqft.");
        return;
      }
    }

    const isQuote = invoice.documentType === "quotation";
    const advance = isQuote ? 0 : Number(advanceAmount) || 0;
    if (!isQuote) {
      if (advance > totals.totalBill) {
        setError("Advance cannot exceed total bill.");
        return;
      }
      if (advance > 0 && !advanceDate) {
        setError("Select advance date.");
        return;
      }
      if (unpaidBalance > 0) {
        if (paymentPlan === "one_time" && !oneTimeDueDate) {
          setError("Select one-time due date.");
          return;
        }
        if (paymentPlan === "installment") {
          if (!(Number(installmentMonths) > 0)) {
            setError("Enter number of months for installments.");
            return;
          }
          if (
            installmentMode === "count_over_months" &&
            !(Number(installmentCount) > 0)
          ) {
            setError("Enter number of installments.");
            return;
          }
          if (!installmentFirstDue) {
            setError("Select first installment due date.");
            return;
          }
        }
        if (paymentPlan === "stage") {
          const sum = stagesSum(stages);
          if (Math.abs(sum - unpaidBalance) > 0.01) {
            setError(
              `Stage amounts (₹${formatINR(sum)}) must equal unpaid balance ₹${formatINR(unpaidBalance)}.`
            );
            return;
          }
          if (stages.some((s) => !s.name.trim() || !s.dueDate)) {
            setError("Each stage needs a name and due date.");
            return;
          }
        }
      }
    }

    const plan: PaymentPlan = isQuote
      ? "none"
      : unpaidBalance <= 0
        ? "none"
        : paymentPlan;

    setSaving(true);
    setError(null);
    try {
      await updateInvoice(invoiceId, {
        name: name.trim(),
        location: location.trim(),
        projectName: projectName.trim(),
        workTypes,
        workTypeCustom: workTypeCustomEnabled
          ? workTypeCustom.trim()
          : null,
        feeMode,
        areaSqft: feeMode === "fixed" ? null : effectiveArea || 0,
        costPerSqft: feeMode === "fixed" ? null : effectiveRate || 0,
        floors:
          (feeMode === "area_sqft" || feeMode === "percentage") &&
          areaMode === "floors"
            ? floors
                .map((f) => ({
                  label: f.label.trim(),
                  areaSqft: Number(f.area) || 0,
                  costPerSqft: Number(f.cost) || 0,
                }))
                .filter((f) => f.label && f.areaSqft > 0 && f.costPerSqft > 0)
            : [],
        feePercent: feeMode === "percentage" ? Number(feePercent) || 0 : null,
        fixedAmount: feeMode === "fixed" ? Number(fixedAmount) || 0 : null,
        additionalWorks: additionalWorks.filter(
          (w) => w.name.trim() && (Number(w.qty) > 0 || Number(w.rate) > 0)
        ),
        visitIncluded,
        visitFee: visitIncluded ? 0 : Number(visitFee) || 0,
        documentType: invoice.documentType || "invoice",
        advanceAmount: advance,
        advanceDate: advance > 0 ? advanceDate : null,
        paymentPlan: plan,
        installmentMode: plan === "installment" ? installmentMode : null,
        installmentMonths:
          plan === "installment" ? Number(installmentMonths) || null : null,
        installmentCount:
          plan === "installment" ? Number(installmentCount) || null : null,
        installmentDueDates:
          plan === "installment" ? installmentDueDates : null,
        oneTimeDueDate: plan === "one_time" ? oneTimeDueDate : null,
        stages: plan === "stage" ? stages : undefined,
        syncClientInfo: clientInfoUnlocked,
      });
      navigate(`/clients/${groupId || invoice.groupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <FormSkeleton />;

  if (!invoice) {
    return (
      <section className="panel">
        <p className="error-text">{error || "Not found"}</p>
        <Link to="/clients" className="btn btn-dark">
          Back
        </Link>
      </section>
    );
  }

  const isQuote = invoice.documentType === "quotation";

  return (
    <>
      <header className="page-header">
        <div>
          <h1>
            {isQuote
              ? "Edit quotation"
              : `Edit invoice #${invoice.invoiceNo}`}
          </h1>
          <p>
            Update this {isQuote ? "quotation" : "invoice"}. Unlock client name
            &amp; address to change them.
          </p>
        </div>
        <Link
          to={`/clients/${groupId || invoice.groupId}`}
          className="btn btn-ghost"
        >
          Cancel
        </Link>
      </header>

      <form className="panel" onSubmit={onSubmit}>
        {error && <p className="error-text">{error}</p>}

        <div className="edit-unlock-bar">
          <label className="check-row">
            <input
              type="checkbox"
              checked={clientInfoUnlocked}
              onChange={(e) => setClientInfoUnlocked(e.target.checked)}
            />
            <span>Enable editing client name &amp; address</span>
          </label>
          <p className="meta" style={{ margin: "0.35rem 0 0" }}>
            When enabled, name and address update for this client across
            invoices.
          </p>
        </div>

        <div className="form-grid two">
          <label className="field">
            Client name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!clientInfoUnlocked}
            />
          </label>
          <label className="field">
            Address
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              disabled={!clientInfoUnlocked}
            />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            Project name
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
            />
          </label>
        </div>

        <div style={{ marginTop: "1rem" }}>
          <WorkTypeSelect
            selected={workTypes}
            custom={workTypeCustom}
            customEnabled={workTypeCustomEnabled}
            onChange={({ selected, custom, customEnabled }) => {
              setWorkTypes(selected);
              setWorkTypeCustom(custom);
              setWorkTypeCustomEnabled(customEnabled);
            }}
          />
        </div>

        <h2 style={{ margin: "1.25rem 0 0.75rem", color: "#0b1f14" }}>
          Fee & amount
        </h2>
        <div className="segmented" role="tablist" aria-label="Fee mode" style={{ marginBottom: "0.75rem" }}>
          {(
            [
              ["percentage", "Percentage"],
              ["fixed", "Fixed amount"],
              ["area_sqft", "Area sqft"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={feeMode === value ? "active" : ""}
              onClick={() => setFeeMode(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="form-grid two">
          {(feeMode === "percentage" || feeMode === "area_sqft") && (
            <>
              <div style={{ gridColumn: "1 / -1" }}>
                <div
                  className="segmented"
                  role="tablist"
                  aria-label="Area input"
                >
                  {(
                    [
                      ["total", "Total area"],
                      ["floors", "Floor by area"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={areaMode === value ? "active" : ""}
                      onClick={() => setAreaMode(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {areaMode === "total" ? (
                <>
                  <label className="field">
                    Area (sqft)
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={areaSqft}
                      onChange={(e) => setAreaSqft(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    Fee per sqft
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={costPerSqft}
                      onChange={(e) => setCostPerSqft(e.target.value)}
                      required
                    />
                  </label>
                </>
              ) : (
                <div style={{ gridColumn: "1 / -1" }}>
                  {floors.map((floor, idx) => {
                    const area = Number(floor.area) || 0;
                    const rate = Number(floor.cost) || 0;
                    const line = area * rate;
                    return (
                      <div
                        key={idx}
                        style={{
                          marginBottom: "0.85rem",
                          paddingBottom: "0.85rem",
                          borderBottom: "1px solid rgba(11, 31, 20, 0.08)",
                        }}
                      >
                        <div className="form-grid two">
                          <label className="field">
                            Floor name
                            <input
                              type="text"
                              placeholder={`Floor ${idx + 1}`}
                              value={floor.label}
                              onChange={(e) => {
                                const next = [...floors];
                                next[idx] = {
                                  ...next[idx],
                                  label: e.target.value,
                                };
                                setFloors(next);
                              }}
                            />
                          </label>
                          <label className="field">
                            Area (sqft)
                            <input
                              type="number"
                              min={0}
                              step="any"
                              placeholder="e.g. 450"
                              value={floor.area}
                              onChange={(e) => {
                                const next = [...floors];
                                next[idx] = {
                                  ...next[idx],
                                  area: e.target.value,
                                };
                                setFloors(next);
                              }}
                            />
                          </label>
                          <label className="field">
                            Fee per sqft (₹)
                            <input
                              type="number"
                              min={0}
                              step="any"
                              placeholder="e.g. 1200"
                              value={floor.cost}
                              onChange={(e) => {
                                const next = [...floors];
                                next[idx] = {
                                  ...next[idx],
                                  cost: e.target.value,
                                };
                                setFloors(next);
                              }}
                            />
                          </label>
                          <div
                            className="meta"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              paddingBottom: "0.35rem",
                            }}
                          >
                            {area > 0 && rate > 0
                              ? `${formatINR(area)} × ₹${formatINR(rate)} = ₹${formatINR(line)}`
                              : "Area × fee"}
                            {floors.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-ghost"
                                style={{ padding: "0.2rem 0.6rem" }}
                                onClick={() =>
                                  setFloors(floors.filter((_, i) => i !== idx))
                                }
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setFloors([...floors, emptyFloor(floors.length + 1)])
                    }
                  >
                    + Add floor
                  </button>
                  <p className="meta" style={{ marginTop: "0.5rem" }}>
                    Total area: <strong>{formatINR(effectiveArea)}</strong>{" "}
                    sqft · Project cost:{" "}
                    <strong>₹{formatINR(floorProjectCost)}</strong>
                  </p>
                </div>
              )}
            </>
          )}
          {feeMode === "percentage" && (
            <label className="field">
              Fee %
              <input
                type="number"
                min={0}
                step="any"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
                required
              />
            </label>
          )}
          {feeMode === "fixed" && (
            <label className="field">
              Fixed fee
              <input
                type="number"
                min={0}
                step="any"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
                required
              />
            </label>
          )}
        </div>

        <h2 style={{ margin: "1.25rem 0 0.75rem", color: "#0b1f14" }}>
          Additional work
        </h2>
        {additionalWorks.map((work, idx) => (
          <div
            key={idx}
            className="form-grid two"
            style={{ marginBottom: "0.75rem" }}
          >
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              Name
              <input
                value={work.name}
                onChange={(e) => {
                  const next = [...additionalWorks];
                  next[idx] = { ...work, name: e.target.value };
                  setAdditionalWorks(next);
                }}
              />
            </label>
            <label className="field">
              Qty
              <input
                type="number"
                min={0}
                step="any"
                value={work.qty || ""}
                onChange={(e) => {
                  const next = [...additionalWorks];
                  next[idx] = { ...work, qty: Number(e.target.value) || 0 };
                  setAdditionalWorks(next);
                }}
              />
            </label>
            <label className="field">
              Rate
              <input
                type="number"
                min={0}
                step="any"
                value={work.rate || ""}
                onChange={(e) => {
                  const next = [...additionalWorks];
                  next[idx] = { ...work, rate: Number(e.target.value) || 0 };
                  setAdditionalWorks(next);
                }}
              />
            </label>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() =>
                setAdditionalWorks(additionalWorks.filter((_, i) => i !== idx))
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ color: "#0b1f14", borderColor: "#0b1f14" }}
          onClick={() => setAdditionalWorks([...additionalWorks, emptyWork()])}
        >
          + Additional work
        </button>

        <h2 style={{ margin: "1.25rem 0 0.75rem", color: "#0b1f14" }}>Visit</h2>
        <label className="check-row">
          <input
            type="checkbox"
            checked={visitIncluded}
            onChange={(e) => setVisitIncluded(e.target.checked)}
          />
          <span>Visit included</span>
        </label>
        {!visitIncluded && (
          <label className="field" style={{ marginTop: "0.75rem" }}>
            Per visit charge
            <input
              type="number"
              min={0}
              step="any"
              value={visitFee}
              onChange={(e) => setVisitFee(e.target.value)}
              required
            />
          </label>
        )}

        {!isQuote && (
          <>
            <h2 style={{ margin: "1.25rem 0 0.75rem", color: "#0b1f14" }}>
              Advance
            </h2>
            <div className="form-grid two">
              <label className="field">
                Advance amount
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                />
              </label>
              <label className="field">
                Advance date
                <input
                  type="date"
                  value={advanceDate}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  disabled={!(Number(advanceAmount) > 0)}
                />
                <span className="meta">
                  Past/today = already received · Future = due on bill
                </span>
              </label>
            </div>
            <p style={{ marginTop: "0.75rem" }}>
              Remaining balance:{" "}
              <strong>₹{formatINR(totals.balance)}</strong>
              {alreadyCollected > 0 && (
                <span className="meta">
                  {" "}
                  · Already collected on schedule ₹{formatINR(alreadyCollected)}
                  {" "}
                  · Unpaid ₹{formatINR(unpaidBalance)}
                </span>
              )}
            </p>

            {unpaidBalance > 0 && (
              <>
                <h2 style={{ margin: "1.5rem 0 0.75rem", color: "#0b1f14" }}>
                  Payment for remaining balance
                </h2>
                <div className="segmented">
                  {(
                    [
                      ["one_time", "One time"],
                      ["installment", "Installment"],
                      ["stage", "Stage"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={paymentPlan === value ? "active" : ""}
                      onClick={() => setPaymentPlan(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {paymentPlan === "one_time" && (
                  <div className="form-grid two" style={{ marginTop: "1rem" }}>
                    <label className="field">
                      Full balance due date
                      <input
                        type="date"
                        value={oneTimeDueDate}
                        min={todayISO()}
                        onChange={(e) => setOneTimeDueDate(e.target.value)}
                        onPaste={(e) => e.preventDefault()}
                      />
                    </label>
                  </div>
                )}

                {paymentPlan === "installment" && (
                  <div className="form-grid two" style={{ marginTop: "1rem" }}>
                    <label className="field">
                      Installment style
                      <select
                        value={installmentMode}
                        onChange={(e) =>
                          setInstallmentMode(e.target.value as InstallmentMode)
                        }
                      >
                        <option value="by_months">
                          Equal by months (monthly)
                        </option>
                        <option value="count_over_months">
                          N installments over M months
                        </option>
                      </select>
                    </label>
                    <label className="field">
                      Number of months
                      <input
                        type="number"
                        min="1"
                        value={installmentMonths}
                        onChange={(e) => setInstallmentMonths(e.target.value)}
                      />
                    </label>
                    {installmentMode === "count_over_months" && (
                      <label className="field">
                        Number of installments
                        <input
                          type="number"
                          min="1"
                          value={installmentCount}
                          onChange={(e) => setInstallmentCount(e.target.value)}
                        />
                      </label>
                    )}
                    <label className="field">
                      First installment due date
                      <input
                        type="date"
                        value={installmentFirstDue}
                        min={todayISO()}
                        onPaste={(e) => e.preventDefault()}
                        onChange={(e) => setInstallmentFirstDue(e.target.value)}
                      />
                      <span className="meta">
                        All {emiCount} EMIs are set from this date (monthly
                        spaced)
                      </span>
                    </label>
                  </div>
                )}

                {paymentPlan === "stage" && (
                  <div style={{ marginTop: "1rem" }}>
                    {stages.map((stage, idx) => (
                      <div
                        key={idx}
                        className="form-grid two"
                        style={{
                          marginBottom: "0.75rem",
                          paddingBottom: "0.75rem",
                          borderBottom: "1px solid rgba(11,31,20,0.08)",
                        }}
                      >
                        <label className="field">
                          Stage name
                          <input
                            value={stage.name}
                            onChange={(e) => {
                              const next = [...stages];
                              next[idx] = { ...stage, name: e.target.value };
                              setStages(next);
                            }}
                            placeholder="e.g. Slab / Plaster"
                          />
                        </label>
                        <label className="field">
                          Amount (₹)
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={stage.amount || ""}
                            onChange={(e) => {
                              const next = [...stages];
                              next[idx] = {
                                ...stage,
                                amount: Number(e.target.value) || 0,
                              };
                              setStages(next);
                            }}
                          />
                        </label>
                        <label className="field">
                          Due date
                          <input
                            type="date"
                            value={stage.dueDate}
                            min={todayISO()}
                            onPaste={(e) => e.preventDefault()}
                            onChange={(e) => {
                              const next = [...stages];
                              next[idx] = {
                                ...stage,
                                dueDate: e.target.value,
                              };
                              setStages(next);
                            }}
                          />
                        </label>
                        <div style={{ display: "flex", alignItems: "end" }}>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() =>
                              setStages(stages.filter((_, i) => i !== idx))
                            }
                            disabled={stages.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ color: "#0b1f14", borderColor: "#0b1f14" }}
                      onClick={() => setStages([...stages, emptyStage()])}
                    >
                      Add stage
                    </button>
                    <p className="meta" style={{ marginTop: "0.75rem" }}>
                      Stages total ₹{formatINR(stagesSum(stages))} / unpaid ₹
                      {formatINR(unpaidBalance)}
                    </p>
                  </div>
                )}
              </>
            )}

            <h2 style={{ margin: "1.5rem 0 0.75rem", color: "#0b1f14" }}>
              Schedule preview
            </h2>
            <div
              className="table-wrap panel"
              style={{ padding: 0, boxShadow: "none", background: "#fff" }}
            >
              <table className="data">
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Amount</th>
                    <th>Due date</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.length === 0 && (
                    <tr>
                      <td colSpan={3}>No schedule rows</td>
                    </tr>
                  )}
                  {preview.map((row, i) => (
                    <tr key={i}>
                      <td data-label="Label">{row.label}</td>
                      <td data-label="Amount">₹{formatINR(row.amount)}</td>
                      <td data-label="Due date">
                        {formatDisplayDate(row.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="totals-box" style={{ marginTop: "1.25rem" }}>
          {areaMode === "floors" &&
            (feeMode === "area_sqft" || feeMode === "percentage") &&
            floors.map((floor, idx) => {
              const area = Number(floor.area) || 0;
              const rate = Number(floor.cost) || 0;
              if (!(area > 0 && rate > 0)) return null;
              return (
                <div key={idx}>
                  {floor.label.trim() || `Floor ${idx + 1}`}:{" "}
                  <strong>₹{formatINR(area * rate)}</strong>
                </div>
              );
            })}
          <div>
            Fee: <strong>₹{formatINR(totals.feeAmount)}</strong>
          </div>
          {additionalWorksSum(additionalWorks) > 0 && (
            <div>
              Additional:{" "}
              <strong>₹{formatINR(additionalWorksSum(additionalWorks))}</strong>
            </div>
          )}
          <div>
            {isQuote ? "Quoted" : "Billable"} total:{" "}
            <strong>₹{formatINR(totals.totalBill)}</strong>
          </div>
          {!isQuote && (
            <div>
              Balance: <strong>₹{formatINR(totals.balance)}</strong>
            </div>
          )}
          {!isQuote && (
            <p className="meta" style={{ marginTop: "0.5rem" }}>
              Unpaid schedule rows are rebuilt from the payment plan below —
              already-collected payments are not affected.
            </p>
          )}
        </div>

        <div className="row-actions" style={{ marginTop: "1.25rem" }}>
          <Link
            to={`/clients/${groupId || invoice.groupId}`}
            className="btn btn-ghost"
            style={{ color: "#0b1f14", borderColor: "#0b1f14" }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || Boolean(invoice.completed)}
          >
            {saving ? "Saving…" : isQuote ? "Save quotation" : "Save invoice"}
          </button>
        </div>
      </form>
    </>
  );
}
