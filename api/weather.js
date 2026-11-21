import {
  ApiError,
  callWeatherApi,
  requestUrl,
  sendError,
  sendJson,
  validateWeatherPayload,
} from "../lib/weatherapi.js";
import { countryMatches, findCountry } from "../js/countries.js";

const MAX_CITY_LENGTH = 100;

function resolveCountry(raw) {
  const country = findCountry(raw || "IN");
  if (!country) {
    throw new ApiError("BAD_REQUEST", { status: 400 });
  }
  return country;
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: { code: "BAD_REQUEST" } });
    return;
  }

  try {
    const params = requestUrl(request).searchParams;
    const country = resolveCountry(params.get("country"));

    const id = String(params.get("id") || "").trim();
    const lat = String(params.get("lat") || "").trim();
    const lon = String(params.get("lon") || "").trim();
    const city = String(params.get("city") || "").replace(/\s+/g, " ").trim();

    let query;

    if (id && /^\d{1,12}$/.test(id)) {
      query = `id:${id}`;
    } else if (
      lat &&
      lon &&
      Number.isFinite(Number(lat)) &&
      Number.isFinite(Number(lon)) &&
      Math.abs(Number(lat)) <= 90 &&
      Math.abs(Number(lon)) <= 180
    ) {
      query = `${Number(lat)},${Number(lon)}`;
    } else if (city && city.length <= MAX_CITY_LENGTH) {
      query = `${city}, ${country.query}`;
    } else {
      throw new ApiError("BAD_REQUEST", { status: 400 });
    }

    const { payload, raw } = await callWeatherApi("current.json", { q: query });

    if (!validateWeatherPayload(payload)) {
      throw new ApiError("UNEXPECTED");
    }

    // The critical guard: never return weather from a different country than
    // the one the user selected, even if WeatherAPI resolved something else.
    if (!countryMatches(country, payload.location.country)) {
      throw new ApiError("COUNTRY_MISMATCH", {
        status: 404,
        country: country.name,
      });
    }

    sendJson(response, 200, { raw, data: payload });
  } catch (error) {
    sendError(response, error);
  }
}
