import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CollectPaymentModal } from "../components/CollectPaymentModal";
import { formatDisplayDate, formatINR, todayISO } from "../lib/calc";
import {
  listNotifications,
  markNotificationRead,
  markSchedulePaid,
} from "../lib/store";
import type { AlertRow } from "../lib/types";

function slipPath(n: AlertRow): string | null {
  if (!n.invoiceId || !n.scheduleItemId) return null;
  const kind = n.scheduleKind === "advance" ? "advance-demand" : "payment-demand";
  return `/clients/${n.invoiceId}/print/${kind}?scheduleId=${n.scheduleItemId}`;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [collect, setCollect] = useState<AlertRow | null>(null);

  async function refresh() {
    setLoading(true);
    const data = await listNotifications();
    setItems(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const today = todayISO();

  /** Only unpaid rows that are due today or overdue — stay until Collect succeeds. */
  const dueAlerts = useMemo(
    () =>
      items.filter(
        (n) =>
          !n.schedulePaid &&
          Boolean(n.scheduleItemId) &&
          Boolean(n.dueDate) &&
          n.dueDate <= today
      ),
    [items, today]
  );

  async function onCollect(paidAt: string) {
    if (!collect?.scheduleItemId) return;
    await markSchedulePaid(
      collect.invoiceId || collect.clientId,
      collect.scheduleItemId,
      true,
      paidAt
    );
    await markNotificationRead(collect.id);
    setCollect(null);
    await refresh();
  }

  function renderAlert(n: AlertRow) {
    const overdue = n.dueDate < today;
    const path = slipPath(n);
    const amount = n.amount ?? 0;
    const label = n.scheduleLabel || "EMI";
    const who = n.clientName || "Client";

    return (
      <div key={n.id} className="list-item">
        <div>
          <h3>{n.title}</h3>
          <div className="meta">
            {who} — {label}
            {amount > 0 ? ` · ₹${formatINR(amount)}` : ""}
          </div>
          <div className="meta">Due {formatDisplayDate(n.dueDate)}</div>
        </div>
        <div
          className="row-actions"
          style={{ flexDirection: "column", alignItems: "flex-end", gap: 8 }}
        >
          <span className={`badge ${overdue ? "danger" : "ok"}`}>
            {overdue ? "Overdue" : "Due today"}
          </span>

          <div
            className="row-actions"
            style={{ flexWrap: "wrap", justifyContent: "flex-end" }}
          >
            {path && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: "#0b1f14", borderColor: "#0b1f14" }}
                onClick={() => {
                  markNotificationRead(n.id);
                  navigate(path);
                }}
              >
                View slip
              </button>
            )}
            {n.scheduleItemId && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setCollect(n)}
              >
                Collect
              </button>
            )}
            <Link to={`/clients/${n.clientId}`} className="btn btn-ghost">
              Client
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>
            EMI &amp; advance due today or earlier — stay until you collect
          </p>
        </div>
      </header>

      <section className="panel">
        {loading && <p className="empty">Loading alerts…</p>}
        {!loading && dueAlerts.length === 0 && (
          <div className="empty">
            No due payments. Alerts appear when an EMI or advance due date is
            today or overdue, and disappear after you collect.
          </div>
        )}

        {!loading && dueAlerts.length > 0 && (
          <>
            <h2
              style={{
                margin: "0 0 0.75rem",
                color: "#0b1f14",
                fontSize: "1.05rem",
              }}
            >
              Due now ({dueAlerts.length})
            </h2>
            <div className="list">{dueAlerts.map((n) => renderAlert(n))}</div>
          </>
        )}
      </section>

      <CollectPaymentModal
        open={Boolean(collect)}
        clientName={collect?.clientName || ""}
        label={collect?.scheduleLabel || collect?.title || "Payment"}
        amount={collect?.amount || 0}
        onClose={() => setCollect(null)}
        onConfirm={onCollect}
      />
    </>
  );
}
