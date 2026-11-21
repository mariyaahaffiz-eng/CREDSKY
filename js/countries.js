/**
 * Country reference data shared by the browser and the serverless API.
 *
 * WeatherAPI returns full country names ("United States of America",
 * "United Kingdom"), while the selector uses standard English display names
 * ("United States", "United Kingdom"). Explicit aliases make the comparison
 * predictable without guessing with substring matches.
 */

const ISO_CODES = [
  "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AO", "AQ", "AR", "AS", "AT",
  "AU", "AW", "AX", "AZ", "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI",
  "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY",
  "BZ", "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN",
  "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ", "DE", "DJ", "DK", "DM",
  "DO", "DZ", "EC", "EE", "EG", "EH", "ER", "ES", "ET", "FI", "FJ", "FK",
  "FM", "FO", "FR", "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL",
  "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY", "HK", "HM",
  "HN", "HR", "HT", "HU", "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR",
  "IS", "IT", "JE", "JM", "JO", "JP", "KE", "KG", "KH", "KI", "KM", "KN",
  "KP", "KR", "KW", "KY", "KZ", "LA", "LB", "LC", "LI", "LK", "LR", "LS",
  "LT", "LU", "LV", "LY", "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK",
  "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW",
  "MX", "MY", "MZ", "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP",
  "NR", "NU", "NZ", "OM", "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM",
  "PN", "PR", "PS", "PT", "PW", "PY", "QA", "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM",
  "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ", "TC", "TD", "TF",
  "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW",
  "TZ", "UA", "UG", "UM", "US", "UY", "UZ", "VA", "VC", "VE", "VG", "VI",
  "VN", "VU", "WF", "WS", "YE", "YT", "ZA", "ZM", "ZW",
];

/**
 * WeatherAPI's own country vocabulary is looser than ISO. These overrides
 * keep the `City, Country` query in wording WeatherAPI resolves reliably.
 */
const QUERY_OVERRIDES = Object.freeze({
  US: "United States",
  GB: "United Kingdom",
  KR: "South Korea",
  KP: "North Korea",
  RU: "Russia",
  VN: "Vietnam",
  CZ: "Czech Republic",
  TR: "Turkey",
  CI: "Ivory Coast",
  MM: "Myanmar",
  CD: "DR Congo",
  CG: "Congo",
  LA: "Laos",
  SY: "Syria",
  TZ: "Tanzania",
  BO: "Bolivia",
  VE: "Venezuela",
  IR: "Iran",
  TW: "Taiwan",
  HK: "Hong Kong",
  MO: "Macau",
  PS: "Palestine",
  BN: "Brunei",
  CV: "Cape Verde",
  SZ: "Eswatini",
  MK: "North Macedonia",
  NL: "Netherlands",
  AE: "United Arab Emirates",
});

/** Extra spellings WeatherAPI may use for a country. */
const EXTRA_ALIASES = Object.freeze({
  US: ["United States of America", "USA", "United States"],
  GB: ["United Kingdom", "UK", "Great Britain"],
  RU: ["Russian Federation", "Russia"],
  KR: ["South Korea", "Korea, Republic of", "Republic of Korea"],
  KP: ["North Korea", "Korea, Democratic People's Republic of"],
  VN: ["Vietnam", "Viet Nam"],
  CZ: ["Czech Republic", "Czechia"],
  TR: ["Turkey", "Türkiye"],
  CI: ["Ivory Coast", "Côte d'Ivoire"],
  MM: ["Myanmar", "Burma"],
  CD: ["DR Congo", "Democratic Republic of the Congo", "Congo, Democratic Republic of the"],
  CG: ["Congo", "Republic of the Congo"],
  LA: ["Laos", "Lao People's Democratic Republic"],
  SY: ["Syria", "Syrian Arab Republic"],
  TZ: ["Tanzania", "United Republic of Tanzania"],
  BO: ["Bolivia", "Bolivia, Plurinational State of"],
  VE: ["Venezuela", "Venezuela, Bolivarian Republic of"],
  IR: ["Iran", "Iran, Islamic Republic of"],
  TW: ["Taiwan", "Taiwan, Province of China"],
  HK: ["Hong Kong", "Hong Kong SAR"],
  MO: ["Macau", "Macao"],
  PS: ["Palestine", "Palestine, State of"],
  BN: ["Brunei", "Brunei Darussalam"],
  CV: ["Cape Verde", "Cabo Verde"],
  SZ: ["Eswatini", "Swaziland"],
  MK: ["North Macedonia", "Macedonia"],
  NL: ["Netherlands", "The Netherlands", "Holland"],
  AE: ["United Arab Emirates", "UAE"],
  VA: ["Vatican City", "Holy See"],
  FM: ["Micronesia", "Micronesia, Federated States of"],
  MD: ["Moldova", "Moldova, Republic of"],
  ST: ["Sao Tome and Principe", "São Tomé and Príncipe"],
  SH: ["Saint Helena", "St. Helena"],
  KN: ["Saint Kitts and Nevis", "St. Kitts and Nevis"],
  LC: ["Saint Lucia", "St. Lucia"],
  VC: ["Saint Vincent and the Grenadines", "St. Vincent & Grenadines"],
  PM: ["Saint Pierre and Miquelon", "St. Pierre & Miquelon"],
  MF: ["Saint Martin", "St. Martin"],
  BL: ["Saint Barthelemy", "St. Barthélemy"],
  SX: ["Sint Maarten", "St. Maarten"],
  UM: ["United States Minor Outlying Islands", "U.S. Outlying Islands"],
  VG: ["British Virgin Islands", "Virgin Islands (British)"],
  VI: ["U.S. Virgin Islands", "Virgin Islands (U.S.)"],
  FK: ["Falkland Islands", "Falkland Islands (Malvinas)"],
  GS: ["South Georgia and the South Sandwich Islands"],
});

const FALLBACK_NAMES = Object.freeze({
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  FR: "France",
  DE: "Germany",
  AU: "Australia",
  JP: "Japan",
  BR: "Brazil",
  CN: "China",
  AE: "United Arab Emirates",
  SG: "Singapore",
});

let displayNames;

function regionDisplayNames() {
  if (displayNames !== undefined) return displayNames;
  try {
    displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    displayNames = null;
  }
  return displayNames;
}

function countryName(code) {
  try {
    return regionDisplayNames()?.of(code) || FALLBACK_NAMES[code] || code;
  } catch {
    return FALLBACK_NAMES[code] || code;
  }
}

export const COUNTRIES = Object.freeze(
  ISO_CODES.map((code) =>
    Object.freeze({
      code,
      name: countryName(code),
      query: QUERY_OVERRIDES[code] || countryName(code),
      aliases: EXTRA_ALIASES[code] || [],
    }),
  ).sort((a, b) => a.name.localeCompare(b.name, "en")),
);

const COUNTRIES_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]));

/** Lowercase, de-accent and strip punctuation for tolerant comparisons. */
export function normalizeCountryName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Looks up a country by ISO code, display name, query name or alias. */
export function findCountry(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const byCode = COUNTRIES_BY_CODE.get(raw.toUpperCase());
  if (byCode) return byCode;

  const target = normalizeCountryName(raw);
  if (!target) return null;

  return (
    COUNTRIES.find((country) => {
      if (normalizeCountryName(country.name) === target) return true;
      if (normalizeCountryName(country.query) === target) return true;
      return country.aliases.some((alias) => normalizeCountryName(alias) === target);
    }) || null
  );
}

export function getCountryByCode(code) {
  return COUNTRIES_BY_CODE.get(String(code || "").toUpperCase()) || null;
}

/**
 * True when WeatherAPI's `location.country` string represents the country the
 * user selected. This is the guard that prevents silent wrong-country data.
 */
export function countryMatches(country, apiCountry) {
  if (!country) return false;

  const target = normalizeCountryName(apiCountry);
  if (!target) return false;

  const accepted = [country.name, country.query, ...country.aliases];
  return accepted.some((candidate) => normalizeCountryName(candidate) === target);
}

/** Filters the selector list while typing. */
export function filterCountries(query, limit = 300) {
  const target = normalizeCountryName(query);

  if (!target) {
    return COUNTRIES.slice(0, limit);
  }

  const scored = [];

  for (const country of COUNTRIES) {
    const name = normalizeCountryName(country.name);
    const code = country.code.toLowerCase();
    const aliases = country.aliases.map(normalizeCountryName);
    let score = -1;

    if (name === target || code === target || aliases.includes(target)) score = 0;
    else if (name.startsWith(target) || aliases.some((alias) => alias.startsWith(target))) score = 1;
    else if (name.includes(target)) score = 2;
    else if (code.startsWith(target)) score = 3;
    else if (aliases.some((alias) => alias.includes(target))) score = 4;

    if (score >= 0) scored.push({ country, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.country.name.localeCompare(b.country.name, "en"))
    .slice(0, limit)
    .map((entry) => entry.country);
}
