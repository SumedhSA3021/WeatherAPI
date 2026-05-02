import { msToKmh, getLocalTime } from "../utils/helpers";

const ICONS = {
  Clear: "☀️", Clouds: "☁️", Rain: "🌧️", Drizzle: "🌦️",
  Thunderstorm: "⛈️", Snow: "❄️", Mist: "🌫️", Haze: "🌫️",
  Fog: "🌫️", Smoke: "🌫️", Dust: "🌪️", Tornado: "🌪️",
};

export default function WeatherPanel({ data, visible }) {
  if (!data) return null;
  const icon = ICONS[data.main] || "🌡️";

  return (
    <div
      className="fixed top-28 left-8 z-[100] w-[220px] rounded-[20px]
                 bg-white/[0.08] backdrop-blur-xl border border-white/[0.15]
                 shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-5
                 transition-all duration-500 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      <div className="text-5xl mb-2 drop-shadow">{icon}</div>

      <p className="text-4xl font-bold text-white leading-none">
        {Math.round(data.temperature)}
        <span className="text-lg font-light text-white/50">°C</span>
      </p>

      <h2 className="mt-2 text-base font-semibold text-white/90 leading-tight">
        {data.city}
        {data.country && (
          <span className="text-sm font-normal text-white/40">, {data.country}</span>
        )}
      </h2>

      <p className="mt-0.5 text-sm text-white/50 capitalize">{data.description}</p>

      {data.timezone != null && (
        <p className="mt-1.5 text-[11px] text-indigo-300/60 tracking-wide">
          🕐 {getLocalTime(data.timezone)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.humidity != null && (
          <span className="px-2 py-1 rounded-lg bg-white/5 text-white/60 text-[11px] border border-white/10 text-center">
            💧 {data.humidity}%
          </span>
        )}
        {data.wind != null && (
          <span className="px-2 py-1 rounded-lg bg-white/5 text-white/60 text-[11px] border border-white/10 text-center">
            💨 {msToKmh(data.wind)}
          </span>
        )}
        {data.feelsLike != null && (
          <span className="col-span-2 px-2 py-1 rounded-lg bg-white/5 text-white/60 text-[11px] border border-white/10 text-center">
            🌡️ Feels {Math.round(data.feelsLike)}°
          </span>
        )}
      </div>
    </div>
  );
}
