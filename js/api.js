import { CONFIG } from "./config.js";

const API_ENDPOINT = "https://api.weatherapi.com/v1/current.json";
const REQUEST_TIMEOUT_MS = 15000;

/** User-facing copy for every handled failure mode. */
export const ERROR_COPY = Object.freeze({
  CITY_NOT_FOUND: {
    title: "City not found",
    message: "We couldn't find that city. Check the spelling or try a nearby major city.",
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
  constructor(code, { cause, retryable = true } = {}) {
    const copy = ERROR_COPY[code] || ERROR_COPY.GENERIC;
    super(copy.message, { cause });
    this.name = "WeatherError";
    this.code = ERROR_COPY[code] ? code : "GENERIC";
    this.title = copy.title;
    this.userMessage = copy.message;
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

function toWeatherError(payload, response) {
  return new WeatherError(
    classifyApiFailure(response?.status, payload?.error?.code),
  );
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

/**
 * Fetches current weather data while preserving the exact response text for
 * the raw JSON viewer.
 */
export async function fetchCurrentWeather(city, { signal } = {}) {
  const key = CONFIG.WEATHER_API_KEY?.trim();

  if (!key || key.includes("your_weatherapi")) {
    throw new WeatherError("CONFIG");
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
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
    const url = new URL(API_ENDPOINT);
    url.searchParams.set("key", key);
    url.searchParams.set("q", city);

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });

    const raw = await response.text();
    let payload = null;

    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      if (!response.ok) {
        throw toWeatherError(null, response);
      }
      throw new WeatherError("UNEXPECTED");
    }

    if (!response.ok || payload?.error) {
      throw toWeatherError(payload, response);
    }

    if (!validateResponse(payload)) {
      throw new WeatherError("UNEXPECTED");
    }

    return {
      data: payload,
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

    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new WeatherError("NETWORK", { cause: error });
    }

    throw new WeatherError("NETWORK", { cause: error });
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}
