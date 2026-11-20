import assert from "node:assert/strict";
import { classifyApiFailure } from "../js/api.js";
import {
  derivePersonality,
  deriveSkyTheme,
  formatRegion,
  getHumidityNote,
  getUvLevel,
  getWeatherIconUrl,
  getWindNote,
  normalizeCityName,
} from "../js/weather.js";

let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    console.error(`  ✗ ${name}`);
    throw error;
  }
}

function current(overrides = {}) {
  return {
    temp_c: 22,
    wind_kph: 10,
    vis_km: 10,
    is_day: 1,
    condition: { text: "Sunny", code: 1000 },
    ...overrides,
  };
}

console.log("SKY CRED — interpretation checks");

test("very cold maps to Freeze Frame", () => {
  assert.equal(derivePersonality(current({ temp_c: 4 })).title, "Freeze Frame");
});

test("frozen precipitation maps to Freeze Frame", () => {
  assert.equal(
    derivePersonality(current({ temp_c: 1, condition: { text: "Light snow", code: 1213 } })).title,
    "Freeze Frame",
  );
});

test("rain maps to Rain Check", () => {
  assert.equal(
    derivePersonality(current({ condition: { text: "Light rain", code: 1183 } })).title,
    "Rain Check",
  );
});

test("very hot maps to Sun Alert", () => {
  assert.equal(derivePersonality(current({ temp_c: 36 })).title, "Sun Alert");
});

test("strong wind maps to Breezy Mode", () => {
  assert.equal(derivePersonality(current({ wind_kph: 35 })).title, "Breezy Mode");
});

test("haze maps to Hazy Outlook", () => {
  assert.equal(
    derivePersonality(current({ condition: { text: "Smoky haze", code: 1036 } })).title,
    "Hazy Outlook",
  );
});

test("pleasant conditions map to Perfect Day", () => {
  assert.equal(derivePersonality(current()).title, "Perfect Day");
});

test("freeze takes priority over rain", () => {
  assert.equal(
    derivePersonality(current({ temp_c: 2, condition: { text: "Patchy rain nearby", code: 1063 } })).title,
    "Freeze Frame",
  );
});

test("rain takes priority over heat", () => {
  assert.equal(
    derivePersonality(current({ temp_c: 37, condition: { text: "Moderate rain", code: 1189 } })).title,
    "Rain Check",
  );
});

test("haze takes priority over wind", () => {
  assert.equal(
    derivePersonality(
      current({ wind_kph: 42, condition: { text: "Fog", code: 1135 } }),
    ).title,
    "Hazy Outlook",
  );
});

test("clear daytime theme", () => {
  assert.deepEqual(deriveSkyTheme(current()), { theme: "clear", isNight: false });
});

test("rain, storm, snow and mist themes", () => {
  assert.equal(
    deriveSkyTheme(current({ condition: { text: "Moderate rain", code: 1189 } })).theme,
    "rain",
  );
  assert.equal(
    deriveSkyTheme(current({ condition: { text: "Thunderstorm", code: 1276 } })).theme,
    "storm",
  );
  assert.equal(
    deriveSkyTheme(current({ condition: { text: "Blizzard", code: 1117 } })).theme,
    "snow",
  );
  assert.equal(
    deriveSkyTheme(current({ condition: { text: "Fog", code: 1135 } })).theme,
    "mist",
  );
});

test("night flag is preserved", () => {
  assert.equal(deriveSkyTheme(current({ is_day: 0 })).isNight, true);
});

test("UV categories", () => {
  assert.equal(getUvLevel(1).label, "Low");
  assert.equal(getUvLevel(4).label, "Moderate");
  assert.equal(getUvLevel(7).label, "High");
  assert.equal(getUvLevel(9).label, "Very high");
  assert.equal(getUvLevel(11).label, "Extreme");
});

test("humidity and wind notes", () => {
  assert.match(getHumidityNote(20), /Dry/);
  assert.match(getHumidityNote(50), /Comfortable/);
  assert.match(getWindNote(5), /Calm/);
  assert.match(getWindNote(35), /Strong/);
});

test("WeatherAPI icon is upgraded to 128px over HTTPS", () => {
  assert.equal(
    getWeatherIconUrl("//cdn.weatherapi.com/weather/64x64/day/113.png"),
    "https://cdn.weatherapi.com/weather/128x128/day/113.png",
  );
});

test("region avoids repeating the city name", () => {
  assert.equal(
    formatRegion({ name: "Delhi", region: "Delhi", country: "India" }),
    "India",
  );
  assert.equal(
    formatRegion({ name: "Mumbai", region: "Maharashtra", country: "India" }),
    "Maharashtra, India",
  );
});

test("city matching is case and whitespace insensitive", () => {
  assert.equal(normalizeCityName("  New   York "), "new york");
});

test("API error mapping covers config, rate limit, city, server and generic", () => {
  assert.equal(classifyApiFailure(401, 1002), "CONFIG");
  assert.equal(classifyApiFailure(200, 2006), "CONFIG");
  assert.equal(classifyApiFailure(429, 0), "RATE_LIMIT");
  assert.equal(classifyApiFailure(200, 2007), "RATE_LIMIT");
  assert.equal(classifyApiFailure(400, 1006), "CITY_NOT_FOUND");
  assert.equal(classifyApiFailure(404, 0), "CITY_NOT_FOUND");
  assert.equal(classifyApiFailure(503, 0), "SERVICE");
  assert.equal(classifyApiFailure(400, 1003), "GENERIC");
  assert.equal(classifyApiFailure(200, 0), "UNEXPECTED");
});

console.log(`\n${passed} checks passed.`);
