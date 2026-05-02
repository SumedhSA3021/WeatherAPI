import { useState, useEffect, useRef } from "react";
import { geocodeCity, countryFlag } from "../utils/weatherService";

export default function SearchBar({ city, setCity, onSelect, loading }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const abortRef = useRef(null);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);

  /* ── Debounced geocoding on keystroke ─────── */
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (city.trim().length < 2) { setResults([]); setOpen(false); return; }

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const res = await geocodeCity(city.trim(), ctrl.signal);
      if (ctrl.signal.aborted) return;
      setResults(res);
      setOpen(res.length > 0);
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [city]);

  /* ── Close on outside click or Escape ─────── */
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, []);

  /* ── Select a result ─────────────────────── */
  const handlePick = (item) => {
    setCity(item.name);
    setOpen(false);
    setResults([]);
    onSelect(item); // { lat, lon, name, country, ... }
  };

  /* ── Form submit (Enter key / button) ────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const q = city.trim();
    if (q.length < 2) return;

    // If dropdown has exactly 1 result, auto-select it
    if (results.length === 1) { handlePick(results[0]); return; }
    if (results.length > 1) { setOpen(true); return; }

    // No cached results — do a fresh geocode
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const res = await geocodeCity(q, ctrl.signal);
    if (ctrl.signal.aborted) return;

    if (res.length === 0) {
      setShake(true); setTimeout(() => setShake(false), 600);
      return;
    }
    if (res.length === 1) { handlePick(res[0]); return; }
    setResults(res); setOpen(true);
  };

  return (
    <div
      ref={wrapRef}
      className="fixed top-7 left-1/2 -translate-x-1/2 z-[100]"
      style={{ width: "clamp(300px, 45vw, 560px)" }}
    >
      <form
        onSubmit={handleSubmit}
        className={`flex items-center rounded-full bg-white/[0.08] backdrop-blur-xl
                   border border-white/[0.15] shadow-[0_4px_24px_rgba(0,0,0,0.25)]
                   transition-transform ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
      >
        <input
          id="city-input"
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onFocus={() => results.length > 1 && setOpen(true)}
          placeholder="Search city…"
          autoComplete="off"
          className="flex-1 bg-transparent px-6 py-3 text-sm text-white
                     placeholder-white/40 outline-none"
        />
        <button
          id="search-btn"
          type="submit"
          disabled={loading || city.trim().length < 2}
          className="mr-1.5 rounded-full bg-indigo-500 hover:bg-indigo-400
                     disabled:opacity-40 disabled:cursor-not-allowed
                     px-5 py-2 text-sm font-medium text-white
                     transition-all active:scale-95 cursor-pointer shrink-0"
        >
          {loading ? "…" : "Search"}
        </button>
      </form>

      {/* Disambiguation dropdown */}
      {open && results.length > 1 && (
        <ul className="mt-2 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/[0.15]
                       shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden animate-fade-in-up">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lon}-${i}`}>
              <button
                type="button"
                onClick={() => handlePick(r)}
                className="w-full text-left px-5 py-3 text-sm text-white/80
                           hover:bg-white/10 transition-colors cursor-pointer
                           flex items-center gap-3"
              >
                <span className="text-lg">{countryFlag(r.country)}</span>
                <span>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* "Not found" tooltip on shake */}
      {shake && (
        <div className="mt-2 text-center text-xs text-red-300/80 animate-fade-in-up">
          City not found — try "Austin, US"
        </div>
      )}
    </div>
  );
}
