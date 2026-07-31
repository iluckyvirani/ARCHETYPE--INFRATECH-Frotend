import { CheckCircle2, Pencil, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { ClientsSkeleton } from "../components/Skeleton";
import { formatINR } from "../lib/calc";
import {
  completeClientGroup,
  deleteClientGroup,
  listClients,
  updateClientProfile,
} from "../lib/store";
import type { ClientListItem } from "../lib/types";

type StatusFilter = "active" | "completed" | "all";

function matchesClientSearch(c: ClientListItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const invoiceHay =
    (c.invoiceNos || [c.latestInvoiceNo]).join(" ") + " " + c.latestInvoiceNo;
  const hay = [
    c.name,
    c.location,
    c.projectName,
    invoiceHay,
    c.groupId,
    ...(c.groupIds || []),
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

export function AllClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("active");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<ClientListItem | null>(null);
  const [deleting, setDeleting] = useState<ClientListItem | null>(null);
  const [completing, setCompleting] = useState<ClientListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [settling, setSettling] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      setClients(await listClients());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    let rows = clients;
    if (filter === "completed") rows = rows.filter((c) => c.completed);
    else if (filter === "active") rows = rows.filter((c) => !c.completed);
    if (search.trim()) rows = rows.filter((c) => matchesClientSearch(c, search));
    return rows;
  }, [clients, filter, search]);

  function openEdit(c: ClientListItem, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setEditing(c);
    setEditName(c.name);
    setEditLocation(c.location);
  }

  function openDelete(c: ClientListItem, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDeleting(c);
  }

  function openComplete(c: ClientListItem, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCompleting(c);
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    if (!editName.trim() || !editLocation.trim()) {
      setError("Name and location are required");
      return;
    }
    setSaving(true);
    try {
      await updateClientProfile(editing.groupId, {
        name: editName,
        location: editLocation,
      });
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onConfirmDelete() {
    if (!deleting) return;
    setRemoving(true);
    try {
      await deleteClientGroup(deleting.groupId);
      setDeleting(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setRemoving(false);
    }
  }

  async function onConfirmComplete() {
    if (!completing) return;
    setSettling(true);
    try {
      await completeClientGroup(completing.groupId);
      setCompleting(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Complete failed");
    } finally {
      setSettling(false);
    }
  }

  const emptyFilterMessage = search.trim()
    ? "No clients match your search."
    : `No ${filter === "completed" ? "completed" : "active"} clients.`;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>All Clients</h1>
          <p>Tap a client to open overview, ledger and sales</p>
        </div>
      </header>

      <div className="clients-filters">
        <label className="clients-search" aria-label="Search clients">
          <Search
            size={18}
            strokeWidth={2.25}
            aria-hidden
            className="clients-search__icon"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice, name, location, project…"
            autoComplete="off"
            enterKeyHint="search"
          />
          {search.trim() ? (
            <button
              type="button"
              className="clients-search__clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={16} strokeWidth={2.5} aria-hidden />
            </button>
          ) : null}
        </label>

        <div className="segmented" role="tablist" aria-label="Client status">
          {(
            [
              ["active", "Not complete"],
              ["completed", "Complete"],
              ["all", "All"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading && <ClientsSkeleton count={4} />}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && clients.length === 0 && (
        <section className="panel">
          <div className="empty">
            <p>No clients yet.</p>
            <Link to="/clients/new" className="btn btn-primary">
              Add new client
            </Link>
          </div>
        </section>
      )}

      {!loading && clients.length > 0 && filtered.length === 0 && (
        <section className="panel">
          <div className="empty">{emptyFilterMessage}</div>
        </section>
      )}

      {filtered.length > 0 && (
        <section className="panel">
          <div className="list">
            {filtered.map((c) => (
              <div
                key={c.groupIds?.join("-") || c.groupId}
                className="list-item client-card"
              >
                <Link
                  to={`/clients/${encodeURIComponent(c.groupId)}`}
                  className="client-card-main"
                >
                  <div>
                    <h3>
                      {c.name}
                      {c.completed ? (
                        <span
                          className="badge ok"
                          style={{ marginLeft: 8, fontSize: "0.7rem" }}
                        >
                          Complete
                        </span>
                      ) : null}
                    </h3>
                    <div className="meta">
                      {c.projectName} · {c.location}
                    </div>
                    <div className="meta">
                      {c.invoiceCount} invoice{c.invoiceCount > 1 ? "s" : ""} · #
                      {c.latestInvoiceNo}
                    </div>
                  </div>
                  <div className="client-card-amounts">
                    <div className="badge">Balance ₹{formatINR(c.balance)}</div>
                    <div className="meta">Bill ₹{formatINR(c.totalBill)}</div>
                  </div>
                </Link>
                <div className="client-card-actions">
                  {!c.completed && (
                    <button
                      type="button"
                      className="btn btn-primary btn-icon"
                      onClick={(e) => openComplete(c, e)}
                      aria-label={`Complete ${c.name}`}
                    >
                      <CheckCircle2 size={16} />
                      Complete
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-dark btn-icon"
                    onClick={(e) => openEdit(c, e)}
                    aria-label={`Edit ${c.name}`}
                  >
                    <Pencil size={16} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-icon"
                    onClick={(e) => openDelete(c, e)}
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {editing && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setEditing(null)}
        >
          <form
            className="modal-card panel"
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSaveEdit}
          >
            <h2 style={{ margin: "0 0 0.75rem", color: "#0b1f14" }}>
              Edit client
            </h2>
            <p className="meta" style={{ marginBottom: "1rem" }}>
              Only name and location can be changed
            </p>
            <div className="form-grid">
              <label className="field">
                Client name
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <label className="field">
                Location
                <input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="row-actions" style={{ marginTop: "1.25rem" }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: "#0b1f14", borderColor: "#0b1f14" }}
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      {completing && (
        <ConfirmDeleteModal
          title="Mark customer complete?"
          message={`Make sure you want to complete "${completing.name}". This will clear and settle all dues — mark all payments paid and set balance to zero.`}
          confirmLabel="Complete"
          confirmingLabel="Completing…"
          danger={false}
          confirming={settling}
          onCancel={() => setCompleting(null)}
          onConfirm={onConfirmComplete}
        />
      )}

      {deleting && (
        <ConfirmDeleteModal
          message={`Delete "${deleting.name}" and all invoices? This cannot be undone.`}
          confirming={removing}
          onCancel={() => setDeleting(null)}
          onConfirm={onConfirmDelete}
        />
      )}
    </>
  );
}
