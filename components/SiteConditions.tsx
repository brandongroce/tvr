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

export default function SiteConditions() {
  const [verifiedByGlobal, setVerifiedByGlobal] = useState<string>("");
  const [selectedSite, setSelectedSite] = useState<number | "">("");
  const [entry, setEntry] = useState<Entry | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);

  // cache in memory (mirrors localStorage) for quick merges
  const cacheRef = useRef<Record<number, Entry>>({});

  // load local cache once
  useEffect(() => {
    if (typeof window === "undefined") return;
    cacheRef.current = loadCache();
  }, []);

  // when site changes, fetch from API; fall back to cache or default
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
          // update cache copy
          cacheRef.current[site] = row;
          saveCache(cacheRef.current);
        } else {
          // nothing in DB → fallback to cache → else default
          const cached = cacheRef.current[site];
          setEntry(cached ?? makeDefault(site));
        }
      } catch {
        // offline or API error: fallback
        setOffline(true);
        const cached = cacheRef.current[site];
        setEntry(cached ?? makeDefault(site));
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedSite]);

  // simple flash for “Saved”
  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 900);
  }

  // optimistic save helper (autosave + verify button both use this)
  async function save(next: Entry) {
    setEntry(next);
    // update cache immediately
    cacheRef.current[next.site] = next;
    saveCache(cacheRef.current);

    try {
      const saved = await apiPut(next);
      setOffline(false);
      // sync back from server (e.g., if it normalized dates)
      setEntry(saved);
      cacheRef.current[saved.site] = saved;
      saveCache(cacheRef.current);
      flashSaved();
    } catch {
      // keep local cache; mark offline so the user knows DB didn’t get it (we can add a badge)
      setOffline(true);
      flashSaved(); // still show saved (local)
    }
  }

  const canVerify = useMemo(
    () => Boolean(verifiedByGlobal && selectedSite),
    [verifiedByGlobal, selectedSite]
  );

  return (
    <section className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <header className="mb-6 rounded-xl border border-[#d6d3cd] bg-white/70 backdrop-blur-sm px-4 py-3 shadow-sm">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight">Site Condition</h1>
        <p className="text-sm text-[#475569] mt-0.5">
          Choose a verifier and site, then update statuses or tap Verify.
        </p>
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

      {!entry ? (
        <div className="text-[#475569]">Choose a site to begin.</div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-[#d6d3cd] bg-white shadow-sm">
          {/* Card header */}
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
                disabled={!canVerify}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#282525] text-[#f4f0e8] hover:bg-[#3a3737] transition disabled:opacity-40 disabled:cursor-not-allowed"
                title="Set today's date and update Verified By"
              >
                <span>Verify</span>
                <span aria-hidden>✅</span>
              </button>
            </div>
          </div>

          {/* Card body */}
          <div className="grid gap-6 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <StatusSelect
                label="Picnic Table"
                value={entry.picnicTable}
                onChange={(v) => save({ ...entry, picnicTable: v })}
              />
              <StatusSelect
                label="Fire Ring"
                value={entry.fireRing}
                onChange={(v) => save({ ...entry, fireRing: v })}
              />
              <StatusSelect
                label="Slab"
                value={entry.slab}
                onChange={(v) => save({ ...entry, slab: v })}
              />
              <StatusSelect
                label="Grass & Sprinklers"
                value={entry.grassSprinklers}
                onChange={(v) => save({ ...entry, grassSprinklers: v })}
              />
              <StatusSelect
                label="Utilities"
                value={entry.utilities}
                onChange={(v) => save({ ...entry, utilities: v })}
              />
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
              <p className="text-xs text-[#64748b]">
                Tap <span className="font-medium">Verify</span> to set to today and apply the global verifier.
              </p>
            </div>
          </div>
        </div>
      )}
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