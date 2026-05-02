/**
 * Converts wind speed from meters/second to kilometers/hour.
 * @param {number} ms - Wind speed in m/s
 * @returns {number} Wind speed in km/h, rounded to 1 decimal
 */
export function msToKmh(ms) {
  return Math.round(ms * 3.6 * 10) / 10;
}

/**
 * Returns a formatted local time string for a city given the
 * timezone offset (in seconds) returned by the OpenWeatherMap API.
 *
 * How it works:
 *   1. Get the current UTC timestamp in milliseconds.
 *   2. Add the API's timezone offset (converted to ms) to get the city's local time.
 *   3. Format as "HH:MM AM/PM — Day, Date Month" using UTC methods
 *      (since we already baked the offset into the Date).
 *
 * @param {number} timezoneOffset - Timezone offset from UTC in seconds (e.g. 19800 for IST)
 * @returns {string} Formatted local time string
 */
export function getLocalTime(timezoneOffset) {
  // City's local time = UTC now + offset
  const localMs = Date.now() + timezoneOffset * 1000;
  const date = new Date(localMs);

  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, "0");

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const dayName = days[date.getUTCDay()];
  const monthName = months[date.getUTCMonth()];
  const dayOfMonth = date.getUTCDate();

  return `${displayHours}:${displayMinutes} ${ampm} — ${dayName}, ${dayOfMonth} ${monthName}`;
}
