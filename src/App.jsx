import { useState, useRef, useCallback } from "react";
import { getWeatherByCoords, getForecastByCoords, getUviByCoords } from "./utils/weatherService";
import Globe from "./components/Globe";
import WeatherBackground from "./components/WeatherBackground";
import Dashboard from "./components/Dashboard";
import "./App.css";

function calcZoom(name) {
  if (name.split(",").length > 1) return 2.0;
  if (name.length < 6) return 2.5;
  return 2.2;
}

function App() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [location, setLocation] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showGlobe, setShowGlobe] = useState(true);
  const [showWeatherBg, setShowWeatherBg] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);

  const [globeCoords, setGlobeCoords] = useState(null);
  const [zoomTarget, setZoomTarget] = useState(2.2);
  const [animTrigger, setAnimTrigger] = useState(0);
  const [resetTrigger, setResetTrigger] = useState(0);

  const abortRef = useRef(null);
  const pendingRef = useRef(null);

  /* ── Fetch weather + forecast + UVI in parallel ─────── */
  const fetchAll = useCallback(async (lat, lon, label) => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    const [weatherRes, forecastRes, uviRes] = await Promise.all([
      getWeatherByCoords(lat, lon, ctrl.signal),
      getForecastByCoords(lat, lon, ctrl.signal),
      getUviByCoords(lat, lon, ctrl.signal)
    ]);
    if (ctrl.signal.aborted) return;
    setLoading(false);

    if (weatherRes.error) { setError(weatherRes.error); return; }

    // Combine UVI into weather data
    if (uviRes && uviRes.value !== undefined) {
      weatherRes.uvi = uviRes.value;
    }

    setWeather(weatherRes);
    setForecast(forecastRes);
    setLocation(`${weatherRes.city}, ${weatherRes.country}`);
    setError(null);

    // Start globe animation
    const coords = { lat: weatherRes.lat, lon: weatherRes.lon };
    if (showWeatherBg || showDashboard) {
      setShowWeatherBg(false);
      setShowDashboard(false);
      setShowGlobe(true);
      pendingRef.current = { coords, zoom: calcZoom(label) };
      setTimeout(() => setResetTrigger((c) => c + 1), 650);
    } else {
      setGlobeCoords(coords);
      setZoomTarget(calcZoom(label));
      setShowGlobe(true);
      setAnimTrigger((c) => c + 1);
    }
  }, [showWeatherBg, showDashboard]);

  const handleCitySelect = useCallback((item) => {
    setLocation(`${item.name}, ${item.country}`);
    fetchAll(item.lat, item.lon, item.label || item.name);
  }, [fetchAll]);

  /* ── Globe callbacks ──────────────────────────── */
  const onRotateDone = useCallback(() => {}, []);

  const onZoomDone = useCallback(() => {
    setTimeout(() => {
      setShowGlobe(false);
      setTimeout(() => {
        setShowWeatherBg(true);
        setShowDashboard(true);
      }, 100);
    }, 500);
  }, []);

  const onResetDone = useCallback(() => {
    if (pendingRef.current) {
      const { coords, zoom } = pendingRef.current;
      pendingRef.current = null;
      setGlobeCoords(coords);
      setZoomTarget(zoom);
      setAnimTrigger((c) => c + 1);
    }
  }, []);

  const handleReturnToGlobe = () => {
    setShowWeatherBg(false);
    setShowDashboard(false);
    setShowGlobe(true);
    setTimeout(() => setResetTrigger((c) => c + 1), 650);
  };

  return (
    <div className="relative min-h-screen bg-[#050510] overflow-hidden">
      <Globe
        coordinates={globeCoords} zoomTarget={zoomTarget}
        animTrigger={animTrigger} resetTrigger={resetTrigger}
        onRotateDone={onRotateDone} onZoomDone={onZoomDone} onResetDone={onResetDone}
        visible={showGlobe}
      />
      <WeatherBackground weather={weather} visible={showWeatherBg} />

      {/* Dashboard is ALWAYS rendered. It has a sticky header for the search. */}
      <Dashboard
        weather={weather} forecast={forecast} location={location}
        onCitySelect={handleCitySelect} loading={loading} visible={showDashboard}
      />

      {error && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl bg-red-500/20 backdrop-blur-lg border border-red-400/30 text-red-200 text-sm animate-fade-in-up max-w-sm text-center">
          {error}
        </div>
      )}

      {showDashboard && (
        <button onClick={handleReturnToGlobe}
          className="fixed bottom-7 right-8 z-[200] w-12 h-12 rounded-full bg-white/10 backdrop-blur-lg border border-white/15 text-2xl flex items-center justify-center hover:bg-white/20 transition-all cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.3)] animate-fade-in-up"
          title="Return to globe">🌍</button>
      )}
    </div>
  );
}

export default App;
