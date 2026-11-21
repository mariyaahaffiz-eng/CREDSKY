import { WeatherError, fetchCurrentWeather } from "./api.js";
import { getCountryByCode } from "./countries.js";
import {
  derivePersonality,
  findPopularCity,
  formatFullLocation,
  formatNumber,
} from "./weather.js";
import { ui } from "./ui.js";

const DEFAULT_CITY = "Mumbai";
const DEFAULT_COUNTRY = "IN";
const MAX_CITY_LENGTH = 100;

let activeController = null;
let hasWeather = false;
let lastSuccessful = null;
let lastRequest = null;

function normalizeCity(rawCity) {
  return String(rawCity || "")
    .replace(/\s+/g, " ")
    .trim();
}

function asWeatherError(error) {
  if (error instanceof WeatherError) {
    return error;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return new WeatherError("NETWORK", { cause: error });
  }

  return new WeatherError("GENERIC", { cause: error });
}

function currentCountry() {
  return ui.getCountry() || getCountryByCode(DEFAULT_COUNTRY);
}

function selectedChipCode() {
  const country = currentCountry();
  return lastSuccessful?.countryCode || country?.code || null;
}

async function performSearch(request, { isInitial = false } = {}) {
  ui.clearValidation();
  ui.hideBanner();

  const selectionBefore = ui.getSelectedCity();
  const popularMatch =
    request.id || request.lat !== undefined
      ? null
      : findPopularCity(request.city, request.country);

  ui.setSelectedCity(popularMatch?.city || null, popularMatch?.code || request.country);

  if (activeController) {
    activeController.abort();
  }

  const controller = new AbortController();
  activeController = controller;
  lastRequest = request;

  ui.setSearching(true);

  try {
    const result = await fetchCurrentWeather(request, { signal: controller.signal });

    if (controller.signal.aborted) {
      return;
    }

    const { location } = result.data;

    hasWeather = true;
    lastSuccessful = { name: location.name, countryCode: request.country };

    const personality = derivePersonality(result.data.current);
    ui.renderWeather(result.data, personality);
    ui.setJson(result.data, result.raw);
    ui.setSelectedCity(location.name, request.country);
    ui.setSearching(false);

    document.title = `${formatFullLocation(location)} · ${formatNumber(
      result.data.current.temp_c,
    )}°C · SKY CRED`;
  } catch (error) {
    if (
      controller.signal.aborted ||
      error?.name === "AbortError" ||
      activeController !== controller
    ) {
      return;
    }

    const weatherError = asWeatherError(error);
    ui.setSearching(false);

    if (!hasWeather) {
      ui.showInitialError(weatherError);
      ui.setSelectedCity(selectionBefore || (isInitial ? DEFAULT_CITY : null), request.country);
    } else {
      ui.showBanner(weatherError, () => {
        performSearch(request);
      });
      ui.setSelectedCity(lastSuccessful?.name, selectedChipCode());
    }
  } finally {
    if (activeController === controller) {
      activeController = null;
    }
  }
}

function searchCity(rawCity, { isInitial = false, suggestion = null } = {}) {
  const city = normalizeCity(suggestion?.name || rawCity);

  if (!city) {
    ui.showValidation("Enter a city name to check its sky cred.");
    return;
  }

  if (city.length > MAX_CITY_LENGTH) {
    ui.showValidation("That city name is too long. Try a shorter search.");
    return;
  }

  const country = currentCountry();
  const request = { city, country: country.code };

  if (suggestion) {
    if (suggestion.id) {
      request.id = suggestion.id;
    } else if (suggestion.lat !== undefined && suggestion.lon !== undefined) {
      request.lat = suggestion.lat;
      request.lon = suggestion.lon;
    }
  }

  performSearch(request, { isInitial });
}

function initialize() {
  ui.bindSearch((value, suggestion) => {
    searchCity(value, { suggestion });
  });

  ui.bindSuggestionSelect((suggestion) => {
    ui.setSearchValue(suggestion.name);
    searchCity(suggestion.name, { suggestion });
  });

  ui.bindPopularCities((city, countryCode) => {
    if (countryCode) {
      ui.setCountryByCode(countryCode);
    }
    ui.setSearchValue(city);
    ui.clearValidation();
    searchCity(city);
  });

  ui.bindInitialRetry(() => {
    const request = lastRequest || {
      city: DEFAULT_CITY,
      country: currentCountry().code || DEFAULT_COUNTRY,
    };
    ui.showInitialLoading();
    performSearch(request, { isInitial: true });
  });

  ui.bindBannerRetry();
  ui.bindErrorDismiss();
  ui.bindJsonViewer();

  const country = currentCountry();

  ui.setSearchValue(DEFAULT_CITY);
  ui.setSelectedCity(DEFAULT_CITY, country.code);
  ui.showInitialLoading();
  performSearch({ city: DEFAULT_CITY, country: country.code }, { isInitial: true });
}

initialize();
