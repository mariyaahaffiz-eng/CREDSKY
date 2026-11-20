# SKY CRED — Requirement & Testing Checklist

**Implementation:** complete  
**Test date:** 20 November 2026  
**Live API:** WeatherAPI `/v1/current.json`  
**Primary browsers tested:** Google Chrome 157 and Microsoft Edge 157 (Chromium)  
**Viewports tested:** 1440 px desktop, 768 px tablet, 390 px mobile  
**Automated checks:** 19/19 passed (`npm test`)  
**Lighthouse:** Accessibility 100 · Best Practices 100 · SEO 100  
**End-to-end report:** all tested flows passed

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
| FR-02.1 Search input | Pass | Free-text city input. |
| FR-02.2 Search action | Pass | Button search verified with Delhi and London. |
| FR-02.3 Keyboard support | Pass | Enter key submitted the form and loaded Delhi. |
| FR-02.4 Empty validation | Pass | Whitespace-only search showed a validation message and made no API request. |
| FR-02.5 API request | Pass | Each valid search produced a new WeatherAPI request. |
| FR-02.6 Result update | Pass | All weather and JSON fields updated after each response. |
| FR-02.7 Search failure | Pass | `zzzznotacity` showed “City not found”. |

Acceptance: Delhi/London fetched; input retained search; London card stayed visible during failed search; multiple searches occurred without a refresh.

### FR-03 — Popular cities

| ID | Status | Evidence |
| --- | --- | --- |
| FR-03.1 City shortcuts | Pass | All ten required cities are rendered as chips. |
| FR-03.2 City selection | Pass | Bengaluru and London chip clicks fetched live weather. |
| FR-03.3 Search synchronization | Pass | Input updated to the clicked city. |
| FR-03.4 Selection indicator | Pass | Only the active chip has `aria-pressed="true"` and the accent style. |
| FR-03.5 Weather update | Pass | Card, metrics, local time, icon and JSON all changed together. |

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
| Mobile 390 px | Pass | Search compresses to icon button; metrics stack; JSON below card. |
| No horizontal overflow | Pass | `scrollWidth === innerWidth` at 390, 768 and 1440, including the error banner state. |

---

## FR-10 — WeatherAPI integration

| Requirement | Status |
| --- | --- |
| WeatherAPI.com | Pass |
| `/v1/current.json` | Pass |
| GET | Pass |
| `key` + `q` query parameters | Pass |
| Default query Mumbai | Pass |
| JSON response parsing | Pass |
| Dynamic UI population | Pass |
| Fresh request per city | Pass |
| Error/network handling | Pass |
| API key stored in `.env` / Vercel env | Pass |
| No hardcoded/mock weather | Pass |

---

## Non-functional requirements

| Category | Status | Notes |
| --- | --- | --- |
| Performance | Partial verification | Lightweight static app; loading feedback appears immediately. No formal performance benchmark was run. |
| API performance | Pass | Loading state appears before the response resolves. |
| Reliability | Pass | Error scenarios, retries, timeout and stale-request protection tested. |
| Security | Pass | Key is correctly treated as public frontend configuration; `.env` gitignored; CSP and security headers configured; Lighthouse Best Practices 100. |
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

---

## Incomplete / unverified items

**Functional requirements:** none are unimplemented.

**Verification gaps:**

1. Safari and Firefox runtime compatibility was not tested in this environment.
2. No formal performance benchmark was recorded.
3. No visual-reference screenshot was present in the workspace, so pixel-level fidelity to an external reference could not be compared.

No feature was added outside the PRD scope. The only additional interpretation branch is **Hazy Outlook**, which is part of the required weather-interpretation behaviour and prevents misleading “Perfect Day” verdicts for fog/haze/smoke.
