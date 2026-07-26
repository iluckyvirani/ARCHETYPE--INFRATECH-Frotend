import { useEffect, useState, type FormEvent } from "react";
import { todayISO } from "../lib/calc";

type Props = {
  open: boolean;
  clientName: string;
  label: string;
  amount: number;
  onClose: () => void;
  onConfirm: (paidAt: string) => Promise<void> | void;
};

/** Collect payment — user enters the actual paid date. */
export function CollectPaymentModal({
  open,
  clientName,
  label,
  amount,
  onClose,
  onConfirm,
}: Props) {
  const [paidAt, setPaidAt] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setPaidAt(todayISO());
      setError("");
      setSaving(false);
    }
  }, [open]);

  if (!open) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!paidAt) {
      setError("Select the actual paid date.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm(paidAt);
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
        aria-labelledby="collect-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="collect-title" style={{ marginTop: 0 }}>
          Collect amount
        </h2>
        <p className="meta" style={{ marginBottom: "1rem" }}>
          {clientName} — {label}
        </p>
        <form onSubmit={submit} className="form-grid">
          <label className="field">
            Amount (₹)
            <input
              type="text"
              readOnly
              value={amount.toLocaleString("en-IN", {
                maximumFractionDigits: 2,
              })}
            />
          </label>
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
            <p className="error" style={{ color: "#b91c1c", margin: 0 }}>
              {error}
            </p>
          )}
          <div className="row-actions" style={{ justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
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
