# SKY CRED

**Check the sky's credit score before you step out.**

SKY CRED is a lightweight, single-page weather dashboard built with HTML, CSS and vanilla JavaScript. It fetches live current conditions from WeatherAPI, presents the data without weather jargon, and translates temperature, sky condition and wind into one clear recommendation.

Live application: **https://credsky.vercel.app** _(update if the deployed URL differs)_

---

## What it does

- Loads Mumbai on first visit.
- Searches any city by button or Enter key.
- Provides ten popular-city shortcuts with a visible selected state.
- Displays live temperature, condition, feels-like temperature, local city time and API weather icon.
- Shows humidity, wind, UV index, cloud cover, visibility, pressure, Fahrenheit temperature and last-updated time.
- Derives a **Sky Cred verdict** from the live conditions.
- Includes a developer JSON viewer with formatted/raw tabs, copy and scrolling.
- Handles validation, invalid cities, offline/network failures, rate limits, configuration failures, server errors, timeouts and unexpected payloads.
- Keeps the last successful weather card visible when a later search fails.
- Ignores stale responses so an older request can never overwrite a newer city.

---

## Tech stack

- Semantic HTML
- Hand-written CSS with responsive breakpoints and reduced-motion support
- Vanilla JavaScript ES modules
- Zero runtime dependencies
- WeatherAPI `/v1/current.json`
- Node.js build script only (injects the API key from the environment)
- Vercel static hosting

No framework, database, backend, authentication, forecast or weather history is included.

---

## Project structure

```text
.
├── index.html
├── favicon.svg
├── css/
│   └── styles.css
├── js/
│   ├── app.js          # controller: request lifecycle, stale-response guard, retries
│   ├── api.js          # WeatherAPI client, validation, error classification
│   ├── weather.js      # interpretation engine, formatting and theme helpers
│   ├── ui.js           # DOM rendering, JSON viewer, clock, clipboard
│   └── config.js       # source placeholder; generated in dist by the build
├── scripts/
│   ├── build.js        # copies static files and injects WEATHER_API_KEY
│   ├── dev.js          # zero-dependency local static server
│   └── test-interpretation.js
├── docs/
│   └── REQUIREMENT-CHECKLIST.md
├── .env.example
├── .gitignore
├── package.json
└── vercel.json
```

---

## Local development

Requirements: Node.js 18+.

1. Create `.env` from `.env.example` and add a WeatherAPI key:

   ```dotenv
   WEATHER_API_KEY=your_weatherapi_key_here
   ```

2. Install nothing (there are no dependencies), then build and serve:

   ```bash
   npm run dev
   ```

3. Open `http://localhost:4173`.

Other scripts:

```bash
npm test        # interpretation, formatting and API error-mapping checks
npm run build   # creates dist/ with the key injected into js/config.js
npm start       # serves the last build on port 4173
```

### API key security

This is a static frontend application. The WeatherAPI key is necessarily present in the browser bundle after build. It is **not** a secure server secret and is not represented as one.

The key is read from `.env` locally or from the `WEATHER_API_KEY` environment variable on Vercel. `.env` is gitignored; the generated `dist/` directory is also gitignored.

---

## Deployment

The repository is designed to deploy directly to Vercel:

- **Build command:** `node scripts/build.js`
- **Output directory:** `dist`
- **Required environment variable:** `WEATHER_API_KEY`

`vercel.json` also sets a restrictive Content Security Policy, frame protection, MIME sniffing protection and a permissions policy.

---

## Sky Cred interpretation

Priority is evaluated top to bottom, so overlapping conditions resolve predictably:

| Priority | Personality | Rule | Recommendation |
| --- | --- | --- | --- |
| 1 | Freeze Frame | `temp_c <= 5`, or frozen precipitation | Bone-chilling cold. Bundle up tight. |
| 2 | Rain Check | Rain, drizzle, showers or thunder in the condition | Carry an umbrella before stepping out. |
| 3 | Sun Alert | `temp_c >= 35` | Stay hydrated and avoid excessive sun exposure. |
| 4 | Hazy Outlook | Fog, mist, haze, smoke, dust, sand, or visibility < 2 km | Visibility is low. Take it slow and stay aware. |
| 5 | Breezy Mode | `wind_kph >= 30` | Expect strong winds. Dress accordingly. |
| 6 | Perfect Day | Everything else | Great weather to step outside. |

The five examples from the PRD are implemented exactly; **Hazy Outlook** was added so fog/haze/smoke do not incorrectly receive a "Perfect Day" verdict.

The verdict is explicitly labelled in the UI as an application-generated interpretation, not a real credit score.

---

## API request

```http
GET https://api.weatherapi.com/v1/current.json?key=WEATHER_API_KEY&q=CITY
```

The exact response text is preserved for the Raw JSON tab. Required response fields are validated before rendering; incomplete payloads are rejected rather than replacing valid data.

---

## Testing

Run the deterministic checks:

```bash
npm test
```

The live end-to-end and responsive checks performed for this build are documented in [`docs/REQUIREMENT-CHECKLIST.md`](docs/REQUIREMENT-CHECKLIST.md).
