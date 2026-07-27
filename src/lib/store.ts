import type {
  AlertRow,
  Client,
  ClientListItem,
  ClientPayload,
  Invoice,
  InvoicePayload,
  NotificationItem,
  ScheduleItem,
} from "./types";
import { buildSchedulePreview, calcTotals, todayISO } from "./calc";
import { apiFetch } from "../api";

const USE_API = true;
const STORAGE_KEY = "artech-bill-store-v3";

type StoreSnapshot = {
  invoices: Invoice[];
  schedule: ScheduleItem[];
  notifications: NotificationItem[];
};

function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeInvoice(c: Invoice): Invoice {
  let createdAt = String(c.createdAt || "");
  if (createdAt && !/^\d{4}-\d{2}-\d{2}/.test(createdAt)) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) createdAt = d.toISOString();
  }
  let advanceDate = c.advanceDate ?? null;
  if (advanceDate) {
    const day = String(advanceDate).match(/^(\d{4}-\d{2}-\d{2})/);
    if (day) advanceDate = day[1];
    else {
      const d = new Date(advanceDate);
      if (!Number.isNaN(d.getTime())) {
        advanceDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
    }
  }
  return {
    ...c,
    groupId: c.groupId || c.id,
    additionalWorks: c.additionalWorks || [],
    additionalTotal: c.additionalTotal ?? 0,
    createdAt,
    advanceDate,
    advanceAmount: Number(c.advanceAmount) || 0,
    balance: Number(c.balance) || 0,
    totalBill: Number(c.totalBill) || 0,
    completed: Boolean(c.completed),
    completedAt: c.completedAt ?? null,
  };
}

function nextInvoiceNo(invoices: Invoice[]): string {
  const max = invoices.reduce((m, c) => {
    const n = parseInt(c.invoiceNo.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return String(max + 1).padStart(3, "0");
}

function loadLocal(): StoreSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreSnapshot;
      if (parsed.invoices?.length) {
        return {
          invoices: parsed.invoices.map(normalizeInvoice),
          schedule: (parsed.schedule || []).map((s) => ({
            ...s,
            invoiceId: s.invoiceId || s.clientId,
          })),
          notifications: parsed.notifications || [],
        };
      }
    }
    // migrate older keys
    for (const key of ["artech-bill-store-v2", "artech-bill-store-v1"]) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      const old = JSON.parse(legacy) as {
        clients?: Invoice[];
        invoices?: Invoice[];
        schedule?: ScheduleItem[];
        notifications?: NotificationItem[];
      };
      const source = old.invoices || old.clients || [];
      if (!source.length) continue;
      const invoices = source.map((c) =>
        normalizeInvoice({ ...c, groupId: c.groupId || c.id })
      );
      const schedule = (old.schedule || []).map((s) => ({
        ...s,
        invoiceId: s.invoiceId || s.clientId,
      }));
      const data = {
        invoices,
        schedule,
        notifications: old.notifications || [],
      };
      saveLocal(data);
      return data;
    }
  } catch {
    /* ignore */
  }
  return { invoices: [], schedule: [], notifications: [] };
}

function saveLocal(data: StoreSnapshot) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function buildInvoice(
  payload: ClientPayload,
  existing: Invoice[],
  groupId: string
): { invoice: Invoice; schedule: ScheduleItem[]; notifications: NotificationItem[] } {
  const totals = calcTotals(payload);
  const id = uid("inv");
  const invoice: Invoice = {
    id,
    groupId,
    invoiceNo: nextInvoiceNo(existing),
    name: payload.name.trim(),
    location: payload.location.trim(),
    projectName: payload.projectName.trim(),
    feeMode: payload.feeMode,
    areaSqft: payload.areaSqft ?? null,
    costPerSqft: payload.costPerSqft ?? null,
    feePercent: payload.feePercent ?? null,
    projectCost: totals.projectCost,
    feeAmount: totals.feeAmount,
    fixedAmount: payload.fixedAmount ?? null,
    additionalWorks: (payload.additionalWorks || []).filter(
      (w) => w.name.trim() && (Number(w.qty) > 0 || Number(w.rate) > 0)
    ),
    additionalTotal: totals.additionalTotal,
    totalBill: totals.totalBill,
    advanceAmount: Number(payload.advanceAmount) || 0,
    advanceDate: payload.advanceDate || null,
    balance: totals.balance,
    paymentPlan: payload.paymentPlan,
    installmentMode: payload.installmentMode ?? null,
    installmentMonths: payload.installmentMonths ?? null,
    installmentCount: payload.installmentCount ?? null,
    oneTimeDueDate: payload.oneTimeDueDate ?? null,
    createdAt: new Date().toISOString(),
  };

  const preview = buildSchedulePreview({
    clientId: groupId,
    balance: totals.balance,
    advanceAmount: invoice.advanceAmount,
    advanceDate: invoice.advanceDate,
    paymentPlan: payload.paymentPlan,
    installmentMode: payload.installmentMode,
    installmentMonths: payload.installmentMonths,
    installmentCount: payload.installmentCount,
    installmentDueDates: payload.installmentDueDates,
    oneTimeDueDate: payload.oneTimeDueDate,
    stages: payload.stages,
  });

  const schedule: ScheduleItem[] = preview.map((row) => ({
    ...row,
    id: uid("sch"),
    invoiceId: id,
    clientId: groupId,
  }));

  const notifications: NotificationItem[] = schedule
    .filter((s) => !(s.kind === "advance" && s.paid))
    .map((s) => {
      const overdueOrDue = s.dueDate <= todayISO();
      const isAdvance = s.kind === "advance";
      let title = "Upcoming payment";
      if (overdueOrDue) {
        title = isAdvance ? "Advance payment due" : "Payment due";
      } else if (isAdvance) {
        title = "Upcoming advance";
      }
      return {
        id: uid("ntf"),
        clientId: groupId,
        scheduleItemId: s.id,
        title,
        message: `${invoice.name} — ${s.label} ₹${s.amount.toLocaleString("en-IN")} due ${s.dueDate}`,
        dueDate: s.dueDate,
        read: false,
        createdAt: new Date().toISOString(),
      };
    });

  return { invoice, schedule, notifications };
}

function personKey(name: string, location: string): string {
  return `${name.trim().toLowerCase()}||${location.trim().toLowerCase()}`;
}

function toListItems(invoices: Invoice[]): ClientListItem[] {
  // 1) Group by groupId
  const byGroup = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    const g = inv.groupId || inv.id;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(inv);
  }

  // 2) Merge groups that are the same customer (same name + location)
  const byPerson = new Map<
    string,
    { groupIds: Set<string>; invoices: Invoice[] }
  >();
  for (const [gid, rows] of byGroup) {
    const sample = rows[0];
    const key = personKey(sample.name, sample.location);
    const bucket = byPerson.get(key) || {
      groupIds: new Set<string>(),
      invoices: [],
    };
    bucket.groupIds.add(gid);
    const seen = new Set(bucket.invoices.map((i) => i.id));
    for (const inv of rows) {
      if (!seen.has(inv.id)) {
        seen.add(inv.id);
        bucket.invoices.push(inv);
      }
    }
    byPerson.set(key, bucket);
  }

  const items: ClientListItem[] = [];
  for (const bucket of byPerson.values()) {
    // Same invoice number for same customer = duplicate sync clone — keep newest
    const byNo = new Map<string, Invoice>();
    for (const inv of bucket.invoices) {
      const no = inv.invoiceNo || inv.id;
      const prev = byNo.get(no);
      if (!prev || inv.createdAt > prev.createdAt) byNo.set(no, inv);
    }
    const rows = [...byNo.values()].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
    const latest = rows[0];
    const oldest = rows[rows.length - 1];
    const groupIds = [...bucket.groupIds];
    const preferred =
      groupIds.find((g) => g.startsWith("grp_")) ||
      oldest.groupId ||
      oldest.id ||
      groupIds[0];

    items.push({
      groupId: preferred,
      groupIds,
      name: latest.name,
      location: latest.location,
      projectName: latest.projectName,
      invoiceCount: rows.length,
      totalBill: rows.reduce((s, r) => s + r.totalBill, 0),
      balance: rows.reduce((s, r) => s + r.balance, 0),
      latestInvoiceNo: latest.invoiceNo,
      createdAt: oldest.createdAt,
      completed: rows.every((r) => Boolean(r.completed)),
    });
  }
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function buildGroupResult(
  groupId: string,
  invoices: Invoice[],
  schedule: ScheduleItem[]
) {
  const sorted = [...invoices].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  const ids = new Set(sorted.map((i) => i.id));
  const gid = sorted[0].groupId || sorted[0].id || groupId;
  return {
    groupId: gid,
    name: sorted[0].name,
    location: sorted[0].location,
    createdAt: sorted[sorted.length - 1].createdAt,
    invoices: sorted,
    schedule: schedule.filter(
      (s) =>
        s.clientId === groupId ||
        s.clientId === gid ||
        ids.has(s.invoiceId) ||
        ids.has(s.clientId)
    ),
  };
}

export async function listClients(): Promise<ClientListItem[]> {
  if (USE_API) {
    try {
      const apiRows = (await apiFetch<Invoice[]>("/api/clients")).map(
        normalizeInvoice
      );
      // Prefer server as source of truth — drop local clones of the same invoices
      const data = loadLocal();
      const apiIds = new Set(apiRows.map((i) => i.id));
      const apiNos = new Set(
        apiRows.map((i) => `${personKey(i.name, i.location)}::${i.invoiceNo}`)
      );
      data.invoices = [
        ...apiRows,
        ...data.invoices
          .map(normalizeInvoice)
          .filter((i) => {
            if (apiIds.has(i.id)) return false;
            const key = `${personKey(i.name, i.location)}::${i.invoiceNo}`;
            return !apiNos.has(key);
          }),
      ];
      saveLocal(data);
      return toListItems(data.invoices);
    } catch {
      /* local only */
    }
  }

  return toListItems(loadLocal().invoices.map(normalizeInvoice));
}

function dedupeInvoicesByNo(invoices: Invoice[]): Invoice[] {
  const byNo = new Map<string, Invoice>();
  for (const inv of invoices) {
    const no = inv.invoiceNo || inv.id;
    const prev = byNo.get(no);
    if (!prev || inv.createdAt > prev.createdAt) byNo.set(no, inv);
  }
  return [...byNo.values()];
}

function invoicesForPerson(
  all: Invoice[],
  groupId: string,
  name?: string,
  location?: string
): Invoice[] {
  const direct = all.filter(
    (i) => (i.groupId || i.id) === groupId || i.id === groupId
  );
  if (!direct.length && !name) return [];
  const n = name ?? direct[0]?.name;
  const loc = location ?? direct[0]?.location;
  if (!n || loc == null) return dedupeInvoicesByNo(direct);
  const key = personKey(n, loc);
  const merged = all.filter((i) => personKey(i.name, i.location) === key);
  return dedupeInvoicesByNo(merged.length ? merged : direct);
}

export async function getClientGroup(groupId: string): Promise<{
  groupId: string;
  name: string;
  location: string;
  createdAt: string;
  invoices: Invoice[];
  schedule: ScheduleItem[];
} | null> {
  if (!groupId || groupId === "undefined" || groupId === "null") {
    return null;
  }

  // 1) Dedicated group API + expand to same name/location
  if (USE_API) {
    try {
      const data = await apiFetch<{
        groupId: string;
        name: string;
        location: string;
        createdAt: string;
        invoices: Invoice[];
        schedule: ScheduleItem[];
      }>(`/api/clients/group/${groupId}`);
      if (data?.invoices?.length) {
        let invoices = data.invoices.map(normalizeInvoice);
        try {
          const all = (await apiFetch<Invoice[]>("/api/clients")).map(
            normalizeInvoice
          );
          invoices = invoicesForPerson(
            all,
            groupId,
            data.name,
            data.location
          );
        } catch {
          /* keep group invoices */
        }

        const schedule: ScheduleItem[] = [];
        const seen = new Set<string>();
        // Always load schedule for every invoice (group query can miss after merges)
        for (const inv of invoices) {
          try {
            const one = await apiFetch<{
              client: Invoice;
              schedule: ScheduleItem[];
            }>(`/api/clients/${inv.id}`);
            for (const s of one.schedule || []) {
              if (!seen.has(s.id)) {
                seen.add(s.id);
                schedule.push({
                  ...s,
                  invoiceId: s.invoiceId || inv.id,
                  dueDate: String(s.dueDate).slice(0, 10),
                  paidAt: s.paidAt ? String(s.paidAt).slice(0, 10) : null,
                });
              }
            }
          } catch {
            /* skip */
          }
        }
        // Merge any rows returned by the group endpoint
        for (const s of data.schedule || []) {
          if (!seen.has(s.id)) {
            seen.add(s.id);
            schedule.push({
              ...s,
              invoiceId: s.invoiceId || invoices[0]?.id,
              dueDate: String(s.dueDate).slice(0, 10),
              paidAt: s.paidAt ? String(s.paidAt).slice(0, 10) : null,
            });
          }
        }

        // Local fallback if API schedule empty
        if (!schedule.length) {
          const local = loadLocal();
          const invIds = new Set(invoices.map((i) => i.id));
          const gids = new Set(
            invoices.map((i) => i.groupId || i.id).concat([groupId])
          );
          for (const s of local.schedule) {
            if (
              invIds.has(s.invoiceId) ||
              invIds.has(s.clientId) ||
              gids.has(s.clientId)
            ) {
              if (!seen.has(s.id)) {
                seen.add(s.id);
                schedule.push(s);
              }
            }
          }
        }

        schedule.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

        return buildGroupResult(
          data.groupId || groupId,
          invoices,
          schedule
        );
      }
    } catch {
      /* try other sources */
    }

    // 2) Fallback: load all invoices from API and filter by person
    try {
      const rows = (await apiFetch<Invoice[]>("/api/clients")).map(
        normalizeInvoice
      );
      const seed = rows.find(
        (i) => (i.groupId || i.id) === groupId || i.id === groupId
      );
      const invoices = seed
        ? invoicesForPerson(rows, groupId, seed.name, seed.location)
        : rows.filter(
            (i) => (i.groupId || i.id) === groupId || i.id === groupId
          );
      if (invoices.length) {
        const schedule: ScheduleItem[] = [];
        const seen = new Set<string>();
        for (const inv of invoices) {
          try {
            const one = await apiFetch<{
              client: Invoice;
              schedule: ScheduleItem[];
            }>(`/api/clients/${inv.id}`);
            for (const s of one.schedule || []) {
              if (!seen.has(s.id)) {
                seen.add(s.id);
                schedule.push({
                  ...s,
                  invoiceId: s.invoiceId || inv.id,
                });
              }
            }
          } catch {
            /* skip */
          }
        }
        return buildGroupResult(groupId, invoices, schedule);
      }
    } catch {
      /* local */
    }
  }

  // 3) Local storage — merge same customer
  const data = loadLocal();
  const all = data.invoices.map(normalizeInvoice);
  const seed = all.find(
    (i) => (i.groupId || i.id) === groupId || i.id === groupId
  );
  const invoices = (
    seed
      ? invoicesForPerson(all, groupId, seed.name, seed.location)
      : all.filter(
          (i) => (i.groupId || i.id) === groupId || i.id === groupId
        )
  ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (!invoices.length) return null;
  return buildGroupResult(groupId, invoices, data.schedule);
}

/** @deprecated use getClientGroup — kept for print by invoice id */
export async function getClient(id: string): Promise<{
  client: Client;
  schedule: ScheduleItem[];
} | null> {
  if (USE_API) {
    try {
      const data = await apiFetch<{ client: Client; schedule: ScheduleItem[] }>(
        `/api/clients/${id}`
      );
      return {
        client: normalizeInvoice(data.client),
        schedule: data.schedule,
      };
    } catch {
      /* fall through */
    }
  }
  const data = loadLocal();
  const invoice = data.invoices.find((c) => c.id === id);
  if (!invoice) return null;
  return {
    client: normalizeInvoice(invoice),
    schedule: data.schedule.filter(
      (s) => s.invoiceId === id || s.clientId === id
    ),
  };
}

export async function createClient(payload: ClientPayload): Promise<Client> {
  const data = loadLocal();
  const groupId = uid("grp");
  const created = buildInvoice(payload, data.invoices, groupId);
  const localInvoiceId = created.invoice.id;

  data.invoices.unshift(created.invoice);
  data.schedule.push(...created.schedule);
  data.notifications.unshift(...created.notifications);
  saveLocal(data);

  if (USE_API) {
    try {
      const remote = normalizeInvoice(
        await apiFetch<Client>("/api/clients", {
          method: "POST",
          body: JSON.stringify(payload),
        })
      );
      // Replace local stub with server invoice (avoid duplicate cards)
      data.invoices = data.invoices.filter((i) => i.id !== localInvoiceId);
      data.schedule = data.schedule.filter((s) => s.invoiceId !== localInvoiceId);
      data.notifications = data.notifications.filter(
        (n) => n.clientId !== groupId
      );

      const synced: Invoice = {
        ...created.invoice,
        ...remote,
        id: remote.id,
        groupId: remote.groupId || groupId,
        invoiceNo: remote.invoiceNo || created.invoice.invoiceNo,
      };
      data.invoices.unshift(synced);
      data.schedule.push(
        ...created.schedule.map((s) => ({
          ...s,
          invoiceId: remote.id,
          clientId: remote.id,
        }))
      );
      saveLocal(data);
      return synced;
    } catch {
      /* keep local copy */
    }
  }

  return created.invoice;
}

export async function createInvoiceForClient(
  groupId: string,
  payload: InvoicePayload
): Promise<Client> {
  const data = loadLocal();
  let existing = data.invoices.filter(
    (i) => (i.groupId || i.id) === groupId || i.id === groupId
  );

  if (!existing.length && USE_API) {
    try {
      const rows = await apiFetch<Invoice[]>("/api/clients");
      existing = rows
        .map(normalizeInvoice)
        .filter((i) => (i.groupId || i.id) === groupId || i.id === groupId);
      for (const inv of existing) {
        if (!data.invoices.some((x) => x.id === inv.id)) {
          data.invoices.push(inv);
        }
      }
      saveLocal(data);
    } catch {
      /* ignore */
    }
  }

  if (!existing.length) throw new Error("Client not found");

  const resolvedGroup = existing[0].groupId || groupId;
  const name = existing[0].name;
  const created = buildInvoice(
    { ...payload, name } as ClientPayload,
    data.invoices,
    resolvedGroup
  );

  data.invoices.unshift(created.invoice);
  data.schedule.push(...created.schedule);
  data.notifications.unshift(...created.notifications);
  saveLocal(data);

  if (USE_API) {
    try {
      const remote = normalizeInvoice(
        await apiFetch<Client>(`/api/clients/group/${resolvedGroup}/invoices`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
      );
      const idx = data.invoices.findIndex((i) => i.id === created.invoice.id);
      if (idx >= 0) {
        data.invoices[idx] = {
          ...created.invoice,
          id: remote.id,
          groupId: remote.groupId || resolvedGroup,
          invoiceNo: remote.invoiceNo || created.invoice.invoiceNo,
        };
        data.schedule = data.schedule.map((s) =>
          s.invoiceId === created.invoice.id
            ? {
                ...s,
                invoiceId: remote.id,
                clientId: remote.groupId || resolvedGroup,
              }
            : s
        );
        saveLocal(data);
        return data.invoices[idx];
      }
      return remote;
    } catch {
      /* keep local */
    }
  }

  return created.invoice;
}

export async function updateClientProfile(
  groupId: string,
  profile: { name: string; location: string }
): Promise<void> {
  const name = profile.name.trim();
  const location = profile.location.trim();
  if (!name || !location) throw new Error("Name and location are required");

  const data = loadLocal();
  data.invoices = data.invoices.map((inv) =>
    (inv.groupId || inv.id) === groupId || inv.id === groupId
      ? { ...inv, name, location }
      : inv
  );
  saveLocal(data);

  if (USE_API) {
    try {
      await apiFetch(`/api/clients/group/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name, location }),
      });
    } catch {
      /* local already updated */
    }
  }
}

/** Mark customer complete: settle all dues, clear balance */
export async function completeClientGroup(groupId: string): Promise<void> {
  const today = todayISO();
  const data = loadLocal();
  const all = data.invoices.map(normalizeInvoice);
  const target = all.filter(
    (inv) =>
      (inv.groupId || inv.id) === groupId ||
      inv.id === groupId ||
      inv.groupId === groupId
  );
  const ids = new Set(target.map((i) => i.id));
  const gids = new Set(
    target.flatMap((i) => [i.groupId || i.id, i.id])
  );

  data.invoices = data.invoices.map((inv) =>
    ids.has(inv.id) || gids.has(inv.groupId || inv.id)
      ? {
          ...inv,
          balance: 0,
          completed: true,
          completedAt: today,
        }
      : inv
  );
  data.schedule = data.schedule.map((s) =>
    ids.has(s.invoiceId) ||
    ids.has(s.clientId) ||
    gids.has(s.clientId) ||
    s.clientId === groupId
      ? { ...s, paid: true, paidAt: s.paidAt || today }
      : s
  );
  saveLocal(data);

  if (USE_API) {
    try {
      await apiFetch(`/api/clients/group/${groupId}/complete`, {
        method: "POST",
      });
    } catch {
      /* local already updated */
    }
  }
}

export async function deleteClientGroup(groupId: string): Promise<void> {
  const data = loadLocal();
  const all = data.invoices.map(normalizeInvoice);
  const seed = all.find(
    (i) => (i.groupId || i.id) === groupId || i.id === groupId
  );
  const toRemove = seed
    ? invoicesForPerson(all, groupId, seed.name, seed.location)
    : all.filter(
        (i) => (i.groupId || i.id) === groupId || i.id === groupId
      );

  const invoiceIds = new Set(toRemove.map((i) => i.id));
  const groupIds = new Set(
    toRemove.map((i) => i.groupId || i.id).concat([groupId])
  );

  data.invoices = data.invoices.filter((i) => !invoiceIds.has(i.id));
  data.schedule = data.schedule.filter(
    (s) =>
      !groupIds.has(s.clientId) &&
      !invoiceIds.has(s.clientId) &&
      !invoiceIds.has(s.invoiceId)
  );
  data.notifications = data.notifications.filter(
    (n) => !groupIds.has(n.clientId) && !invoiceIds.has(n.clientId)
  );
  saveLocal(data);

  if (USE_API) {
    for (const gid of groupIds) {
      try {
        await apiFetch(`/api/clients/group/${gid}`, { method: "DELETE" });
      } catch {
        /* continue */
      }
    }
  }
}

export async function markSchedulePaid(
  clientId: string,
  scheduleId: string,
  paid: boolean,
  paidAt?: string | null
): Promise<void> {
  const paidAtValue = paid ? paidAt || todayISO() : null;
  if (USE_API) {
    try {
      await apiFetch(`/api/clients/${clientId}/schedule/${scheduleId}`, {
        method: "PATCH",
        body: JSON.stringify({ paid, paidAt: paidAtValue }),
      });
      return;
    } catch {
      /* fall through */
    }
  }
  const data = loadLocal();
  data.schedule = data.schedule.map((s) =>
    s.id === scheduleId
      ? { ...s, paid, paidAt: paidAtValue }
      : s
  );
  saveLocal(data);
}

export async function listNotifications(): Promise<AlertRow[]> {
  if (USE_API) {
    try {
      return await apiFetch("/api/notifications");
    } catch {
      /* fall through */
    }
  }
  const data = loadLocal();
  const today = todayISO();
  return data.schedule
    .filter(
      (s) =>
        !s.paid &&
        s.dueDate <= today &&
        ["installment", "one_time", "stage", "advance"].includes(s.kind)
    )
    .map((sch) => {
      const inv = data.invoices.find(
        (c) => c.id === sch.invoiceId || c.id === sch.clientId
      );
      const n = data.notifications.find((x) => x.scheduleItemId === sch.id);
      const name = inv?.name || "Client";
      const overdue = sch.dueDate < today;
      return {
        id: n?.id || sch.id,
        clientId: inv?.groupId || inv?.id || sch.clientId,
        scheduleItemId: sch.id,
        title:
          sch.kind === "advance"
            ? overdue
              ? "Advance overdue"
              : "Advance payment due"
            : overdue
              ? "EMI overdue"
              : "EMI due today",
        message: `${name} — ${sch.label} · ₹${sch.amount}`,
        dueDate: sch.dueDate,
        read: n?.read ?? false,
        createdAt: n?.createdAt || "",
        clientName: name,
        scheduleKind: sch.kind,
        schedulePaid: false,
        amount: sch.amount,
        scheduleLabel: sch.label,
        invoiceId: sch.invoiceId || inv?.id || null,
      } satisfies AlertRow;
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function markNotificationRead(id: string): Promise<void> {
  if (USE_API) {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      return;
    } catch {
      /* fall through */
    }
  }
  const data = loadLocal();
  data.notifications = data.notifications.map((n) =>
    n.id === id ? { ...n, read: true } : n
  );
  saveLocal(data);
}
