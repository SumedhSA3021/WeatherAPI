const API_KEY = import.meta.env.VITE_OWM_API_KEY;
const WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const UVI_URL = "https://api.openweathermap.org/data/2.5/uvi";
const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";

/**
 * Step 1 — Geocode a query string into candidate locations.
 * Returns an array of { name, state, country, lat, lon, label }.
 */
export async function geocodeCity(query, signal) {
  try {
    const url = `${GEO_URL}?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((d) => ({
      name: d.name,
      state: d.state || "",
      country: d.country || "",
      lat: d.lat,
      lon: d.lon,
      label: [d.name, d.state, d.country].filter(Boolean).join(", "),
    }));
  } catch (e) {
    if (e.name === "AbortError") return [];
    console.error("geocodeCity failed:", e.message);
    return [];
  }
}

/**
 * Step 2 — Fetch weather by lat/lon (never raw string).
 */
export async function getWeatherByCoords(lat, lon, signal) {
  try {
    const url = `${WEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    const res = await fetch(url, { signal });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (res.status === 401) return { error: "Invalid API key." };
      return { error: `API error ${res.status}: ${body?.message || res.statusText}` };
    }

    const data = await res.json();
    return {
      city: data.name,
      country: data.sys.country,
      timezone: data.timezone,
      lat: data.coord.lat,
      lon: data.coord.lon,
      weatherId: data.weather[0].id,
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      visibility: data.visibility,
      main: data.weather[0].main,
      description: data.weather[0].description,
      wind: data.wind.speed,
      icon: data.weather[0].icon,
    };
  } catch (error) {
    if (error.name === "AbortError") return { error: null, aborted: true };
    const msg = error instanceof TypeError ? "Network error — check your connection." : error.message;
    return { error: `Unable to get weather data: ${msg}` };
  }
}

/** Country code → flag emoji */
export function countryFlag(code) {
  if (!code) return "";
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt()));
}

/** Fetch 5-day / 3-hour forecast by lat/lon */
export async function getForecastByCoords(lat, lon, signal) {
  try {
    const res = await fetch(`${FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`, { signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    if (e.name === "AbortError") return null;
    console.error("getForecastByCoords failed:", e.message);
    return null;
  }
}

/** Fetch UV Index by lat/lon */
export async function getUviByCoords(lat, lon, signal) {
  try {
    const res = await fetch(`${UVI_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`, { signal });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    if (e.name === "AbortError") return null;
    console.error("getUviByCoords failed:", e.message);
    return null;
  }
}
