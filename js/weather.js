export const POPULAR_CITIES = Object.freeze([
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "New York",
  "London",
]);

/**
 * The interpretation engine uses one, explicit priority order so overlapping
 * conditions always resolve predictably:
 *
 * 1. Freeze Frame  — temperature <= 5°C, or frozen precipitation
 * 2. Rain Check    — rain, drizzle, showers or thunderstorms
 * 3. Sun Alert     — temperature >= 35°C
 * 4. Hazy Outlook  — fog, mist, haze, smoke, dust, sand or visibility < 2 km
 * 5. Breezy Mode   — wind >= 30 km/h
 * 6. Perfect Day   — everything else
 */
export const PERSONALITIES = Object.freeze({
  FREEZE: {
    key: "freeze",
    title: "Freeze Frame",
    description: "Bone-chilling cold. Bundle up tight.",
  },
  RAIN: {
    key: "rain",
    title: "Rain Check",
    description: "Carry an umbrella before stepping out.",
  },
  SUN: {
    key: "sun",
    title: "Sun Alert",
    description: "Stay hydrated and avoid excessive sun exposure.",
  },
  HAZE: {
    key: "haze",
    title: "Hazy Outlook",
    description: "Visibility is low. Take it slow and stay aware.",
  },
  WIND: {
    key: "wind",
    title: "Breezy Mode",
    description: "Expect strong winds. Dress accordingly.",
  },
  PERFECT: {
    key: "perfect",
    title: "Perfect Day",
    description: "Great weather to step outside.",
  },
});

const RAIN_CODES = new Set([
  1063, 1072, 1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195,
  1198, 1201, 1240, 1243, 1246, 1273, 1276,
]);

const SNOW_CODES = new Set([
  1066, 1069, 1114, 1117, 1204, 1207, 1210, 1213, 1216, 1219, 1222, 1225,
  1237, 1249, 1252, 1255, 1258, 1261, 1264, 1279, 1282,
]);

const STORM_CODES = new Set([1087, 1273, 1276, 1279, 1282]);

const CLOUDY_CODES = new Set([1003, 1006, 1009]);

const HAZE_CODES = new Set([1135, 1147]);

const SNOW_PATTERN = /snow|sleet|ice|blizzard|freezing/i;
const RAIN_PATTERN = /rain|drizzle|shower|thunder|storm/i;
const HAZE_PATTERN = /fog|mist|haze|smoke|dust|sand/i;

/**
 * Converts a WeatherAPI current object into a user-facing personality.
 * @param {object} current
 * @returns {{key: string, title: string, description: string}}
 */
export function derivePersonality(current) {
  const temperature = Number(current?.temp_c);
  const wind = Number(current?.wind_kph);
  const visibility = Number(current?.vis_km);
  const conditionText = String(current?.condition?.text || "");
  const conditionCode = Number(current?.condition?.code);

  const isFrozen =
    SNOW_PATTERN.test(conditionText) ||
    SNOW_CODES.has(conditionCode) ||
    temperature <= 5;

  if (isFrozen) {
    return PERSONALITIES.FREEZE;
  }

  if (RAIN_PATTERN.test(conditionText) || RAIN_CODES.has(conditionCode)) {
    return PERSONALITIES.RAIN;
  }

  if (temperature >= 35) {
    return PERSONALITIES.SUN;
  }

  if (
    HAZE_PATTERN.test(conditionText) ||
    HAZE_CODES.has(conditionCode) ||
    (Number.isFinite(visibility) && visibility < 2)
  ) {
    return PERSONALITIES.HAZE;
  }

  if (wind >= 30) {
    return PERSONALITIES.WIND;
  }

  return PERSONALITIES.PERFECT;
}

/**
 * Maps API conditions to the visual palette used by the weather panel.
 * @param {object} current
 * @returns {{theme: "clear"|"cloudy"|"rain"|"storm"|"snow"|"mist", isNight: boolean}}
 */
export function deriveSkyTheme(current) {
  const text = String(current?.condition?.text || "");
  const code = Number(current?.condition?.code);
  const isNight = Number(current?.is_day) === 0;

  if (STORM_PATTERN_TEST(text) || STORM_CODES.has(code)) {
    return { theme: "storm", isNight };
  }
  if (RAIN_PATTERN.test(text) || RAIN_CODES.has(code)) {
    return { theme: "rain", isNight };
  }
  if (SNOW_PATTERN.test(text) || SNOW_CODES.has(code)) {
    return { theme: "snow", isNight };
  }
  if (HAZE_PATTERN.test(text) || HAZE_CODES.has(code)) {
    return { theme: "mist", isNight };
  }
  if (/cloud|overcast/i.test(text) || CLOUDY_CODES.has(code)) {
    return { theme: "cloudy", isNight };
  }
  return { theme: "clear", isNight };
}

function STORM_PATTERN_TEST(text) {
  return /thunder|storm/i.test(text);
}

export function getUvLevel(uv) {
  const value = Number(uv);

  if (!Number.isFinite(value)) return { label: "—", note: "UV data unavailable" };
  if (value < 3) return { label: "Low", note: "Low exposure · no extra protection needed" };
  if (value < 6) return { label: "Moderate", note: "Moderate exposure · consider sunscreen" };
  if (value < 8) return { label: "High", note: "High exposure · protect your skin" };
  if (value < 11) return { label: "Very high", note: "Very high exposure · limit time outdoors" };
  return { label: "Extreme", note: "Extreme exposure · avoid direct sun" };
}

export function getHumidityNote(humidity) {
  const value = Number(humidity);
  if (value < 30) return "Dry air · moisture is low";
  if (value <= 60) return "Comfortable moisture level";
  if (value <= 80) return "Humid air · expect some stickiness";
  return "Very humid · the air feels heavy";
}

export function getWindNote(wind) {
  const value = Number(wind);
  if (value < 10) return "Calm · barely a breeze";
  if (value < 20) return "Light breeze · easy going";
  if (value < 30) return "Breezy · hold on to your hat";
  return "Strong winds · dress for it";
}

export function formatNumber(value, maximumFractionDigits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(number);
}

export function formatTime(epochSeconds, timeZone, includeMinutes = true) {
  const date = new Date(Number(epochSeconds) * 1000);
  if (Number.isNaN(date.getTime())) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: includeMinutes ? "2-digit" : undefined,
      hour12: true,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: includeMinutes ? "2-digit" : undefined,
      hour12: true,
    }).format(date);
  }
}

export function formatClockForZone(timeZone, date = new Date()) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  }
}

export function formatRegion(location) {
  const city = String(location?.name || "").trim();
  const region = String(location?.region || "").trim();
  const country = String(location?.country || "").trim();
  const parts = [];

  for (const part of [region, country]) {
    if (part && part.toLowerCase() !== city.toLowerCase() && !parts.includes(part)) {
      parts.push(part);
    }
  }

  return parts.join(", ");
}

export function getWeatherIconUrl(icon) {
  if (!icon) return "";
  const normalized = icon.startsWith("//") ? `https:${icon}` : icon;
  return normalized.replace("/64x64/", "/128x128/");
}

export function normalizeCityName(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

export function findPopularCity(cityName) {
  const key = normalizeCityName(cityName);
  return POPULAR_CITIES.find((city) => normalizeCityName(city) === key) || null;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function buildFactorTags(current) {
  return [
    `${formatNumber(current?.temp_c)}°C`,
    String(current?.condition?.text || "Unknown sky"),
    `${formatNumber(current?.wind_kph, 1)} km/h`,
  ];
}
