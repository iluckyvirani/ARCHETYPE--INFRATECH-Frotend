import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { formatINR } from "../lib/calc";
import {
  deleteClientGroup,
  listClients,
  updateClientProfile,
} from "../lib/store";
import type { ClientListItem } from "../lib/types";

export function AllClientsPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<ClientListItem | null>(null);
  const [deleting, setDeleting] = useState<ClientListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

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

  return (
    <>
      <header className="page-header">
        <div>
          <h1>All Clients</h1>
          <p>Tap a client to open overview, ledger and sales</p>
        </div>
      </header>

      {loading && <p className="empty home-status">Loading…</p>}
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

      {clients.length > 0 && (
        <section className="panel">
          <div className="list">
            {clients.map((c) => (
              <div
                key={c.groupIds?.join("-") || c.groupId}
                className="list-item client-card"
              >
                <Link to={`/clients/${c.groupId}`} className="client-card-main">
                  <div>
                    <h3>{c.name}</h3>
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
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
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
