type ConfirmModalProps = {
  title?: string;
  message: string;
  confirming?: boolean;
  confirmLabel?: string;
  confirmingLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  title = "Delete client?",
  message,
  confirming = false,
  confirmLabel = "Delete",
  confirmingLabel = "Deleting…",
  danger = true,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="modal-card panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-modal-title"
          style={{ margin: "0 0 0.75rem", color: "#0b1f14" }}
        >
          {title}
        </h2>
        <p
          className="meta"
          style={{ marginBottom: "1.25rem", lineHeight: 1.45 }}
        >
          {message}
        </p>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn-ghost"
            style={{ color: "#0b1f14", borderColor: "#0b1f14" }}
            onClick={onCancel}
            disabled={confirming}
          >
            Cancel
          </button>
          <button
            type="button"
            className={danger ? "btn btn-danger" : "btn btn-primary"}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming ? confirmingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
