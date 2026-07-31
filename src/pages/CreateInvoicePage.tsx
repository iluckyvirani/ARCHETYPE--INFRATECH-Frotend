import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FormSkeleton } from "../components/Skeleton";
import { WorkTypeSelect } from "../components/WorkTypeSelect";
import {
  additionalWorkAmount,
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
import { createInvoiceForClient, getClientGroup } from "../lib/store";
import type {
  AdditionalWork,
  AreaMode,
  FeeMode,
  InstallmentMode,
  PaymentPlan,
  StageInput,
} from "../lib/types";

const emptyStage = (): StageInput => ({
  name: "",
  amount: 0,
  dueDate: todayISO(),
});

const emptyWork = (): AdditionalWork => ({
  name: "",
  qty: 0,
  rate: 0,
});

type FloorRow = { label: string; area: string; cost: string };

const emptyFloor = (n: number): FloorRow => ({
  label: `Floor ${n}`,
  area: "",
  cost: "",
});

export function CreateInvoicePage() {
  const { id: groupId } = useParams();
  const [search] = useSearchParams();
  const copyFromId = search.get("copyFrom");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedFromNo, setCopiedFromNo] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;
    getClientGroup(groupId).then((data) => {
      if (!data || !data.invoices.length) {
        setError("Client not found");
        setLoading(false);
        return;
      }
      const source =
        (copyFromId
          ? data.invoices.find((inv) => inv.id === copyFromId)
          : null) || data.invoices[0];
      setCopiedFromNo(source.invoiceNo);
      setName(source.name);
      setLocation(source.location);
      setProjectName(source.projectName);
      setWorkTypes([...(source.workTypes || [])]);
      setWorkTypeCustom(source.workTypeCustom || "");
      setWorkTypeCustomEnabled(Boolean(source.workTypeCustom));
      setFeeMode(source.feeMode);
      if ((source.floors || []).length > 0) {
        setAreaMode("floors");
        setFloors(
          source.floors.map((f, i) => ({
            label: f.label || `Floor ${i + 1}`,
            area: String(f.areaSqft || ""),
            cost: String(f.costPerSqft || ""),
          }))
        );
      } else {
        setAreaMode("total");
        setFloors([emptyFloor(1)]);
      }
      setAreaSqft(source.areaSqft != null ? String(source.areaSqft) : "");
      setCostPerSqft(
        source.costPerSqft != null ? String(source.costPerSqft) : ""
      );
      setFeePercent(
        source.feePercent != null ? String(source.feePercent) : "7"
      );
      setFixedAmount(
        source.fixedAmount != null ? String(source.fixedAmount) : ""
      );
      setAdditionalWorks(
        (source.additionalWorks || []).map((w) => ({ ...w }))
      );
      setVisitIncluded(source.visitIncluded !== false);
      setVisitFee(
        source.visitIncluded
          ? ""
          : source.visitFee
            ? String(source.visitFee)
            : ""
      );
      setAdvanceAmount("0");
      setAdvanceDate(todayISO());
      setPaymentPlan(
        source.paymentPlan === "none" ? "one_time" : source.paymentPlan
      );
      setInstallmentMode(source.installmentMode || "by_months");
      setInstallmentMonths(
        source.installmentMonths != null
          ? String(source.installmentMonths)
          : "6"
      );
      setInstallmentCount(
        source.installmentCount != null ? String(source.installmentCount) : "3"
      );
      setInstallmentFirstDue(todayISO());
      setOneTimeDueDate(todayISO());
      setLoading(false);
    });
  }, [groupId, copyFromId]);

  const floorInputs = floors.map((f) => ({
    areaSqft: Number(f.area) || 0,
    costPerSqft: Number(f.cost) || 0,
  }));
  const effectiveArea =
    areaMode === "floors"
      ? floorsAreaSum(floorInputs)
      : Number(areaSqft) || 0;
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

  const effectivePlan: PaymentPlan =
    totals.balance <= 0 ? "none" : paymentPlan;

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
      buildSchedulePreview({
        clientId: groupId || "preview",
        balance: totals.balance,
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
      groupId,
      totals.balance,
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return;
    setError(null);

    if (!location.trim() || !projectName.trim()) {
      setError("Location and project name are required.");
      return;
    }
    if (
      workTypes.length === 0 &&
      !(workTypeCustomEnabled && workTypeCustom.trim())
    ) {
      setError("Select at least one type of working.");
      return;
    }
    if (workTypeCustomEnabled && !workTypeCustom.trim()) {
      setError("Enter custom work type, or turn off Customise.");
      return;
    }
    if (!visitIncluded && !(Number(visitFee) > 0)) {
      setError("Enter visit fee amount, or check Visit included.");
      return;
    }

    if (feeMode === "percentage") {
      if (areaMode === "floors") {
        const ok = floors.every(
          (f) =>
            f.label.trim() && Number(f.area) > 0 && Number(f.cost) > 0
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

    const advance = Number(advanceAmount) || 0;
    if (advance > totals.totalBill) {
      setError("Advance cannot exceed total bill.");
      return;
    }
    if (advance > 0 && !advanceDate) {
      setError("Select advance date.");
      return;
    }
    if (totals.balance > 0 && paymentPlan === "installment") {
      if (!installmentFirstDue) {
        setError("Select first installment due date.");
        return;
      }
    }
    if (totals.balance > 0 && paymentPlan === "stage") {
      const sum = stagesSum(stages);
      if (Math.abs(sum - totals.balance) > 0.01) {
        setError(
          `Stage amounts must equal balance ₹${formatINR(totals.balance)}.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const invoice = await createInvoiceForClient(groupId, {
        location,
        projectName,
        workTypes,
        workTypeCustom: workTypeCustomEnabled
          ? workTypeCustom.trim()
          : null,
        feeMode,
        areaSqft: effectiveArea || null,
        costPerSqft: effectiveRate || null,
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
        feePercent: Number(feePercent) || null,
        fixedAmount: Number(fixedAmount) || null,
        additionalWorks: additionalWorks.filter(
          (w) => w.name.trim() && (Number(w.qty) > 0 || Number(w.rate) > 0)
        ),
        visitIncluded,
        visitFee: visitIncluded ? 0 : Number(visitFee) || 0,
        advanceAmount: advance,
        advanceDate: advance > 0 ? advanceDate : null,
        paymentPlan: effectivePlan,
        installmentMode:
          effectivePlan === "installment" ? installmentMode : null,
        installmentMonths:
          effectivePlan === "installment" ? Number(installmentMonths) : null,
        installmentCount:
          effectivePlan === "installment" &&
          installmentMode === "count_over_months"
            ? Number(installmentCount)
            : null,
        installmentDueDates:
          effectivePlan === "installment"
            ? installmentDueDates.slice(0, emiCount)
            : null,
        oneTimeDueDate: effectivePlan === "one_time" ? oneTimeDueDate : null,
        stages: effectivePlan === "stage" ? stages : [],
      });
      navigate(`/clients/${encodeURIComponent(invoice.id)}/print`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <FormSkeleton />;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>New invoice</h1>
          <p>
            {copiedFromNo
              ? `Copied from invoice #${copiedFromNo} — edit and save as a new invoice`
              : "Pre-filled from last invoice — client name is locked"}
          </p>
        </div>
        <Link to={`/clients/${groupId}`} className="btn btn-ghost">
          Cancel
        </Link>
      </header>

      <form className="panel" onSubmit={onSubmit}>
        <div className="form-grid two">
          <label className="field">
            Client name (locked)
            <input value={name} readOnly disabled />
          </label>
          <label className="field">
            Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
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

        <h2 style={{ margin: "1.5rem 0 0.75rem", color: "#0b1f14" }}>
          Fee & amount
        </h2>
        <div className="segmented">
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

        <div className="form-grid two" style={{ marginTop: "1rem" }}>
          {(feeMode === "percentage" || feeMode === "area_sqft") && (
            <>
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="segmented" role="tablist" aria-label="Area input">
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
                      min="0"
                      step="any"
                      value={areaSqft}
                      onChange={(e) => setAreaSqft(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Fee per sqft (₹)
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={costPerSqft}
                      onChange={(e) => setCostPerSqft(e.target.value)}
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
                              min="0"
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
                              min="0"
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
                    Total area: <strong>{formatINR(effectiveArea)}</strong> sqft
                    {" · "}
                    Project cost:{" "}
                    <strong>₹{formatINR(floorProjectCost)}</strong>
                  </p>
                </div>
              )}
            </>
          )}
          {feeMode === "percentage" && (
            <label className="field">
              Fee percentage (%)
              <input
                type="number"
                min="0"
                step="any"
                value={feePercent}
                onChange={(e) => setFeePercent(e.target.value)}
              />
            </label>
          )}
          {feeMode === "fixed" && (
            <label className="field">
              Fixed amount (₹)
              <input
                type="number"
                min="0"
                step="any"
                value={fixedAmount}
                onChange={(e) => setFixedAmount(e.target.value)}
              />
            </label>
          )}
        </div>

        <div className="summary-box" style={{ marginTop: "1rem" }}>
          {feeMode === "percentage" && (
            <>
              {areaMode === "floors" &&
                floors.map((floor, idx) => {
                  const area = Number(floor.area) || 0;
                  const rate = Number(floor.cost) || 0;
                  if (!(area > 0 && rate > 0)) return null;
                  return (
                    <div key={idx}>
                      {floor.label.trim() || `Floor ${idx + 1}`}:{" "}
                      <strong>
                        {formatINR(area)} sqft × ₹{formatINR(rate)} = ₹
                        {formatINR(area * rate)}
                      </strong>
                    </div>
                  );
                })}
              <div>
                Project cost: <strong>₹{formatINR(totals.projectCost)}</strong>
                <span style={{ opacity: 0.8 }}> (not billed)</span>
              </div>
            </>
          )}
          <div>
            Fee: <strong>₹{formatINR(totals.feeAmount)}</strong>
          </div>
          {totals.additionalTotal > 0 && (
            <div>
              Additional: <strong>₹{formatINR(totals.additionalTotal)}</strong>
            </div>
          )}
          <div>
            Visit:{" "}
            <strong>
              {visitIncluded
                ? "Already included (note only)"
                : totals.visitFee > 0
                  ? `₹${formatINR(totals.visitFee)} (note only, not in total)`
                  : "—"}
            </strong>
          </div>
          <div>
            Billable total: <strong>₹{formatINR(totals.totalBill)}</strong>
            <span style={{ opacity: 0.8 }}> (fee + additional)</span>
          </div>
        </div>

        <h2 style={{ margin: "1.5rem 0 0.75rem", color: "#0b1f14" }}>
          Additional work
        </h2>
        {additionalWorks.map((work, idx) => (
          <div key={idx} className="form-grid two" style={{ marginBottom: "0.75rem" }}>
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
                value={work.qty || ""}
                onChange={(e) => {
                  const next = [...additionalWorks];
                  next[idx] = { ...work, qty: Number(e.target.value) || 0 };
                  setAdditionalWorks(next);
                }}
              />
            </label>
            <label className="field">
              Per qty (₹)
              <input
                type="number"
                value={work.rate || ""}
                onChange={(e) => {
                  const next = [...additionalWorks];
                  next[idx] = { ...work, rate: Number(e.target.value) || 0 };
                  setAdditionalWorks(next);
                }}
              />
            </label>
            <div className="meta">
              = ₹{formatINR(additionalWorkAmount(work))}
            </div>
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
          Add additional work
        </button>
        {additionalWorks.length > 0 && (
          <p className="meta">
            Additional total: ₹{formatINR(additionalWorksSum(additionalWorks))}
          </p>
        )}

        <h2 style={{ margin: "1.5rem 0 0.75rem", color: "#0b1f14" }}>
          Visit
        </h2>
        <label
          className="field"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: "0.65rem",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={visitIncluded}
            onChange={(e) => setVisitIncluded(e.target.checked)}
            style={{ width: 18, height: 18 }}
          />
          <span>Visit included</span>
        </label>
        <p className="meta" style={{ margin: "0.35rem 0 0.75rem" }}>
          Check if visit is included in the bill. Uncheck to enter a visit fee.
        </p>
        {!visitIncluded && (
          <label className="field" style={{ maxWidth: 280 }}>
            Visit fee (₹)
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Enter visit fee"
              value={visitFee}
              onChange={(e) => setVisitFee(e.target.value)}
            />
          </label>
        )}

        <h2 style={{ margin: "1.5rem 0 0.75rem", color: "#0b1f14" }}>
          Advance
        </h2>
        <div className="form-grid two">
          <label className="field">
            Advance amount (₹)
            <input
              type="number"
              min="0"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
            />
          </label>
          <label className="field">
            Advance date
            <input
              type="date"
              value={advanceDate}
              min={todayISO()}
              onChange={(e) => setAdvanceDate(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              disabled={!(Number(advanceAmount) > 0)}
            />
            <span className="meta">Pick today or a future date (calendar only)</span>
          </label>
        </div>
        <p>
          Remaining balance: <strong>₹{formatINR(totals.balance)}</strong>
        </p>

        {totals.balance > 0 && (
          <>
            <h2 style={{ margin: "1.5rem 0 0.75rem", color: "#0b1f14" }}>
              Payment type
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
              <label className="field" style={{ marginTop: "1rem" }}>
                Due date
                <input
                  type="date"
                  value={oneTimeDueDate}
                  min={todayISO()}
                  onPaste={(e) => e.preventDefault()}
                  onChange={(e) => setOneTimeDueDate(e.target.value)}
                />
              </label>
            )}
            {paymentPlan === "installment" && (
              <div className="form-grid two" style={{ marginTop: "1rem" }}>
                <label className="field">
                  Style
                  <select
                    value={installmentMode}
                    onChange={(e) =>
                      setInstallmentMode(e.target.value as InstallmentMode)
                    }
                  >
                    <option value="by_months">Equal by months</option>
                    <option value="count_over_months">
                      N installments over M months
                    </option>
                  </select>
                </label>
                <label className="field">
                  Months
                  <input
                    type="number"
                    min="1"
                    value={installmentMonths}
                    onChange={(e) => setInstallmentMonths(e.target.value)}
                  />
                </label>
                {installmentMode === "count_over_months" && (
                  <label className="field">
                    Installments
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
                    All {emiCount} EMIs are set from this date (monthly spaced)
                  </span>
                </label>
              </div>
            )}
            {paymentPlan === "stage" && (
              <div style={{ marginTop: "1rem" }}>
                {stages.map((stage, idx) => (
                  <div key={idx} className="form-grid two">
                    <label className="field">
                      Stage name
                      <input
                        value={stage.name}
                        onChange={(e) => {
                          const next = [...stages];
                          next[idx] = { ...stage, name: e.target.value };
                          setStages(next);
                        }}
                      />
                    </label>
                    <label className="field">
                      Amount
                      <input
                        type="number"
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
                          next[idx] = { ...stage, dueDate: e.target.value };
                          setStages(next);
                        }}
                      />
                    </label>
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
              </div>
            )}
          </>
        )}

        <h2 style={{ margin: "1.5rem 0 0.75rem", color: "#0b1f14" }}>
          Schedule preview
        </h2>
        <table className="data">
          <thead>
            <tr>
              <th>Label</th>
              <th>Amount</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => (
              <tr key={i}>
                <td data-label="Label">{row.label}</td>
                <td data-label="Amount">₹{formatINR(row.amount)}</td>
                <td data-label="Due">{formatDisplayDate(row.dueDate)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {error && <p className="error-text">{error}</p>}
        <div className="row-actions" style={{ marginTop: "1.25rem" }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save invoice"}
          </button>
        </div>
      </form>
    </>
  );
}
