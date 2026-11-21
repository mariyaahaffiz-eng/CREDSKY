/**
 * Server-side WeatherAPI client. The API key only ever exists in the Node
 * runtime environment; it is never sent to the browser.
 */

const API_BASE = "https://api.weatherapi.com/v1/";
const REQUEST_TIMEOUT_MS = 9000;

export class ApiError extends Error {
  constructor(code, { status = 502, country = null, cause } = {}) {
    super(code, { cause });
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.country = country;
  }
}

const CONFIG_ERROR_CODES = new Set([1002, 1007, 2006, 2008, 2009]);
const RATE_LIMIT_CODES = new Set([2007, 2005]);

function classifyFailure(status, rawCode) {
  const apiCode = Number(rawCode);

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

function statusForCode(code) {
  switch (code) {
    case "CONFIG":
      return 500;
    case "RATE_LIMIT":
      return 429;
    case "CITY_NOT_FOUND":
      return 404;
    case "TIMEOUT":
      return 504;
    case "COUNTRY_MISMATCH":
      return 404;
    case "BAD_REQUEST":
      return 400;
    default:
      return 502;
  }
}

function readKey() {
  const key = process.env.WEATHER_API_KEY?.trim();
  if (!key || /^your_weatherapi/i.test(key)) {
    throw new ApiError("CONFIG", { status: statusForCode("CONFIG") });
  }
  return key;
}

/**
 * Calls WeatherAPI and returns both the parsed payload and the exact response
 * text, so the API viewer can display the untouched upstream JSON.
 */
export async function callWeatherApi(path, params) {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("key", readKey());
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(name, value);
    }
  }

  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new ApiError("TIMEOUT", { status: statusForCode("TIMEOUT"), cause: error });
    }
    throw new ApiError("NETWORK", { cause: error });
  }

  const raw = await response.text();
  let payload = null;

  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    throw new ApiError(
      response.ok ? "UNEXPECTED" : classifyFailure(response.status, 0),
      { cause: new Error("WeatherAPI returned non-JSON content") },
    );
  }

  if (!response.ok || payload?.error) {
    const code = classifyFailure(response.status, payload?.error?.code);
    throw new ApiError(code, { status: statusForCode(code) });
  }

  return { payload, raw, upstreamStatus: response.status };
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

/** Rejects incomplete payloads so the browser never renders a broken card. */
export function validateWeatherPayload(payload) {
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

export function sendJson(response, status, body) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.end(JSON.stringify(body));
}

export function sendError(response, error) {
  if (error instanceof ApiError) {
    sendJson(response, error.status, {
      error: {
        code: error.code,
        country: error.country,
      },
    });
    return;
  }

  sendJson(response, 502, { error: { code: "GENERIC" } });
}

export function requestUrl(request) {
  return new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
}

export { statusForCode };
