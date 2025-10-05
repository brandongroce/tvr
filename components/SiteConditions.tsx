import { useEffect, useMemo, useRef, useState } from "react";

type Status = "No Damage" | "Existing Issues" | "Damaged";
const STATUS_OPTIONS: Status[] = ["No Damage", "Existing Issues", "Damaged"];
const VERIFIED_BY_OPTIONS = ["Brandon", "Marty"] as const;
const SITE_RANGE = Array.from({ length: 66 }, (_, i) => 101 + i);

export type Entry = {
  site: number;
  picnicTable: Status;
  fireRing: Status;
  slab: Status;
  grassSprinklers: Status;
  utilities: Status;
  notes: string;
  verifiedDate: string;
  verifiedBy: string;
};

const LS_KEY = "tvr-site-conditions-cache-v1";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function makeDefault(site: number): Entry {
  return {
    site,
    picnicTable: "No Damage",
    fireRing: "No Damage",
    slab: "No Damage",
    grassSprinklers: "No Damage",
    utilities: "No Damage",
    notes: "",
    verifiedDate: "",
    verifiedBy: "",
  };
}
function loadCache(): Record<number, Entry> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Entry>;
    const out: Record<number, Entry> = {};
    Object.keys(parsed).forEach((k) => (out[Number(k)] = parsed[k as any]));
    return out;
  } catch {
    return {};
  }
}
function saveCache(obj: Record<number, Entry>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch {}
}

async function apiGet(site: number): Promise<Entry | null> {
  const res = await fetch(`/api/site-conditions?site=${site}`);
  if (!res.ok) throw new Error("GET failed");
  const json = await res.json();
  return json?.data ?? null;
}
async function apiPut(payload: Entry): Promise<Entry> {
  const res = await fetch(`/api/site-conditions`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("PUT failed");
  const json = await res.json();
  return json?.data as Entry;
}
async function apiGetAll(): Promise<Entry[]> {
  const res = await fetch(`/api/site-conditions-all`);
  if (!res.ok) throw new Error("ALL failed");
  const json = await res.json();
  return (json?.data ?? []) as Entry[];
}

export default function SiteConditions() {
  const [verifiedByGlobal, setVerifiedByGlobal] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<number | "">("");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);

  // All-sites view
const [allRows, setAllRows] = useState<Entry[]>([]);
const [allLoading, setAllLoading] = useState(false);
const [search, setSearch] = useState("");
const [statusFilter, setStatusFilter] = useState<"" | Status>("");
const [showTodayOnly, setShowTodayOnly] = useState(false); // NEW

const today = useMemo(() => todayStr(), []);

  // cache in memory (mirrors localStorage)
  const cacheRef = useRef<Record<number, Entry>>({});

  // Load cache once
  useEffect(() => {
    if (typeof window === "undefined") return;
    cacheRef.current = loadCache();
  }, []);

  // Load all rows (initial + refresh helper)
  async function refreshAll() {
    setAllLoading(true);
    try {
      const rows = await apiGetAll();
      setAllRows(rows);
    } catch {
      // If offline, render cached rows for known sites
      const cachedRows = SITE_RANGE.map((s) => cacheRef.current[s]).filter(Boolean) as Entry[];
      setAllRows(cachedRows);
    } finally {
      setAllLoading(false);
    }
  }
  useEffect(() => {
    refreshAll();
  }, []);

  // When site changes → fetch
  useEffect(() => {
    (async () => {
      if (!selectedSite) {
        setEntry(null);
        return;
      }
      const site = Number(selectedSite);
      setLoading(true);
      try {
        const row = await apiGet(site);
        setOffline(false);
        if (row) {
          setEntry(row);
          cacheRef.current[site] = row;
          saveCache(cacheRef.current);
        } else {
          const cached = cacheRef.current[site];
          setEntry(cached ?? makeDefault(site));
        }
      } catch {
        setOffline(true);
        const cached = cacheRef.current[site];
        setEntry(cached ?? makeDefault(site));
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedSite]);

  // Saved flash
  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 900);
  }

  // Save helper (optimistic)
  async function save(next: Entry) {
    setEntry(next);
    cacheRef.current[next.site] = next;
    saveCache(cacheRef.current);

    try {
      const saved = await apiPut(next);
      setOffline(false);
      setEntry(saved);
      cacheRef.current[saved.site] = saved;
      saveCache(cacheRef.current);
      flashSaved();
      // refresh list below
      refreshAll();
    } catch {
      setOffline(true);
      flashSaved();
      // still refresh (list shows cached if offline)
      refreshAll();
    }
  }

  const canVerify = useMemo(
    () => Boolean(verifiedByGlobal && selectedSite),
    [verifiedByGlobal, selectedSite]
  );

  // --- UI helpers for list ---
  const cols: { key: keyof Entry; label: string }[] = [
    { key: "picnicTable", label: "Picnic" },
    { key: "fireRing", label: "Fire" },
    { key: "slab", label: "Slab" },
    { key: "grassSprinklers", label: "Grass/Sprinklers" },
    { key: "utilities", label: "Utilities" },
  ];
  function badgeClass(v: string) {
    if (v === "Damaged") return "bg-red-50 text-red-700 border-red-200";
    if (v === "Existing Issues") return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-green-50 text-green-700 border-green-200";
  }
const filteredRows = useMemo(() => {
  let rows = allRows.slice();

  // search
  const q = search.trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) =>
      String(r.site).includes(q) ||
      (r.notes || "").toLowerCase().includes(q) ||
      (r.verifiedBy || "").toLowerCase().includes(q)
    );
  }

  // status filter
  if (statusFilter) {
    rows = rows.filter(
      (r) =>
        r.picnicTable === statusFilter ||
        r.fireRing === statusFilter ||
        r.slab === statusFilter ||
        r.grassSprinklers === statusFilter ||
        r.utilities === statusFilter
    );
  }

  // today-only filter (NEW)
  if (showTodayOnly) {
    rows = rows.filter((r) => r.verifiedDate === today);
  }

  return rows;
}, [allRows, search, statusFilter, showTodayOnly, today]);

const todayCount = useMemo(
  () => allRows.reduce((acc, r) => acc + (r.verifiedDate === today ? 1 : 0), 0),
  [allRows, today]
);

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <header className="mb-6 rounded-xl border border-[#d6d3cd] bg-white/70 backdrop-blur-sm px-4 py-3 shadow-sm">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Site Condition</h1>
        <p className="text-sm text-[#475569] mt-0.5">Choose a verifier and site, then update statuses or tap Verify.</p>
      </header>

      {/* Global controls */}
      <div className="mb-6 grid gap-3 md:grid-cols-2 items-end rounded-xl border border-[#d6d3cd] bg-white p-4 shadow-sm">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Verified By</span>
          <select
            className="border rounded-lg px-3 py-2 bg-white text-[#0f172a] border-[#d6d3cd] focus:outline-none focus:ring-2 focus:ring-[#c4c0b0]/60"
            value={verifiedByGlobal}
            onChange={(e) => setVerifiedByGlobal(e.target.value)}
          >
            <option value="">Select…</option>
            {VERIFIED_BY_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Site</span>
          <select
            className="border rounded-lg px-3 py-2 bg-white text-[#0f172a] border-[#d6d3cd] min-w-[8rem] focus:outline-none focus:ring-2 focus:ring-[#c4c0b0]/60"
            value={String(selectedSite)}
            onChange={(e) => setSelectedSite(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select site…</option>
            {SITE_RANGE.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Status bar */}
      <div className="mb-3 text-xs flex items-center gap-3 min-h-[1.25rem]">
        {loading && <span className="text-[#64748b]">Loading…</span>}
        {savedFlash && <span className="text-green-600 font-medium">✔ Saved</span>}
        {offline && <span className="text-amber-600">Offline (saved locally)</span>}
      </div>

      {/* Editor card */}
      {!entry ? (
        <div className="text-[#475569]">Choose a site to begin.</div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-[#d6d3cd] bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-[#f4f0e8] to-white px-4 py-3 border-b border-[#e7e4de]">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d6d3cd] bg-white px-3 py-1 text-sm">
                <span className="font-semibold tracking-wide">Site</span>
                <span className="font-bold text-[#282525]">{entry.site}</span>
              </div>
              <div className="text-xs sm:text-sm text-[#475569]">
                Verified By: <span className="font-medium">{entry.verifiedBy || "—"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  save({
                    ...entry,
                    verifiedDate: todayStr(),
                    verifiedBy: verifiedByGlobal || entry.verifiedBy,
                  })
                }
                disabled={!verifiedByGlobal || !selectedSite}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#282525] text-[#f4f0e8] hover:bg-[#3a3737] transition disabled:opacity-40 disabled:cursor-not-allowed"
                title="Set today's date and update Verified By"
              >
                <span>Verify</span>
                <span aria-hidden>✅</span>
              </button>
            </div>
          </div>

          <div className="grid gap-6 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <StatusSelect label="Picnic Table" value={entry.picnicTable} onChange={(v) => save({ ...entry, picnicTable: v })} />
              <StatusSelect label="Fire Ring" value={entry.fireRing} onChange={(v) => save({ ...entry, fireRing: v })} />
              <StatusSelect label="Slab" value={entry.slab} onChange={(v) => save({ ...entry, slab: v })} />
              <StatusSelect label="Grass & Sprinklers" value={entry.grassSprinklers} onChange={(v) => save({ ...entry, grassSprinklers: v })} />
              <StatusSelect label="Utilities" value={entry.utilities} onChange={(v) => save({ ...entry, utilities: v })} />
            </div>

            <label className="grid gap-1">
              <span className="text-sm font-medium">Notes</span>
              <textarea
                className="border rounded-xl px-3 py-2 bg-white text-[#0f172a] min-h-[110px] border-[#d6d3cd] focus:outline-none focus:ring-2 focus:ring-[#c4c0b0]/60"
                value={entry.notes}
                onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
                onBlur={(e) => save({ ...entry, notes: e.target.value })}
              />
            </label>

            <div className="grid gap-1 w-56">
              <span className="text-sm font-medium">Verified Date</span>
              <input
                type="date"
                className="border rounded-lg px-3 py-2 bg-white text-[#0f172a] border-[#d6d3cd] focus:outline-none focus:ring-2 focus:ring-[#c4c0b0]/60"
                value={entry.verifiedDate}
                onChange={(e) => setEntry({ ...entry, verifiedDate: e.target.value })}
                onBlur={(e) => save({ ...entry, verifiedDate: e.target.value })}
                placeholder={todayStr()}
              />
              <p className="text-xs text-[#64748b]">Tap <span className="font-medium">Verify</span> to set to today and apply the global verifier.</p>
            </div>
          </div>
        </div>
      )}

      {/* --- All Sites List ------------------------------------------------- */}
      <div className="mt-8 rounded-2xl border border-[#d6d3cd] bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-[#e7e4de] bg-gradient-to-r from-white to-[#f9f7f2]">
          <h2 className="text-base font-semibold flex items-center gap-2">
            All Sites
            <span className="text-xs font-medium text-[#475569]">
                Today: {todayCount}
            </span>
            </h2>
          <button
            type="button"
            onClick={() => setShowTodayOnly(v => !v)}
            className={`border rounded-lg px-3 py-2 transition ${
            showTodayOnly
            ? "bg-[#282525] text-[#f4f0e8] border-[#282525]"
            : "border-[#d6d3cd] text-[#282525] hover:bg-[#c4c0b0]/20"
            }`}
            title="Show only sites verified today"
            >
            {showTodayOnly ? "Showing: Verified Today" : "Only Today"}
            </button>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              className="border rounded-lg px-3 py-2 bg-white text-[#0f172a] border-[#d6d3cd] focus:outline-none focus:ring-2 focus:ring-[#c4c0b0]/60"
              placeholder="Search site #, notes, verified by…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="border rounded-lg px-3 py-2 bg-white text-[#0f172a] border-[#d6d3cd] focus:outline-none focus:ring-2 focus:ring-[#c4c0b0]/60"
              value={statusFilter}
              onChange={(e) => setStatusFilter((e.target.value || "") as any)}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={refreshAll}
              className="border rounded-lg px-3 py-2 border-[#d6d3cd] text-[#282525] hover:bg-[#c4c0b0]/20 transition"
            >
              {allLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#f4f0e8] text-[#282525]">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                <th>Site</th>
                {cols.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>Verified</th>
                <th>By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.site} className="border-t border-[#f0ede6] hover:bg-[#faf9f6]">
                  <td className="px-3 py-2 font-medium">{r.site}</td>
                  {cols.map((c) => {
                    const val = r[c.key] as string;
                    return (
                      <td key={c.key} className="px-3 py-2">
                        <span className={`inline-block rounded-full border px-2 py-0.5 ${badgeClass(val)}`}>{val}</span>
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">{r.verifiedDate || "—"}</td>
                  <td className="px-3 py-2">{r.verifiedBy || "—"}</td>
                  <td className="px-3 py-2 max-w-[28rem] truncate" title={r.notes}>
                    {r.notes || "—"}
                  </td>
                </tr>
              ))}

              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={cols.length + 4} className="px-3 py-6 text-center text-[#64748b]">
                    {allLoading ? "Loading…" : "No rows match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* -------------------------------------------------------------------- */}
    </section>
  );
}

function StatusSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Status;
  onChange: (v: Status) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-sm font-medium">{label}</span>
      <select
        className="border rounded-lg px-3 py-2 bg-white text-[#0f172a] border-[#d6d3cd] focus:outline-none focus:ring-2 focus:ring-[#c4c0b0]/60"
        value={value}
        onChange={(e) => onChange(e.target.value as Status)}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}