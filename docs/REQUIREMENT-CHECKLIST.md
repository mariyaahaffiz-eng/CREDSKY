# SKY CRED — Requirement & Testing Checklist

**Implementation:** complete  
**Deployed:** https://credsky-murex.vercel.app (Vercel production)  
**Repository:** https://github.com/mariyaahaffiz-eng/CREDSKY  
**Test date:** 21 November 2026  
**Live API:** WeatherAPI `/v1/current.json` + `/v1/search.json` via serverless proxies  
**Primary browsers tested:** Google Chrome 157 and Microsoft Edge 157 (Chromium)  
**Viewports tested:** 1440 px desktop, 768 px tablet, 390 px mobile  
**Automated checks:** 24/24 passed (`npm test`)  
**Lighthouse:** Accessibility 100 · Best Practices 100 · SEO 100  
**End-to-end report:** all tested flows passed, including Delhi (India/Canada), Paris (France/USA) and Springfield (USA)

Legend:

- **Pass** — exercised against the live app/API and observed.
- **Pass (mapping test)** — full UI path injected with the API failure and observed.
- **Gap** — implemented but not exercised in this environment.

---

## Functional requirements

### FR-01 — Application initialization

| ID | Status | Evidence |
| --- | --- | --- |
| FR-01.1 Default city | Pass | Initial input and selected chip are Mumbai. |
| FR-01.2 Initial API call | Pass | Live WeatherAPI request fires on page load. |
| FR-01.3 Initial loading | Pass | Skeleton, `aria-busy="true"` and loading status appear before the response. |
| FR-01.4 Successful response | Pass | Weather card rendered from the live response. |
| FR-01.5 Failed response | Pass | Initial network failure showed the full-card error state, not blank data. |

Acceptance: initial request automatic; input Mumbai; data populated from API; no hardcoded weather values.

### FR-02 — City search

| ID | Status | Evidence |
| --- | --- | --- |
| FR-02.1 Search input | Pass | Free-text city input plus a searchable country selector defaulting to India. |
| FR-02.2 Search action | Pass | Button and Enter searches verified with Delhi (India), Paris (France) and Springfield (USA). |
| FR-02.3 Keyboard support | Pass | Enter submits; Arrow keys move through city/country options; Escape closes lists. |
| FR-02.4 Empty validation | Pass | Whitespace-only search showed a validation message and made no weather request. |
| FR-02.5 API request | Pass | Each valid search produced a same-origin `/api/weather` request. |
| FR-02.6 Result update | Pass | All weather and JSON fields updated after each response. |
| FR-02.7 Search failure | Pass | `zzzznotacity` showed “City not found”. |
| FR-02.8 Autocomplete | Pass | Typing “Delhi” with India selected showed “Delhi, Delhi, India” only; with Canada selected it showed “Delhi, Ontario, Canada” only. |
| FR-02.9 Suggestion lookup | Pass | Selecting a suggestion requested `/api/weather?id=…`; Delhi India used `id=1112321`, Delhi Canada `id=313868`. |
| FR-02.10 Country verification | Pass | Delhi with United States selected returned “No match found in United States” and kept the previous card. |
| FR-02.11 Full location | Pass | Card shows city, region and country (e.g. “Paris, Ile-de-France, France”); the line under the search repeats the full resolved location. |

Acceptance: country-filtered Delhi and Paris searches fetched; input retained search; the previous card stayed visible during a failed or mismatched search; multiple searches occurred without a refresh.

### FR-02A — Country resolution matrix

| Requested city | Selected country | Resolved location | Status |
| --- | --- | --- | --- |
| Delhi | India | Delhi, Delhi, India | Pass |
| Delhi | Canada | Delhi, Ontario, Canada | Pass |
| Paris | France | Paris, Ile-de-France, France | Pass |
| Paris | United States | Paris, Texas, United States of America | Pass |
| Springfield | United States | Springfield, Massachusetts, United States of America | Pass |

### FR-03 — Popular cities

| ID | Status | Evidence |
| --- | --- | --- |
| FR-03.1 City shortcuts | Pass | All ten required cities are rendered as chips with country labels (e.g. “Delhi, India”, “New York, USA”, “London, UK”). |
| FR-03.2 City selection | Pass | Bengaluru, London and New York chip clicks fetched live weather. |
| FR-03.3 Search synchronization | Pass | Input updated to the clicked city and the selector to the chip's country. |
| FR-03.4 Selection indicator | Pass | Only the active chip has `aria-pressed="true"` and the accent style. |
| FR-03.5 Weather update | Pass | Card, metrics, local time, icon and JSON all changed together. |
| FR-03.6 Country-aware chips | Pass | Clicking “London, UK” switched the selector to United Kingdom and requested `country=GB`; “New York, USA” requested `country=US`. |

Acceptance: Bengaluru fetched; selected city highlighted; Mumbai lost highlight; all weather components reflected Bengaluru.

### FR-04 — Current weather information

| ID | Status | Evidence |
| --- | --- | --- |
| Dynamic population | Pass | Temperature, condition, feels-like, icon, local time and metrics all come from the response. |
| Celsius | Pass | Displayed `°C`. |
| Wind km/h | Pass | Displayed `km/h` from `current.wind_kph`. |
| Weather icon | Pass | API condition icon loaded from `cdn.weatherapi.com`; alt text uses the API condition. |
| Local time | Pass | Rendered in the searched city's timezone (`Asia/Kolkata`, `Europe/London`) and refreshed every 30 seconds. |
| No hardcoded weather | Pass | Static HTML uses placeholders only; all values are populated after fetch. |

### FR-05 — Weather interpretation

| ID | Status | Evidence |
| --- | --- | --- |
| Dynamic personality | Pass | Derived from API temperature, condition and wind. |
| Title/description | Pass | All five PRD personalities implemented with the requested copy. |
| Updates per city | Pass | London returned “Rain Check”; Mumbai returned “Hazy Outlook”. |
| Defined thresholds | Pass | Tests cover every branch. |
| Overlap priority | Pass | Freeze > Rain > Heat > Haze > Wind > Perfect, tested with conflicting inputs. |

Additional condition coverage: **Hazy Outlook** handles fog/mist/haze/smoke/dust/sand so those are not mislabelled “Perfect Day”.

The UI displays: “App-generated interpretation · Not a real credit score.”

### FR-06 — Additional weather metrics

| Metric | Status | Evidence |
| --- | --- | --- |
| Humidity | Pass | Live `current.humidity`, `%`, contextual note. |
| Wind | Pass | Live `current.wind_kph`, `km/h`, contextual note. |
| UV index | Pass | Live `current.uv`, level and exposure note. |
| Cloud coverage | Pass | Live `current.cloud`. |
| Visibility | Pass | Live `current.vis_km`. |
| Pressure | Pass | Live `current.pressure_mb`. |
| Wind speed (secondary) | Pass | Live value plus direction. |
| Fahrenheit | Pass | Live `current.temp_f`. |
| Last updated | Pass | API timestamp formatted in the city timezone. |
| Updates on search | Pass | Verified across Mumbai, Bengaluru, London, Paris. |

### FR-07 — API response viewer

| ID | Status | Evidence |
| --- | --- | --- |
| FR-07.1 Formatted JSON | Pass | Two-space indentation. |
| FR-07.2 Raw JSON | Pass | Original response text preserved, including no inserted whitespace. |
| FR-07.3 Tab switching | Pass | Click and Left/Right/Home/End keyboard navigation verified. |
| FR-07.4 Copy | Pass | Clipboard contained the currently selected representation; “Copied” feedback shown. |
| FR-07.5 Data synchronization | Pass | JSON updated to each new city after successful fetch. |
| FR-07.6 Scroll | Pass | Formatted view scrolls vertically; raw view scrolls horizontally inside the panel. |

### FR-08 — Error and exception handling

| Scenario | Status | Observed result |
| --- | --- | --- |
| Empty input | Pass | Validation message; no request. |
| Invalid city | Pass | “City not found”; previous card retained. |
| Country mismatch | Pass | “No match found in United States”; previous card retained. |
| Invalid API key | Pass (mapping test) | “API configuration error”; previous card retained. |
| API rate limit | Pass (mapping test) | “Temporary service error”; retry offered. |
| Internet unavailable | Pass | “No network connection”; previous card retained. |
| API server unavailable | Pass (mapping test) | “Service unavailable”; retry offered. |
| Slow response | Pass | Held a live request: updating overlay, loading button and `aria-busy="true"` appeared while Mumbai remained visible. |
| Unexpected response | Pass (mapping test) | “Unexpected response”; incomplete data rejected. |
| Generic API error | Pass (mapping test) | “Could not load the weather”; previous card retained. |
| Request timeout | Pass | Held request for 15 seconds; “The request timed out” shown with retry, Mumbai retained. |

Additional requirements verified:

- No blank weather card.
- Valid data is not replaced by incomplete responses.
- Retry is available for initial and subsequent failures.
- Outdated request protection: Delhi request was held, Chennai was issued, Chennai rendered, then the late Delhi request was continued. Final UI remained Chennai; late request was aborted. **Pass.**

### FR-09 — Responsive behaviour

| Device/viewport | Status | Evidence |
| --- | --- | --- |
| Desktop 1440 px | Pass | Centered, 1240 px max content; weather + JSON side-by-side. |
| Tablet 768 px | Pass | Hero stacks; weather card full width; JSON/method two-column. |
| Mobile 390 px | Pass | Search compresses to icon button; country selector moves to its own row; metrics stack; JSON below card. |
| No horizontal overflow | Pass | `scrollWidth === innerWidth` at 390, 768 and 1440, including the error banner, open country list and open city suggestions. |

---

## FR-10 — WeatherAPI integration

| Requirement | Status |
| --- | --- |
| WeatherAPI.com | Pass |
| `/v1/current.json` | Pass |
| `/v1/search.json` | Pass |
| GET | Pass |
| `key` + `q` query parameters | Pass (added server-side only) |
| Default query Mumbai, India | Pass |
| JSON response parsing | Pass |
| Dynamic UI population | Pass |
| Fresh request per city | Pass |
| Error/network handling | Pass |
| API key stored in `.env` / Vercel env | Pass |
| Key absent from browser bundle and requests | Pass |
| No hardcoded/mock weather | Pass |

### FR-11 — Typography

| ID | Status | Evidence |
| --- | --- | --- |
| FR-11.1 Body/UI font | Pass | Inter loaded from Google Fonts with `display=swap`; computed body weight 400. |
| FR-11.2 Weight scale | Pass | Body 400, labels/buttons 500–600, headings 700. |
| FR-11.3 Developer monospace | Pass | JetBrains Mono applies only to the developer JSON/API panel. |
| FR-11.4 No layout shift | Pass | Metric-matched local fallback (`Inter Fallback`) and `font-display: swap`; layout measured after fonts loaded. |
| FR-11.5 Theme preserved | Pass | Colors, spacing and layout unchanged; only typefaces and type weights changed. |

---

## Non-functional requirements

| Category | Status | Notes |
| --- | --- | --- |
| Performance | Partial verification | Lightweight static app; loading feedback appears immediately. No formal performance benchmark was run. |
| API performance | Pass | Loading state appears before the response resolves. |
| Reliability | Pass | Error scenarios, retries, timeout, stale-request protection and country verification tested. |
| Security | Pass | WeatherAPI key is server-side only; the browser makes no `api.weatherapi.com` requests. CSP uses `connect-src 'self'`; Lighthouse Best Practices 100. |
| Maintainability | Pass | HTML, CSS and JS separated into focused ES modules. |
| Compatibility | Gap | Verified in Chrome 157 and Edge 157. Safari and Firefox were not available for runtime testing; only standards-based features are used. |
| Accessibility | Pass | Lighthouse Accessibility 100; keyboard Enter search and JSON tab navigation verified; accessible labels, live regions, focus states and reduced-motion styles present. |
| Responsiveness | Pass | Desktop, tablet and mobile checked; no horizontal overflow. |
| Scalability | Pass | API, interpretation, UI and controller layers are separate; interpretation is unit tested. |

---

## Product success criteria

1. Mumbai live weather on launch — **Pass**
2. Any valid city can be searched — **Pass**
3. Popular-city switching — **Pass**
4. Values reflect the API response — **Pass**
5. Understandable recommendation — **Pass**
6. No page refresh required — **Pass**
7. API failures handled gracefully — **Pass**
8. Works on desktop and mobile — **Pass**
9. Ambiguous city names resolve to the selected country — **Pass**
10. Typography matches the Inter / JetBrains Mono requirement — **Pass**

---

## Incomplete / unverified items

**Functional requirements:** none are unimplemented.

**Verification gaps:**

1. Safari and Firefox runtime compatibility was not tested in this environment.
2. No formal performance benchmark was recorded.
3. No visual-reference screenshot was present in the workspace, so pixel-level fidelity to an external reference could not be compared.

No feature was added outside the PRD scope. The only additional interpretation branch is **Hazy Outlook**, which is part of the required weather-interpretation behaviour and prevents misleading “Perfect Day” verdicts for fog/haze/smoke.
