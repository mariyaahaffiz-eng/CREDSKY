const API_BASE = "/api";
const REQUEST_TIMEOUT_MS = 20000;
const SUGGEST_TIMEOUT_MS = 20000;

/** User-facing copy for every handled failure mode. */
export const ERROR_COPY = Object.freeze({
  CITY_NOT_FOUND: {
    title: "City not found",
    message: "We couldn't find that city. Check the spelling or pick a suggestion.",
  },
  COUNTRY_MISMATCH: {
    title: "No match found",
    message: "We couldn't find that city in the selected country.",
  },
  CONFIG: {
    title: "API configuration error",
    message: "The weather service key is missing or invalid. Check the app configuration.",
  },
  RATE_LIMIT: {
    title: "Temporary service error",
    message: "The weather service is receiving too many requests. Give it a moment, then try again.",
  },
  NETWORK: {
    title: "No network connection",
    message: "You appear to be offline. Check your internet connection and try again.",
  },
  SERVICE: {
    title: "Service unavailable",
    message: "WeatherAPI is temporarily unavailable. Please try again shortly.",
  },
  TIMEOUT: {
    title: "The request timed out",
    message: "The weather service took too long to respond. Please try again.",
  },
  UNEXPECTED: {
    title: "Unexpected response",
    message: "The weather service returned data we couldn't read. Please try again.",
  },
  GENERIC: {
    title: "Could not load the weather",
    message: "Something went wrong while checking the sky. Please try again.",
  },
});

export class WeatherError extends Error {
  constructor(code, { cause, retryable = true, title, message } = {}) {
    const copy = ERROR_COPY[code] || ERROR_COPY.GENERIC;
    super(message || copy.message, { cause });
    this.name = "WeatherError";
    this.code = ERROR_COPY[code] ? code : "GENERIC";
    this.title = title || copy.title;
    this.userMessage = message || copy.message;
    this.retryable = retryable;
  }
}

const CONFIG_ERROR_CODES = new Set([1002, 1007, 2006, 2008, 2009]);
const RATE_LIMIT_CODES = new Set([2007, 2005]);

/**
 * Classifies API/HTTP failures independently of the network layer so the
 * mapping can be unit tested without spending WeatherAPI quota.
 */
export function classifyApiFailure(status, rawApiCode) {
  const apiCode = Number(rawApiCode);

  if (status === 401 || status === 403 || CONFIG_ERROR_CODES.has(apiCode)) {
    return "CONFIG";
  }
  if (status === 429 || RATE_LIMIT_CODES.has(apiCode)) {
    return "RATE_LIMIT";
  }
  if (apiCode === 1006 || status === 404) {
    return "CITY_NOT_FOUND";
  }
  if (status >= 500) {
    return "SERVICE";
  }
  if (Number.isFinite(apiCode) && apiCode > 0) {
    return "GENERIC";
  }
  return "UNEXPECTED";
}

function errorFromResponse(status, payload) {
  const code = payload?.error?.code;

  if (code === "COUNTRY_MISMATCH") {
    const country = payload?.error?.country || "that country";
    return new WeatherError("COUNTRY_MISMATCH", {
      title: `No match found in ${country}`,
      message: `We couldn't find a city by that name in ${country}. Check the spelling or pick a suggestion.`,
    });
  }

  if (typeof code === "string" && ERROR_COPY[code]) {
    return new WeatherError(code);
  }

  return new WeatherError(classifyApiFailure(status, payload?.error?.apiCode));
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function validateResponse(payload) {
  const location = payload?.location;
  const current = payload?.current;
  const condition = current?.condition;

  const hasLocation =
    typeof location?.name === "string" &&
    location.name.trim().length > 0 &&
    typeof location?.country === "string" &&
    location.country.length > 0 &&
    typeof location?.tz_id === "string" &&
    location.tz_id.length > 0 &&
    isFiniteNumber(location?.localtime_epoch);

  const hasCurrent =
    isFiniteNumber(current?.temp_c) &&
    isFiniteNumber(current?.feelslike_c) &&
    isFiniteNumber(current?.temp_f) &&
    isFiniteNumber(current?.humidity) &&
    isFiniteNumber(current?.wind_kph) &&
    isFiniteNumber(current?.uv) &&
    isFiniteNumber(current?.cloud) &&
    isFiniteNumber(current?.vis_km) &&
    isFiniteNumber(current?.pressure_mb) &&
    isFiniteNumber(current?.last_updated_epoch) &&
    typeof current?.last_updated === "string" &&
    typeof condition?.text === "string" &&
    condition.text.length > 0 &&
    typeof condition?.icon === "string" &&
    condition.icon.length > 0;

  return Boolean(hasLocation && hasCurrent);
}

function offline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Fetches current weather through the serverless proxy. A request is either a
 * unique WeatherAPI location id, exact coordinates, or "city + country".
 */
export async function fetchCurrentWeather(
  { city, country, id, lat, lon },
  { signal } = {},
) {
  if (offline()) {
    throw new WeatherError("NETWORK");
  }

  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    const url = new URL(`${API_BASE}/weather`, window.location.origin);
    if (id) url.searchParams.set("id", id);
    else if (lat !== undefined && lon !== undefined) {
      url.searchParams.set("lat", lat);
      url.searchParams.set("lon", lon);
    } else {
      url.searchParams.set("city", city);
    }
    url.searchParams.set("country", country);

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });

    const text = await response.text();
    let payload = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      if (!response.ok) {
        throw errorFromResponse(response.status, null);
      }
      throw new WeatherError("UNEXPECTED");
    }

    if (!response.ok || payload?.error) {
      throw errorFromResponse(response.status, payload);
    }

    const data = payload?.data;
    const raw = typeof payload?.raw === "string" ? payload.raw : text;

    if (!validateResponse(data)) {
      throw new WeatherError("UNEXPECTED");
    }

    return {
      data,
      raw,
      receivedAt: new Date(),
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      if (timedOut) {
        throw new WeatherError("TIMEOUT");
      }
      throw error;
    }

    if (error instanceof WeatherError) {
      throw error;
    }

    throw new WeatherError("NETWORK", { cause: error });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

/** Autocomplete suggestions, already filtered to the selected country. */
export async function fetchCitySuggestions({ query, country, signal }) {
  if (offline()) return [];

  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SUGGEST_TIMEOUT_MS);

  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    const url = new URL(`${API_BASE}/search`, window.location.origin);
    url.searchParams.set("q", query);
    url.searchParams.set("country", country);

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });

    if (!response.ok) {
      throw new WeatherError("GENERIC");
    }

    const payload = await response.json();
    return Array.isArray(payload?.suggestions) ? payload.suggestions : [];
  } catch (error) {
    if (error?.name === "AbortError") {
      if (timedOut) throw new WeatherError("TIMEOUT");
      throw error;
    }
    if (error instanceof WeatherError) throw error;
    throw new WeatherError("NETWORK", { cause: error });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
