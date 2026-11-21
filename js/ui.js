import { fetchCitySuggestions } from "./api.js";
import {
  filterCountries,
  findCountry,
  getCountryByCode,
} from "./countries.js";
import {
  buildFactorTags,
  deriveSkyTheme,
  formatBytes,
  formatClockForZone,
  formatFullLocation,
  formatNumber,
  formatRegion,
  formatTime,
  getHumidityNote,
  getPopularCityLabel,
  getUvLevel,
  getWeatherIconUrl,
  getWindNote,
  normalizeCityName,
  POPULAR_CITIES,
} from "./weather.js";

const elements = {
  body: document.body,
  searchForm: document.querySelector("#search-form"),
  searchField: document.querySelector(".search-field"),
  searchInput: document.querySelector("#city-input"),
  searchButton: document.querySelector("#search-button"),
  searchButtonLabel: document.querySelector(".search-button__label"),
  searchHint: document.querySelector("#search-hint"),
  countryPicker: document.querySelector("#country-picker"),
  countryInput: document.querySelector("#country-input"),
  countryListbox: document.querySelector("#country-listbox"),
  citySuggestions: document.querySelector("#city-suggestions"),
  popularCities: document.querySelector("#popular-cities"),
  resolvedLocation: document.querySelector("#resolved-location"),
  resolvedLocationText: document.querySelector("#resolved-location-text"),
  weatherPanel: document.querySelector("#weather-panel"),
  initialLoading: document.querySelector("#initial-loading"),
  initialError: document.querySelector("#initial-error"),
  initialErrorTitle: document.querySelector("#initial-error-title"),
  initialErrorMessage: document.querySelector("#initial-error-message"),
  initialRetry: document.querySelector("#initial-retry"),
  weatherContent: document.querySelector("#weather-content"),
  updatingOverlay: document.querySelector("#updating-overlay"),
  cityName: document.querySelector("#city-name"),
  cityRegion: document.querySelector("#city-region"),
  location: document.querySelector(".location"),
  localTime: document.querySelector("#local-time"),
  timezone: document.querySelector("#timezone"),
  tempValue: document.querySelector("#temp-value"),
  feelsLike: document.querySelector("#feels-like"),
  conditionText: document.querySelector("#condition-text"),
  weatherIcon: document.querySelector("#weather-icon"),
  verdict: document.querySelector("#verdict"),
  personalityTitle: document.querySelector("#personality-title"),
  personalityDescription: document.querySelector("#personality-description"),
  verdictFactors: document.querySelector("#verdict-factors"),
  humidityValue: document.querySelector("#humidity-value"),
  humidityBar: document.querySelector("#humidity-bar"),
  humidityNote: document.querySelector("#humidity-note"),
  windValue: document.querySelector("#wind-value"),
  windNote: document.querySelector("#wind-note"),
  uvValue: document.querySelector("#uv-value"),
  uvLevel: document.querySelector("#uv-level"),
  uvBar: document.querySelector("#uv-bar"),
  uvNote: document.querySelector("#uv-note"),
  cloudsValue: document.querySelector("#clouds-value"),
  visibilityValue: document.querySelector("#visibility-value"),
  pressureValue: document.querySelector("#pressure-value"),
  windDetailValue: document.querySelector("#wind-detail-value"),
  fahrenheitValue: document.querySelector("#fahrenheit-value"),
  lastUpdatedValue: document.querySelector("#last-updated-value"),
  updatedLabel: document.querySelector("#updated-label"),
  errorBanner: document.querySelector("#error-banner"),
  errorBannerTitle: document.querySelector("#error-banner-title"),
  errorBannerMessage: document.querySelector("#error-banner-message"),
  errorRetry: document.querySelector("#error-retry"),
  errorDismiss: document.querySelector("#error-dismiss"),
  tabFormatted: document.querySelector("#tab-formatted"),
  tabRaw: document.querySelector("#tab-raw"),
  jsonView: document.querySelector("#json-view"),
  jsonContent: document.querySelector("#json-content"),
  jsonCode: document.querySelector("#json-content code"),
  jsonSize: document.querySelector("#json-size"),
  copyButton: document.querySelector("#copy-json"),
  copyLabel: document.querySelector("#copy-label"),
  toast: document.querySelector("#toast"),
  toastMessage: document.querySelector("#toast-message"),
  liveRegion: document.querySelector("#live-region"),
};

const state = {
  activeTab: "formatted",
  formattedJson: "",
  rawJson: "",
  clockTimer: null,
  activeTimeZone: "",
  bannerRetry: null,
  toastTimer: null,
  copyTimer: null,
  hasWeather: false,
  country: getCountryByCode("IN"),
  countryOpen: false,
  countryOptions: [],
  countryActiveIndex: -1,
  suggestions: [],
  suggestionActiveIndex: -1,
  selectedSuggestion: null,
  suggestionAbort: null,
  suggestionTimer: null,
  suggestionToken: 0,
  suggestionBlurTimer: null,
  countryBlurTimer: null,
  onSuggestionSelect: null,
  onCountryChange: null,
};

function setElementText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function setProgress(element, value, max = 100) {
  if (!element) return;
  const numeric = Number(value);
  const percentage = Number.isFinite(numeric)
    ? Math.max(0, Math.min(100, (numeric / max) * 100))
    : 0;
  element.style.setProperty("--progress", `${percentage}%`);
}

function startClock(timeZone) {
  if (state.clockTimer) {
    clearInterval(state.clockTimer);
  }

  state.activeTimeZone = timeZone;

  const renderClock = () => {
    setElementText(elements.localTime, formatClockForZone(state.activeTimeZone));
  };

  renderClock();
  state.clockTimer = window.setInterval(renderClock, 30000);
}

function formatLastUpdated(epochSeconds, timeZone) {
  const date = new Date(Number(epochSeconds) * 1000);
  if (Number.isNaN(date.getTime())) return "—";

  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return formatTime(epochSeconds, timeZone);
  }
}

function setTabs(tabName) {
  state.activeTab = tabName === "raw" ? "raw" : "formatted";
  const isFormatted = state.activeTab === "formatted";

  elements.tabFormatted.setAttribute("aria-selected", String(isFormatted));
  elements.tabFormatted.tabIndex = isFormatted ? 0 : -1;
  elements.tabRaw.setAttribute("aria-selected", String(!isFormatted));
  elements.tabRaw.tabIndex = isFormatted ? -1 : 0;
  elements.jsonView.setAttribute(
    "aria-labelledby",
    isFormatted ? "tab-formatted" : "tab-raw",
  );

  const content = isFormatted ? state.formattedJson : state.rawJson;
  const target = elements.jsonCode || elements.jsonContent;
  target.textContent = content || "Waiting for live data…";
}

function setJson(payload, raw) {
  state.formattedJson = JSON.stringify(payload, null, 2);
  state.rawJson = raw;
  elements.copyButton.disabled = false;
  setElementText(elements.jsonSize, formatBytes(new Blob([raw]).size));
  setTabs(state.activeTab);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";
  document.body.appendChild(textArea);
  textArea.select();

  const succeeded = document.execCommand("copy");
  textArea.remove();

  if (!succeeded) {
    throw new Error("Copy command was rejected.");
  }
}

function showToast(message) {
  setElementText(elements.toastMessage, message);
  elements.toast.hidden = false;
  clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 2200);
}

function announce(message) {
  setElementText(elements.liveRegion, "");
  window.setTimeout(() => setElementText(elements.liveRegion, message), 30);
}

function resetCopyFeedback() {
  elements.copyButton.classList.remove("is-copied");
  setElementText(elements.copyLabel, "Copy");
}

async function handleCopy() {
  const content = state.activeTab === "formatted" ? state.formattedJson : state.rawJson;
  if (!content) return;

  try {
    await copyText(content);
    elements.copyButton.classList.add("is-copied");
    setElementText(elements.copyLabel, "Copied");
    showToast("JSON copied to clipboard");
    clearTimeout(state.copyTimer);
    state.copyTimer = window.setTimeout(resetCopyFeedback, 2000);
  } catch {
    showToast("Couldn't copy automatically — select the JSON manually.");
  }
}

function formatSuggestionLabel(suggestion) {
  return [suggestion.name, suggestion.region, suggestion.country]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function renderPopularCities() {
  elements.popularCities.replaceChildren();

  for (const entry of POPULAR_CITIES) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "city-chip";
    chip.dataset.city = entry.city;
    chip.dataset.countryCode = entry.code;
    chip.textContent = getPopularCityLabel(entry);
    chip.setAttribute("aria-pressed", "false");
    elements.popularCities.append(chip);
  }
}

/* ---------- Country combobox ---------- */

function setCountryActive(index) {
  const options = [...elements.countryListbox.querySelectorAll(".country-option")];

  if (!options.length) {
    state.countryActiveIndex = -1;
    elements.countryInput.removeAttribute("aria-activedescendant");
    return;
  }

  state.countryActiveIndex = (index + options.length) % options.length;

  options.forEach((option, optionIndex) => {
    const active = optionIndex === state.countryActiveIndex;
    option.classList.toggle("is-active", active);
    if (active) {
      elements.countryInput.setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    }
  });
}

function renderCountryOptions(query) {
  const matches = filterCountries(query);
  state.countryOptions = matches;
  state.countryActiveIndex = -1;
  elements.countryInput.removeAttribute("aria-activedescendant");
  elements.countryListbox.replaceChildren();
  elements.countryListbox.scrollTop = 0;

  if (!matches.length) {
    const empty = document.createElement("li");
    empty.className = "country-empty";
    empty.setAttribute("role", "option");
    empty.setAttribute("aria-disabled", "true");
    empty.textContent = "No countries found";
    elements.countryListbox.append(empty);
    return;
  }

  for (const country of matches) {
    const option = document.createElement("li");
    option.className = "country-option";
    option.id = `country-option-${country.code}`;
    option.dataset.code = country.code;
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(country.code === state.country?.code));

    const name = document.createElement("span");
    name.textContent = country.name;

    const code = document.createElement("span");
    code.className = "country-option__code";
    code.textContent = country.code;

    option.append(name, code);
    elements.countryListbox.append(option);
  }

  if (!query) {
    const selectedIndex = matches.findIndex((country) => country.code === state.country?.code);
    if (selectedIndex >= 0) setCountryActive(selectedIndex);
  }
}

function openCountryList(query) {
  state.countryOpen = true;
  elements.countryPicker.classList.add("is-open");
  elements.countryListbox.hidden = false;
  elements.countryInput.setAttribute("aria-expanded", "true");
  renderCountryOptions(query);
}

function closeCountryList() {
  state.countryOpen = false;
  state.countryOptions = [];
  state.countryActiveIndex = -1;
  elements.countryPicker.classList.remove("is-open");
  elements.countryListbox.hidden = true;
  elements.countryInput.setAttribute("aria-expanded", "false");
  elements.countryInput.removeAttribute("aria-activedescendant");
}

/** Updates selector state without firing the app-level change callback. */
function applyCountry(country) {
  state.country = country;
  elements.countryInput.value = country.name;
  closeCountryList();

  state.selectedSuggestion = null;
  cancelSuggestions();

  elements.popularCities.querySelectorAll(".city-chip").forEach((chip) => {
    if (chip.dataset.countryCode !== country.code) {
      chip.setAttribute("aria-pressed", "false");
    }
  });
}

function selectCountry(country) {
  applyCountry(country);
  if (typeof state.onCountryChange === "function") {
    state.onCountryChange(country);
  }
}

/* ---------- City autocomplete ---------- */

function closeSuggestions() {
  state.suggestions = [];
  state.suggestionActiveIndex = -1;
  elements.citySuggestions.hidden = true;
  elements.citySuggestions.replaceChildren();
  elements.searchInput.setAttribute("aria-expanded", "false");
  elements.searchInput.removeAttribute("aria-activedescendant");
}

function cancelSuggestions({ clearSelection = true } = {}) {
  window.clearTimeout(state.suggestionTimer);
  state.suggestionTimer = null;

  if (state.suggestionAbort) {
    state.suggestionAbort.abort();
    state.suggestionAbort = null;
  }

  state.suggestionToken += 1;
  closeSuggestions();

  if (clearSelection) {
    state.selectedSuggestion = null;
  }
}

function setSuggestionActive(index) {
  const options = [...elements.citySuggestions.querySelectorAll(".suggestion")];

  if (!options.length) {
    state.suggestionActiveIndex = -1;
    elements.searchInput.removeAttribute("aria-activedescendant");
    return;
  }

  state.suggestionActiveIndex = (index + options.length) % options.length;

  options.forEach((option, optionIndex) => {
    const active = optionIndex === state.suggestionActiveIndex;
    option.classList.toggle("is-active", active);
    option.setAttribute("aria-selected", String(active));
    if (active) {
      elements.searchInput.setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    }
  });
}

function renderSuggestions(suggestions) {
  state.suggestions = suggestions;
  state.suggestionActiveIndex = -1;
  elements.citySuggestions.replaceChildren();
  elements.citySuggestions.scrollTop = 0;
  elements.searchInput.removeAttribute("aria-activedescendant");

  if (!suggestions.length) {
    closeSuggestions();
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const option = document.createElement("div");
    option.className = "suggestion";
    option.id = `city-option-${suggestion.id}`;
    option.dataset.index = String(index);
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", "false");
    option.textContent = formatSuggestionLabel(suggestion);
    elements.citySuggestions.append(option);
  });

  elements.citySuggestions.hidden = false;
  elements.searchInput.setAttribute("aria-expanded", "true");
}

function scheduleSuggestions() {
  const query = elements.searchInput.value.trim();
  cancelSuggestions();

  if (query.length < 2) return;

  state.suggestionTimer = window.setTimeout(async () => {
    const country = state.country;
    if (!country) return;

    const controller = new AbortController();
    state.suggestionAbort = controller;
    const token = state.suggestionToken;

    try {
      const suggestions = await fetchCitySuggestions({
        query,
        country: country.code,
        signal: controller.signal,
      });

      if (token !== state.suggestionToken) return;
      if (elements.searchInput.value.trim() !== query) return;
      if (country.code !== state.country?.code) return;

      renderSuggestions(suggestions);
    } catch (error) {
      if (token === state.suggestionToken && error?.name !== "AbortError") {
        closeSuggestions();
        elements.searchHint.dataset.kind = "info";
        setElementText(
          elements.searchHint,
          "City suggestions are unavailable. Press Enter to search by name.",
        );
      }
    } finally {
      if (state.suggestionAbort === controller) {
        state.suggestionAbort = null;
      }
    }
  }, 280);
}

function chooseSuggestion(suggestion) {
  window.clearTimeout(state.suggestionTimer);
  cancelSuggestions({ clearSelection: false });
  state.selectedSuggestion = suggestion;
  elements.searchInput.value = suggestion.name;
  elements.searchInput.focus();

  if (typeof state.onSuggestionSelect === "function") {
    state.onSuggestionSelect(suggestion);
  }
}

function bindCountryEvents() {
  elements.countryInput.addEventListener("focus", () => {
    elements.countryInput.select();
    openCountryList("");
  });

  elements.countryInput.addEventListener("input", () => {
    openCountryList(elements.countryInput.value);
  });

  elements.countryInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!state.countryOpen) openCountryList(elements.countryInput.value);
      setCountryActive(state.countryActiveIndex + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!state.countryOpen) openCountryList(elements.countryInput.value);
      setCountryActive(state.countryActiveIndex - 1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const country = state.countryOptions[state.countryActiveIndex];
      if (country) {
        selectCountry(country);
        return;
      }
      const match = findCountry(elements.countryInput.value);
      if (match) selectCountry(match);
      else {
        closeCountryList();
        elements.countryInput.value = state.country?.name || "India";
      }
      return;
    }

    if (event.key === "Escape") {
      closeCountryList();
      elements.countryInput.value = state.country?.name || "India";
    }
  });

  elements.countryInput.addEventListener("blur", () => {
    window.clearTimeout(state.countryBlurTimer);
    state.countryBlurTimer = window.setTimeout(() => {
      closeCountryList();
      const match = findCountry(elements.countryInput.value);
      if (match && match.code !== state.country?.code) selectCountry(match);
      else elements.countryInput.value = state.country?.name || "India";
    }, 130);
  });

  elements.countryListbox.addEventListener("pointerdown", (event) => {
    const option = event.target.closest(".country-option");
    if (!option) return;
    event.preventDefault();
    const country = getCountryByCode(option.dataset.code);
    if (country) selectCountry(country);
  });

  document.addEventListener("pointerdown", (event) => {
    if (!state.countryOpen) return;
    if (elements.countryPicker.contains(event.target)) return;
    closeCountryList();
    elements.countryInput.value = state.country?.name || "India";
  });
}

function bindSuggestionEvents() {
  elements.searchInput.addEventListener("input", () => {
    setElementText(elements.searchHint, "");
    delete elements.searchHint.dataset.kind;
    elements.searchInput.removeAttribute("aria-invalid");
    scheduleSuggestions();
  });

  elements.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (state.suggestions.length) setSuggestionActive(state.suggestionActiveIndex + 1);
      else scheduleSuggestions();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (state.suggestions.length) setSuggestionActive(state.suggestionActiveIndex - 1);
      return;
    }

    if (event.key === "Escape") {
      cancelSuggestions({ clearSelection: false });
      return;
    }

    if (event.key === "Enter" && state.suggestionActiveIndex >= 0) {
      const suggestion = state.suggestions[state.suggestionActiveIndex];
      if (suggestion) {
        event.preventDefault();
        chooseSuggestion(suggestion);
      }
    }
  });

  elements.searchInput.addEventListener("blur", () => {
    window.clearTimeout(state.suggestionBlurTimer);
    state.suggestionBlurTimer = window.setTimeout(() => closeSuggestions(), 130);
  });

  elements.citySuggestions.addEventListener("pointerdown", (event) => {
    const option = event.target.closest(".suggestion");
    if (!option) return;
    event.preventDefault();
    const suggestion = state.suggestions[Number(option.dataset.index)];
    if (suggestion) chooseSuggestion(suggestion);
  });
}

renderPopularCities();
bindCountryEvents();
bindSuggestionEvents();
elements.countryInput.value = state.country.name;

export const ui = {
  elements,

  bindSearch(handler) {
    elements.searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const suggestion = state.selectedSuggestion;
      state.selectedSuggestion = null;
      closeSuggestions();
      handler(elements.searchInput.value, suggestion);
    });
  },

  bindPopularCities(handler) {
    elements.popularCities.addEventListener("click", (event) => {
      const chip = event.target.closest(".city-chip");
      if (!chip) return;
      handler(chip.dataset.city, chip.dataset.countryCode);
    });
  },

  bindCountryChange(handler) {
    state.onCountryChange = typeof handler === "function" ? handler : null;
  },

  bindSuggestionSelect(handler) {
    state.onSuggestionSelect = typeof handler === "function" ? handler : null;
  },

  bindInitialRetry(handler) {
    elements.initialRetry.addEventListener("click", handler);
  },

  bindBannerRetry() {
    elements.errorRetry.addEventListener("click", () => {
      if (typeof state.bannerRetry === "function") {
        state.bannerRetry();
      }
    });
  },

  bindErrorDismiss() {
    elements.errorDismiss.addEventListener("click", () => {
      this.hideBanner();
      elements.searchInput.focus();
    });
  },

  bindJsonViewer() {
    elements.tabFormatted.addEventListener("click", () => setTabs("formatted"));
    elements.tabRaw.addEventListener("click", () => setTabs("raw"));
    elements.copyButton.addEventListener("click", handleCopy);

    const tabs = [elements.tabFormatted, elements.tabRaw];
    tabs.forEach((tab, index) => {
      tab.addEventListener("keydown", (event) => {
        let nextIndex = null;

        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          const direction = event.key === "ArrowRight" ? 1 : -1;
          nextIndex = (index + direction + tabs.length) % tabs.length;
        } else if (event.key === "Home") {
          event.preventDefault();
          nextIndex = 0;
        } else if (event.key === "End") {
          event.preventDefault();
          nextIndex = tabs.length - 1;
        }

        if (nextIndex !== null) {
          tabs[nextIndex].focus();
          tabs[nextIndex].click();
        }
      });
    });
  },

  setSearchValue(value) {
    elements.searchInput.value = value;
  },

  focusSearch() {
    elements.searchInput.focus();
    elements.searchInput.select();
  },

  showValidation(message) {
    setElementText(elements.searchHint, message);
    delete elements.searchHint.dataset.kind;
    elements.searchInput.setAttribute("aria-invalid", "true");
    elements.searchInput.focus();
  },

  clearValidation() {
    setElementText(elements.searchHint, "");
    delete elements.searchHint.dataset.kind;
    elements.searchInput.removeAttribute("aria-invalid");
  },

  setSelectedCity(cityName, countryCode = null) {
    const key = cityName ? normalizeCityName(cityName) : "";
    const code = countryCode ? String(countryCode).toUpperCase() : null;

    elements.popularCities.querySelectorAll(".city-chip").forEach((chip) => {
      const matchesCity = Boolean(key) && normalizeCityName(chip.dataset.city) === key;
      const matchesCountry = !code || chip.dataset.countryCode === code;
      chip.setAttribute("aria-pressed", String(matchesCity && matchesCountry));
    });
  },

  getSelectedCity() {
    const activeChip = elements.popularCities.querySelector(
      '.city-chip[aria-pressed="true"]',
    );
    return activeChip?.dataset.city || null;
  },

  getCountry() {
    return state.country;
  },

  setCountryByCode(code) {
    const country = getCountryByCode(code);
    if (country && country.code !== state.country?.code) {
      applyCountry(country);
    }
  },

  setResolvedLocation(location) {
    const full = formatFullLocation(location);
    setElementText(elements.resolvedLocationText, full || "—");
    elements.resolvedLocation.hidden = !full;
  },

  setSearching(isLoading) {
    elements.searchButton.classList.toggle("is-loading", isLoading);
    setElementText(elements.searchButtonLabel, isLoading ? "Checking" : "Check sky");
    elements.weatherPanel.setAttribute("aria-busy", String(isLoading));

    if (isLoading) {
      if (state.hasWeather) {
        elements.updatingOverlay.hidden = false;
        elements.weatherPanel.classList.add("is-updating");
      }
    } else {
      elements.updatingOverlay.hidden = true;
      elements.weatherPanel.classList.remove("is-updating");
    }
  },

  showInitialLoading() {
    state.hasWeather = false;
    elements.initialLoading.hidden = false;
    elements.initialError.hidden = true;
    elements.weatherContent.hidden = true;
    elements.updatingOverlay.hidden = true;
    elements.weatherPanel.classList.remove("is-updating");
    elements.weatherPanel.setAttribute("aria-busy", "true");
    elements.weatherPanel.removeAttribute("data-sky");
    elements.weatherPanel.removeAttribute("data-night");
  },

  renderWeather(data, personality) {
    const { location, current } = data;
    const theme = deriveSkyTheme(current);
    const uv = getUvLevel(current.uv);

    state.hasWeather = true;
    elements.initialLoading.hidden = true;
    elements.initialError.hidden = true;
    elements.weatherContent.hidden = false;
    elements.updatingOverlay.hidden = true;
    elements.weatherPanel.classList.remove("is-updating");
    elements.weatherPanel.setAttribute("aria-busy", "false");

    elements.weatherPanel.dataset.sky = theme.theme;
    elements.weatherPanel.dataset.night = String(theme.isNight);
    elements.body.dataset.sky = theme.theme;

    setElementText(elements.cityName, location.name);
    setElementText(elements.cityRegion, formatRegion(location) || location.country || "—");
    setElementText(elements.timezone, location.tz_id || "Local timezone");
    setElementText(elements.resolvedLocationText, formatFullLocation(location) || "—");
    elements.resolvedLocation.hidden = !formatFullLocation(location);
    startClock(location.tz_id);

    setElementText(elements.tempValue, formatNumber(current.temp_c));
    setElementText(elements.feelsLike, formatNumber(current.feelslike_c));
    setElementText(elements.conditionText, current.condition.text);

    const iconUrl = getWeatherIconUrl(current.condition.icon);
    elements.weatherIcon.src = iconUrl;
    elements.weatherIcon.alt = `${current.condition.text} weather icon`;

    elements.verdict.dataset.personality = personality.key;
    setElementText(elements.personalityTitle, personality.title);
    setElementText(elements.personalityDescription, personality.description);

    elements.verdictFactors.replaceChildren();
    buildFactorTags(current).forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "verdict-factor";
      chip.textContent = tag;
      elements.verdictFactors.appendChild(chip);
    });

    setElementText(elements.humidityValue, formatNumber(current.humidity));
    setElementText(elements.humidityNote, getHumidityNote(current.humidity));
    setProgress(elements.humidityBar, current.humidity);

    setElementText(elements.windValue, formatNumber(current.wind_kph, 1));
    setElementText(elements.windNote, getWindNote(current.wind_kph));

    setElementText(elements.uvValue, formatNumber(current.uv, 1));
    setElementText(elements.uvLevel, uv.label);
    setElementText(elements.uvNote, uv.note);
    setProgress(elements.uvBar, current.uv, 11);

    setElementText(elements.cloudsValue, `${formatNumber(current.cloud)}%`);
    setElementText(elements.visibilityValue, `${formatNumber(current.vis_km, 1)} km`);
    setElementText(elements.pressureValue, `${formatNumber(current.pressure_mb)} mb`);
    setElementText(
      elements.windDetailValue,
      `${formatNumber(current.wind_kph, 1)} km/h${current.wind_dir ? ` · ${current.wind_dir}` : ""}`,
    );
    setElementText(elements.fahrenheitValue, `${formatNumber(current.temp_f)}°F`);

    const lastUpdated = formatLastUpdated(
      current.last_updated_epoch,
      location.tz_id,
    );
    setElementText(elements.updatedLabel, `Updated ${lastUpdated}`);
    setElementText(elements.lastUpdatedValue, lastUpdated);

    announce(
      `Now showing ${location.name}: ${formatNumber(current.temp_c)} degrees Celsius, ${current.condition.text}. ${personality.title}.`,
    );
  },

  setJson,

  showInitialError(error) {
    state.hasWeather = false;
    elements.initialLoading.hidden = true;
    elements.weatherContent.hidden = true;
    elements.initialError.hidden = false;
    elements.updatingOverlay.hidden = true;
    elements.weatherPanel.classList.remove("is-updating");
    elements.weatherPanel.setAttribute("aria-busy", "false");
    setElementText(elements.initialErrorTitle, error.title);
    setElementText(elements.initialErrorMessage, error.userMessage);
    announce(`${error.title}. ${error.userMessage}`);
  },

  showBanner(error, onRetry) {
    setElementText(elements.errorBannerTitle, error.title);
    setElementText(elements.errorBannerMessage, error.userMessage);
    state.bannerRetry = typeof onRetry === "function" ? onRetry : null;
    elements.errorBanner.hidden = false;
    announce(`${error.title}. ${error.userMessage}`);
  },

  hideBanner() {
    elements.errorBanner.hidden = true;
    state.bannerRetry = null;
  },

  announce,

  showToast,
};
