import { useMemo } from "react";

function getScene(id, isDay) {
  if (id >= 200 && id < 300) return "thunder";
  if (id >= 300 && id < 600) return "rain";
  if (id >= 600 && id < 700) return "snow";
  if (id >= 700 && id < 800) return "mist";
  if (id === 800) return isDay ? "clear-day" : "clear-night";
  return "clouds";
}

const BG = {
  thunder:       "linear-gradient(180deg,#0a0a1e 0%,#1a103a 40%,#2d1b69 100%)",
  rain:          "linear-gradient(180deg,#1a2332 0%,#2d3748 50%,#4a5568 100%)",
  snow:          "linear-gradient(180deg,#c8d6e5 0%,#dfe6ed 40%,#f0f4f8 100%)",
  mist:          "linear-gradient(180deg,#3d3d3d 0%,#5a5a5a 50%,#787878 100%)",
  "clear-day":   "linear-gradient(180deg,#1565c0 0%,#42a5f5 40%,#ffca28 100%)",
  "clear-night": "linear-gradient(180deg,#070b24 0%,#0d1541 50%,#162158 100%)",
  clouds:        "linear-gradient(180deg,#37474f 0%,#546e7a 40%,#78909c 100%)",
};

/* ── Particle layers ────────────────────────────── */
function Raindrops({ heavy }) {
  const count = heavy ? 100 : 60;
  const drops = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      dur: `${0.4 + Math.random() * 0.4}s`,
      h: heavy ? 18 : 14,
    })),
    [count, heavy]
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {drops.map((d) => (
        <div
          key={d.id}
          className="wb-rain"
          style={{ left: d.left, animationDelay: d.delay, animationDuration: d.dur, height: d.h }}
        />
      ))}
    </div>
  );
}

function Snowflakes() {
  const flakes = useMemo(
    () => Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      dur: `${3 + Math.random() * 4}s`,
      size: 4 + Math.random() * 6,
    })),
    []
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {flakes.map((f) => (
        <div
          key={f.id}
          className="wb-snow"
          style={{
            left: f.left,
            animationDelay: f.delay,
            animationDuration: f.dur,
            width: f.size,
            height: f.size,
          }}
        />
      ))}
    </div>
  );
}

function Lightning() {
  return <div className="absolute inset-0 wb-lightning pointer-events-none" />;
}

function SunGlow() {
  return (
    <div className="absolute top-[10%] right-[15%] w-32 h-32 rounded-full
                    bg-yellow-300/30 blur-2xl wb-sun-pulse pointer-events-none" />
  );
}

function Stars() {
  const stars = useMemo(
    () => Array.from({ length: 80 }, () =>
      `${Math.random() * 100}vw ${Math.random() * 100}vh 1px rgba(255,255,255,${0.3 + Math.random() * 0.5})`
    ).join(","),
    []
  );
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ boxShadow: stars }}
    />
  );
}

function FogBands() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute w-[200%] wb-fog"
          style={{
            top: `${25 + i * 25}%`,
            height: "80px",
            opacity: 0.12 + i * 0.06,
            animationDelay: `${i * 3}s`,
            animationDuration: `${12 + i * 4}s`,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
          }}
        />
      ))}
    </div>
  );
}

function DriftingClouds() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-full wb-cloud-drift"
          style={{
            top: `${10 + i * 18}%`,
            width: `${180 + i * 60}px`,
            height: `${50 + i * 15}px`,
            background: "rgba(255,255,255,0.08)",
            animationDelay: `${i * 4}s`,
            animationDuration: `${18 + i * 6}s`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────── */
export default function WeatherBackground({ weather, visible }) {
  if (!weather) return null;

  const nowUtc = Math.floor(Date.now() / 1000);
  const isDay = nowUtc > weather.sunrise && nowUtc < weather.sunset;
  const scene = getScene(weather.weatherId, isDay);

  return (
    <div
      className="fixed inset-0 z-[1] transition-opacity duration-600 ease-in-out"
      style={{ background: BG[scene], opacity: visible ? 1 : 0, pointerEvents: visible ? "auto" : "none" }}
    >
      {scene === "thunder" && <><Lightning /><Raindrops heavy /></>}
      {scene === "rain" && <Raindrops />}
      {scene === "snow" && <Snowflakes />}
      {scene === "mist" && <FogBands />}
      {scene === "clear-day" && <SunGlow />}
      {scene === "clear-night" && <Stars />}
      {scene === "clouds" && <DriftingClouds />}
    </div>
  );
}
