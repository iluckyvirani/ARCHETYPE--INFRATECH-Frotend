import { useEffect, useState, type FormEvent } from "react";
import { formatDisplayDate, formatINR, todayISO } from "../lib/calc";

type Props = {
  open: boolean;
  clientName: string;
  label: string;
  amount: number;
  dueDate?: string;
  onClose: () => void;
  onConfirm: (paidAt: string, paidAmount: number) => Promise<void> | void;
};

/** Collect payment — user enters the actual paid date and amount collected. */
export function CollectPaymentModal({
  open,
  clientName,
  label,
  amount,
  dueDate,
  onClose,
  onConfirm,
}: Props) {
  const [paidAt, setPaidAt] = useState(todayISO());
  const [paidAmount, setPaidAmount] = useState(String(amount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPaidAt(todayISO());
      setPaidAmount(String(amount));
      setError("");
      setSaving(false);
    }
  }, [open, amount]);

  if (!open) return null;

  const enteredAmount = Number(paidAmount) || 0;
  const diff = Math.round((amount - enteredAmount) * 100) / 100;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!paidAt) {
      setError("Select the actual paid date.");
      return;
    }
    if (enteredAmount < 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm(paidAt, enteredAmount);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collect-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="collect-title"
          style={{ margin: "0 0 0.35rem", color: "#0b1f14", fontSize: "1.25rem" }}
        >
          Collect amount
        </h2>
        <p className="meta" style={{ margin: "0 0 1.15rem" }}>
          {clientName} — {label}
          {dueDate ? ` · Due ${formatDisplayDate(dueDate)}` : ""}
        </p>

        <form
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <label className="field">
            Due amount (₹)
            <input type="text" readOnly value={formatINR(amount)} />
          </label>

          <label className="field">
            Amount actually paid (₹)
            <input
              type="number"
              min={0}
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              required
            />
          </label>

          {diff !== 0 && (
            <p className="meta" style={{ margin: 0 }}>
              {diff > 0
                ? `Remaining ₹${formatINR(diff)} will be added to the next EMI.`
                : `Extra ₹${formatINR(-diff)} will be adjusted against the next EMI.`}
            </p>
          )}

          <label className="field">
            Actual paid date
            <input
              type="date"
              value={paidAt}
              max={todayISO()}
              onChange={(e) => setPaidAt(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              required
            />
          </label>

          {error && (
            <p className="error-text" style={{ margin: 0 }}>
              {error}
            </p>
          )}

          <div
            className="row-actions"
            style={{
              marginTop: "0.35rem",
              display: "flex",
              gap: "0.65rem",
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              style={{
                flex: 1,
                color: "#0b1f14",
                borderColor: "#0b1f14",
              }}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={saving}
            >
              {saving ? "Saving…" : "Mark collected"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
