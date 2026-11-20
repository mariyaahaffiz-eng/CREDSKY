import {
  buildFactorTags,
  deriveSkyTheme,
  formatBytes,
  formatClockForZone,
  formatNumber,
  formatRegion,
  formatTime,
  getHumidityNote,
  getUvLevel,
  getWeatherIconUrl,
  getWindNote,
  normalizeCityName,
} from "./weather.js";

const elements = {
  body: document.body,
  searchForm: document.querySelector("#search-form"),
  searchInput: document.querySelector("#city-input"),
  searchButton: document.querySelector("#search-button"),
  searchButtonLabel: document.querySelector(".search-button__label"),
  searchHint: document.querySelector("#search-hint"),
  popularCities: document.querySelector("#popular-cities"),
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

export const ui = {
  elements,

  bindSearch(handler) {
    elements.searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handler(elements.searchInput.value);
    });

    elements.searchInput.addEventListener("input", () => {
      this.clearValidation();
    });
  },

  bindPopularCities(handler) {
    elements.popularCities.addEventListener("click", (event) => {
      const chip = event.target.closest(".city-chip");
      if (!chip) return;
      handler(chip.dataset.city);
    });
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
    elements.searchInput.setAttribute("aria-invalid", "true");
    elements.searchInput.focus();
  },

  clearValidation() {
    setElementText(elements.searchHint, "");
    elements.searchInput.removeAttribute("aria-invalid");
  },

  setSelectedCity(cityName) {
    const key = cityName ? normalizeCityName(cityName) : "";
    elements.popularCities.querySelectorAll(".city-chip").forEach((chip) => {
      chip.setAttribute(
        "aria-pressed",
        String(Boolean(key) && normalizeCityName(chip.dataset.city) === key),
      );
    });
  },

  getSelectedCity() {
    const activeChip = elements.popularCities.querySelector(
      '.city-chip[aria-pressed="true"]',
    );
    return activeChip?.dataset.city || null;
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
