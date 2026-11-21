import {
  ApiError,
  callWeatherApi,
  requestUrl,
  sendError,
  sendJson,
} from "../lib/weatherapi.js";
import { countryMatches, findCountry } from "../js/countries.js";

const MAX_QUERY_LENGTH = 100;
const MAX_SUGGESTIONS = 8;

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function rankSuggestion(suggestion, query) {
  const name = normalize(suggestion.name);
  const target = normalize(query);

  if (name === target) return 0;
  if (name.startsWith(target)) return 1;
  if (name.includes(target)) return 2;
  return 3;
}

/**
 * WeatherAPI's search endpoint is fuzzy and does not accept a country filter.
 * Querying both the raw term and "term, country" then filtering the merged
 * result set by the selected country fixes ambiguous names such as Delhi
 * (Ontario, Canada) vs Delhi (India).
 */
export default async function handler(request, response) {
  if (request.method !== "GET") {
    sendJson(response, 405, { error: { code: "BAD_REQUEST" } });
    return;
  }

  try {
    const params = requestUrl(request).searchParams;
    const query = String(params.get("q") || "").replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
    const country = findCountry(params.get("country") || "IN");

    if (!country) {
      throw new ApiError("BAD_REQUEST", { status: 400 });
    }

    if (!query) {
      sendJson(response, 200, { suggestions: [] });
      return;
    }

    const searchTerms = [query];
    if (!query.includes(",")) {
      searchTerms.push(`${query}, ${country.query}`);
    }

    const settled = await Promise.allSettled(
      searchTerms.map((term) => callWeatherApi("search.json", { q: term })),
    );

    const failures = settled.filter((entry) => entry.status === "rejected");
    if (failures.length === settled.length) {
      throw failures[0].reason;
    }

    const seen = new Set();
    const suggestions = [];

    for (const entry of settled) {
      if (entry.status !== "fulfilled") continue;
      const payload = entry.value.payload;

      if (!Array.isArray(payload)) {
        continue;
      }

      for (const location of payload) {
        if (
          !location ||
          !location.id ||
          typeof location.name !== "string" ||
          !countryMatches(country, location.country)
        ) {
          continue;
        }

        const id = String(location.id);
        if (seen.has(id)) continue;
        seen.add(id);

        suggestions.push({
          id: location.id,
          name: location.name,
          region: location.region || "",
          country: location.country,
          lat: location.lat,
          lon: location.lon,
        });
      }
    }

    suggestions.sort(
      (a, b) =>
        rankSuggestion(a, query) - rankSuggestion(b, query) ||
        a.name.localeCompare(b.name, "en"),
    );

    sendJson(response, 200, {
      country: { code: country.code, name: country.name },
      suggestions: suggestions.slice(0, MAX_SUGGESTIONS),
    });
  } catch (error) {
    sendError(response, error);
  }
}
