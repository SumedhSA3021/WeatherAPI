import { useState, useEffect, useRef, useMemo } from "react";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";
import { WiStrongWind, WiHumidity, WiBarometer, WiDaySunny, WiRaindrop } from "react-icons/wi";
import { MdVisibility } from "react-icons/md";
import { geocodeCity, countryFlag } from "../utils/weatherService";
import { msToKmh } from "../utils/helpers";

const ic = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`;
const toF = (c) => Math.round(c * 9 / 5 + 32);
const tmp = (c, u) => (u === "F" ? toF(c) : Math.round(c));
const dewPt = (t, rh) => Math.round(t - (100 - rh) / 5);

const CARD_BG = {
  Clear: "linear-gradient(135deg,#56CCF2,#2F80ED)", Clouds: "linear-gradient(135deg,#636FA4,#E8CBC0)",
  Rain: "linear-gradient(135deg,#373B44,#4286f4)", Drizzle: "linear-gradient(135deg,#89F7FE,#66A6FF)",
  Thunderstorm: "linear-gradient(135deg,#0F2027,#2C5364)", Snow: "linear-gradient(135deg,#E6DADA,#274046)",
  Mist: "linear-gradient(135deg,#606c88,#3f4c6b)", Haze: "linear-gradient(135deg,#606c88,#3f4c6b)",
};

function processForecast(list) {
  if (!list?.length) return { daily: [], hourly: [] };
  const hourly = list.slice(0, 9);
  const byDate = {};
  list.forEach((e) => {
    const d = dayjs.unix(e.dt).format("YYYY-MM-DD");
    const h = dayjs.unix(e.dt).hour();
    if (!byDate[d] || Math.abs(h - 12) < Math.abs(dayjs.unix(byDate[d].dt).hour() - 12)) byDate[d] = e;
  });
  return { daily: Object.values(byDate).slice(0, 7), hourly };
}

/* ── Search input with autocomplete ─────────────── */
function SearchInput({ city, setCity, onSelect }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [shake, setShake] = useState(false);
  const abortRef = useRef(null);
  const debRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    clearTimeout(debRef.current);
    if (city.trim().length < 2) { setResults([]); setOpen(false); return; }
    debRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController(); abortRef.current = ctrl;
      const res = await geocodeCity(city.trim(), ctrl.signal);
      if (ctrl.signal.aborted) return;
      setResults(res); setOpen(res.length > 0);
    }, 400);
    return () => clearTimeout(debRef.current);
  }, [city]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    const onClick = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    window.addEventListener("keydown", onKey); window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, []);

  const pick = (r) => { setCity(r.name); setOpen(false); setResults([]); onSelect(r); };

  const submit = async (e) => {
    e.preventDefault();
    if (city.trim().length < 2) return;
    if (results.length === 1) { pick(results[0]); return; }
    if (results.length > 1) { setOpen(true); return; }
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController(); abortRef.current = ctrl;
    const res = await geocodeCity(city.trim(), ctrl.signal);
    if (ctrl.signal.aborted) return;
    if (res.length === 0) { setShake(true); setTimeout(() => setShake(false), 600); return; }
    if (res.length === 1) { pick(res[0]); return; }
    setResults(res); setOpen(true);
  };

  return (
    <div ref={wrapRef} className="relative">
      <form onSubmit={submit} className={`flex items-center rounded-full bg-white/10 border border-white/15 ${shake ? "animate-[shake_0.4s]" : ""}`}>
        <span className="pl-3 text-white/40 text-sm">🔍</span>
        <input id="city-input" type="text" value={city} onChange={(e) => setCity(e.target.value)}
          onFocus={() => results.length > 1 && setOpen(true)} placeholder="Search City"
          autoComplete="off" className="bg-transparent px-3 py-2 text-sm text-white placeholder-white/40 outline-none w-[220px]" />
      </form>
      {open && results.length > 0 && (
        <ul className="absolute top-full mt-2 w-[320px] right-0 rounded-xl bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden z-50">
          {results.map((r, i) => (
            <li key={`${r.lat}-${r.lon}-${i}`}>
              <button type="button" onClick={() => pick(r)}
                className="w-full text-left px-4 py-2.5 text-sm text-white/80 hover:bg-orange-500/10 transition-colors cursor-pointer flex items-center gap-2">
                <span>{countryFlag(r.country)}</span><span>{r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {shake && <div className="absolute top-full mt-2 text-xs text-red-300/80 whitespace-nowrap">No results — try "Mumbai, IN"</div>}
    </div>
  );
}

/* ── Header bar ─────────────────────────────────── */
function Header({ location, unit, setUnit, city, setCity, onSelect }) {
  return (
    <header className="sticky top-0 z-[100] flex items-center justify-between gap-4 px-8 py-4 backdrop-blur-2xl bg-black/30 border-b border-white/5 pointer-events-auto">
      <h1 className="text-lg font-bold text-white shrink-0">Weather <span className="text-white/60">forecast</span></h1>
      <div className="flex rounded-full border border-white/20 overflow-hidden shrink-0">
        {["C", "F"].map((u) => (
          <button key={u} onClick={() => setUnit(u)}
            className={`px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${unit === u ? "bg-[#F97316] text-white" : "text-white/60 hover:text-white"}`}>
            °{u}
          </button>
        ))}
      </div>
      {location && <span className="text-sm text-white/80 shrink-0">📍 {location}</span>}
      <div className="ml-auto"><SearchInput city={city} setCity={setCity} onSelect={onSelect} /></div>
    </header>
  );
}

/* ── 7-day strip ────────────────────────────────── */
function DayStrip({ daily, activeDay, setActiveDay, unit }) {
  if (!daily?.length) return null;
  return (
    <div className="flex gap-2 px-8 py-3 overflow-x-auto scrollbar-hide">
      {daily.map((d, i) => {
        const active = i === activeDay;
        const label = i === 0 ? "Today" : dayjs.unix(d.dt).format("ddd");
        return (
          <button key={d.dt} onClick={() => setActiveDay(i)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium shrink-0 transition-colors cursor-pointer
              ${active ? "bg-[#F97316] text-white" : "bg-white/8 text-white/70 hover:bg-white/15 border border-white/10"}`}>
            <span>{label}</span>
            <span>{tmp(d.main.temp, unit)}°</span>
            <img src={ic(d.weather[0].icon)} width={24} height={24} alt="" />
          </button>
        );
      })}
    </div>
  );
}

/* ── Stat grid ──────────────────────────────────── */
function StatGrid({ data, unit }) {
  const stats = [
    { icon: <WiStrongWind size={22} />, label: "Wind", value: `${msToKmh(data.wind)} km/h` },
    { icon: <WiHumidity size={22} />, label: "Humidity", value: `${data.humidity}%` },
    { icon: <MdVisibility size={20} />, label: "Visibility", value: data.visibility != null ? `${(data.visibility / 1000).toFixed(1)} km` : "N/A" },
    { icon: <WiBarometer size={22} />, label: "Pressure", value: data.pressure != null ? `${data.pressure} hPa` : "N/A" },
    { icon: <WiDaySunny size={22} />, label: "UV Index", value: data.uvi != null ? `${Math.round(data.uvi)} UV` : "N/A" },
    { icon: <WiRaindrop size={22} />, label: "Dew Point", value: `${dewPt(data.temperature, data.humidity)}°${unit}` },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 mt-4">
      {stats.map((s) => (
        <div key={s.label} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/8">
          <span className="text-orange-400">{s.icon}</span>
          <div><div className="text-[10px] text-white/40 uppercase">{s.label}</div><div className="text-sm text-white font-medium">{s.value}</div></div>
        </div>
      ))}
    </div>
  );
}

/* ── Current weather card ───────────────────────── */
function WeatherCard({ data, unit, timezone }) {
  const bg = CARD_BG[data.main] || CARD_BG.Clear;
  const localTime = timezone != null ? dayjs().utc().add(timezone, "second").format("h:mm A") : "";
  return (
    <div className="w-[40%] shrink-0">
      <div className="relative rounded-2xl overflow-hidden h-[220px] flex flex-col justify-between p-5" style={{ background: bg }}>
        <div className="flex justify-between items-start">
          <img src={ic(data.icon)} width={64} height={64} alt="" className="drop-shadow-lg" />
          <span className="text-sm text-white/70">{localTime}</span>
        </div>
        <div className="flex justify-between items-end">
          <span className="text-5xl font-bold text-white drop-shadow">{tmp(data.temperature, unit)}°</span>
          <div className="text-right">
            <div className="text-base text-white/90 capitalize">{data.description}</div>
            <div className="text-sm text-white/60">Feels like {tmp(data.feelsLike, unit)}°</div>
          </div>
        </div>
      </div>
      <StatGrid data={data} unit={unit} />
    </div>
  );
}

/* ── Hourly panel ───────────────────────────────── */
function HourlyPanel({ hourly, unit }) {
  if (!hourly?.length) return null;
  const chartData = hourly.map((h) => ({ time: dayjs.unix(h.dt).format("ha"), temp: Math.round(h.main.temp) }));
  return (
    <div className="flex-1 min-w-0">
      <div className="rounded-2xl bg-white/5 border border-white/8 p-5">
        <h3 className="text-sm font-semibold text-white/60 mb-3">Hourly Forecast</h3>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={chartData}>
            <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "rgba(0,0,0,0.8)", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }} />
            <Line type="monotone" dataKey="temp" stroke="#F97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-1 mt-3 overflow-x-auto scrollbar-hide pb-2">
        {hourly.map((h) => (
          <div key={h.dt} className="flex flex-col items-center gap-1 min-w-[65px] py-2 px-1 rounded-xl bg-white/5 border border-white/5">
            <span className="text-[11px] text-white/50">{dayjs.unix(h.dt).format("ha")}</span>
            <img src={ic(h.weather[0].icon)} width={32} height={32} alt="" />
            <span className="text-[11px] text-blue-300">{Math.round((h.pop || 0) * 100)}%</span>
            <span className="text-sm text-white font-medium">{tmp(h.main.temp, unit)}°</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Dashboard ─────────────────────────────── */
export default function Dashboard({ weather, forecast, location, onCitySelect, loading, visible }) {
  const [unit, setUnit] = useState("C");
  const [activeDay, setActiveDay] = useState(0);
  const [city, setCity] = useState("");

  const { daily, hourly } = useMemo(() => processForecast(forecast?.list), [forecast]);

  // Reset active day when new city is selected
  useEffect(() => { setActiveDay(0); }, [weather?.city]);

  // Build active data based on selected day
  const activeData = useMemo(() => {
    if (!weather) return null;
    if (activeDay === 0 || !daily[activeDay]) return weather;
    const e = daily[activeDay];
    return {
      ...weather,
      temperature: e.main.temp,
      feelsLike: e.main.feels_like,
      humidity: e.main.humidity,
      pressure: e.main.pressure,
      main: e.weather[0].main,
      description: e.weather[0].description,
      icon: e.weather[0].icon,
      wind: e.wind.speed,
      visibility: e.visibility,
    };
  }, [activeDay, daily, weather]);

  const hasData = visible && weather && forecast;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
      {/* Header — always in the flow, always interactive */}
      <Header location={location} unit={unit} setUnit={setUnit} city={city} setCity={setCity} onSelect={onCitySelect} />

      {/* Main dashboard content — only interactive and visible when data is ready */}
      <div className={`transition-opacity duration-500 ${hasData ? "opacity-100 pointer-events-auto" : "opacity-0"}`}>
        {hasData && activeData && (
          <>
            <DayStrip daily={daily} activeDay={activeDay} setActiveDay={setActiveDay} unit={unit} />
            <div className="flex gap-5 px-8 pb-8 pt-2">
              <WeatherCard data={activeData} unit={unit} timezone={weather.timezone} />
              <HourlyPanel hourly={hourly} unit={unit} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
