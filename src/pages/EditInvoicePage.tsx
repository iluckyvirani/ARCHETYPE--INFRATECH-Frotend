import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FormSkeleton } from "../components/Skeleton";
import { WorkTypeSelect } from "../components/WorkTypeSelect";
import {
  additionalWorksSum,
  calcTotals,
  floorsAreaSum,
  floorsProjectCost,
  formatINR,
  todayISO,
} from "../lib/calc";
import { getClient, updateInvoice } from "../lib/store";
import type {
  AdditionalWork,
  AreaMode,
  FeeMode,
  Invoice,
} from "../lib/types";

const emptyWork = (): AdditionalWork => ({ name: "", qty: 0, rate: 0 });

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
  const [feeMode, setFeeMode] = useState<FeeMode>("area_sqft");
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

  useEffect(() => {
    if (!invoiceId) return;
    getClient(invoiceId).then((data) => {
      if (!data) {
        setError("Invoice not found");
        setLoading(false);
        return;
      }
      const inv = data.client;
      setInvoice(inv);
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
    }

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
        paymentPlan: isQuote ? "none" : invoice.paymentPlan,
        installmentMode: isQuote ? null : invoice.installmentMode,
        installmentMonths: isQuote ? null : invoice.installmentMonths,
        installmentCount: isQuote ? null : invoice.installmentCount,
        oneTimeDueDate: isQuote ? null : invoice.oneTimeDueDate,
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

        <h2 style={{ margin: "1.25rem 0 0.75rem", color: "#0b1f14" }}>Fees</h2>
        <div className="segmented" style={{ marginBottom: "0.75rem" }}>
          {(
            [
              ["area_sqft", "Area / sqft"],
              ["percentage", "Percentage"],
              ["fixed", "Fixed"],
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
                  min={todayISO()}
                  onChange={(e) => setAdvanceDate(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  disabled={!(Number(advanceAmount) > 0)}
                />
              </label>
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
              Installment schedule is not rebuilt automatically — adjust in
              Ledger if dues change.
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
