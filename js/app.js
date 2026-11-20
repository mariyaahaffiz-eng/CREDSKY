import { WeatherError, fetchCurrentWeather } from "./api.js";
import {
  derivePersonality,
  findPopularCity,
  formatNumber,
} from "./weather.js";
import { ui } from "./ui.js";

const DEFAULT_CITY = "Mumbai";
const MAX_CITY_LENGTH = 100;

let activeController = null;
let hasWeather = false;
let lastSuccessfulCity = null;
let lastFailedCity = null;

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

async function searchCity(rawCity, { isInitial = false } = {}) {
  const city = normalizeCity(rawCity);

  if (!city) {
    ui.showValidation("Enter a city name to check its sky cred.");
    return;
  }

  if (city.length > MAX_CITY_LENGTH) {
    ui.showValidation("That city name is too long. Try a shorter search.");
    return;
  }

  ui.clearValidation();
  ui.hideBanner();

  const selectionBefore = ui.getSelectedCity();
  const popularMatch = findPopularCity(city);

  if (popularMatch) {
    ui.setSelectedCity(popularMatch);
  } else {
    ui.setSelectedCity(null);
  }

  if (activeController) {
    activeController.abort();
  }

  const controller = new AbortController();
  activeController = controller;
  lastFailedCity = city;

  ui.setSearching(true);

  try {
    const result = await fetchCurrentWeather(city, { signal: controller.signal });

    if (controller.signal.aborted) {
      return;
    }

    hasWeather = true;
    lastSuccessfulCity = result.data.location.name;
    lastFailedCity = null;

    const personality = derivePersonality(result.data.current);
    ui.renderWeather(result.data, personality);
    ui.setJson(result.data, result.raw);
    ui.setSelectedCity(findPopularCity(result.data.location.name));
    ui.setSearching(false);

    document.title = `${result.data.location.name} · ${formatNumber(
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
    lastFailedCity = city;
    ui.setSearching(false);

    if (!hasWeather) {
      ui.showInitialError(weatherError);
      ui.setSelectedCity(selectionBefore || (isInitial ? DEFAULT_CITY : null));
    } else {
      ui.showBanner(weatherError, () => {
        searchCity(city);
      });
      ui.setSelectedCity(findPopularCity(lastSuccessfulCity));
    }
  } finally {
    if (activeController === controller) {
      activeController = null;
    }
  }
}

function initialize() {
  ui.bindSearch((value) => searchCity(value));
  ui.bindPopularCities((city) => {
    ui.setSearchValue(city);
    ui.clearValidation();
    searchCity(city);
  });
  ui.bindInitialRetry(() => {
    searchCity(lastFailedCity || DEFAULT_CITY);
  });
  ui.bindBannerRetry();
  ui.bindErrorDismiss();
  ui.bindJsonViewer();

  ui.setSearchValue(DEFAULT_CITY);
  ui.setSelectedCity(DEFAULT_CITY);
  ui.showInitialLoading();
  searchCity(DEFAULT_CITY, { isInitial: true });
}

initialize();
