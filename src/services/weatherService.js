const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

export async function getCurrentWeather(city = "Hubballi") {
  try {
    const response = await fetch(
      `${BASE_URL}?q=${city}&appid=${API_KEY}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Weather data for", city, ":", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    throw error;
  }
}

// Fetch weather on load for quick testing
getCurrentWeather();
