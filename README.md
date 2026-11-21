# SKY CRED

**Check the sky's credit score before you step out.**

SKY CRED is a lightweight, single-page weather dashboard built with HTML, CSS and vanilla JavaScript. It fetches live current conditions from WeatherAPI, presents the data without weather jargon, and translates temperature, sky condition and wind into one clear recommendation.

Live application: **https://credsky-murex.vercel.app**

Source: **https://github.com/mariyaahaffiz-eng/CREDSKY**

---

## What it does

- Loads Mumbai, India on first visit.
- Searches any city by button or Enter key, with a searchable country selector (default: India).
- Shows live city suggestions as **City, Region, Country**, filtered to the selected country.
- Resolves suggestions by WeatherAPI location id or exact coordinates, so ambiguous names such as Delhi resolve to the right country.
- Verifies the returned `location.country` and shows **No match found in &lt;country&gt;** instead of wrong-country data.
- Always displays the full resolved location (city, region, country).
- Provides ten popular-city shortcuts, each carrying its country (e.g. Delhi, India / New York, USA / London, UK).
- Displays live temperature, condition, feels-like temperature, local city time and API weather icon.
- Shows humidity, wind, UV index, cloud cover, visibility, pressure, Fahrenheit temperature and last-updated time.
- Derives a **Sky Cred verdict** from the live conditions.
- Includes a developer JSON viewer with formatted/raw tabs, copy and scrolling. The API response uses JetBrains Mono; all other UI text uses Inter.
- Handles validation, invalid cities, country mismatches, offline/network failures, rate limits, configuration failures, server errors, timeouts and unexpected payloads.
- Keeps the last successful weather card visible when a later search fails.
- Ignores stale responses so an older request can never overwrite a newer city.

---

## Tech stack

- Semantic HTML
- Hand-written CSS with responsive breakpoints and reduced-motion support
- Vanilla JavaScript ES modules
- Zero runtime dependencies
- WeatherAPI `/v1/current.json` and `/v1/search.json`
- Serverless API routes (`api/weather.js`, `api/search.js`) that keep the WeatherAPI key server-side
- Inter for body and UI text, JetBrains Mono for the developer JSON viewer (Google Fonts, `font-display: swap`)
- Vercel static hosting plus Vercel Functions

No framework, database, authentication, forecast or weather history is included.

---

## Project structure

```text
.
├── api/
│   ├── weather.js      # serverless weather proxy + country verification
│   └── search.js       # serverless autocomplete proxy, filtered by country
├── index.html
├── favicon.svg
├── css/
│   └── styles.css
├── js/
│   ├── app.js          # controller: search flow, country state, stale-response guard
│   ├── api.js          # browser client for /api routes, validation, error classification
│   ├── countries.js    # ISO country data, aliases, matching and filtering
│   ├── weather.js      # interpretation engine, formatting and theme helpers
│   └── ui.js           # DOM rendering, country/city comboboxes, JSON viewer, clock
├── lib/
│   └── weatherapi.js   # server-only WeatherAPI client and response validation
├── scripts/
│   ├── build.js        # copies static files; never injects credentials
│   ├── dev.js          # local server with /api route support and .env loading
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
npm test        # interpretation, country-matching, formatting and API error-mapping checks
npm run build   # creates dist/ from static assets (no credentials are added)
npm start       # serves the last build and the /api routes on port 4173
```

`scripts/dev.js` loads `.env` into the local server process so `/api/weather` and
`/api/search` behave like Vercel Functions during local testing.

### API key security

The WeatherAPI key is a **server-side secret**. The browser only calls same-origin
`/api/weather` and `/api/search` routes; the serverless functions attach the key
when calling WeatherAPI. The static bundle contains no key and makes no direct
requests to `api.weatherapi.com`.

The key is read from `.env` locally or from the `WEATHER_API_KEY` environment
variable on Vercel. `.env` is gitignored; the generated `dist/` directory is also
gitignored.

---

## Deployment

The repository is designed to deploy directly to Vercel:

- **Build command:** `node scripts/build.js`
- **Output directory:** `dist`
- **Required environment variable:** `WEATHER_API_KEY`

**Deploying updates:** `vercel --prod` from the project root. Connecting the GitHub
repository for automatic deployments requires a Vercel account GitHub login
connection, which is a dashboard step (`Settings → Git`), not something the
build or this repository can configure.

`vercel.json` also sets a restrictive Content Security Policy, frame protection,
MIME sniffing protection and a permissions policy.

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

## API requests

The browser never calls WeatherAPI directly.

```http
GET /api/search?q=Delhi&country=IN
GET /api/weather?id=1112321&country=IN
GET /api/weather?city=Delhi&country=CA
```

The serverless routes call WeatherAPI with the secret key:

```http
GET https://api.weatherapi.com/v1/search.json?key=SECRET&q=Delhi
GET https://api.weatherapi.com/v1/current.json?key=SECRET&q=Delhi, India
```

`/api/search` merges results from the raw query and `City, Country`, filters them
to the selected country and returns ranked suggestions. `/api/weather` resolves a
suggestion by `id:XXXX` or coordinates, or resolves typed input as `City, Country`,
then verifies that `location.country` matches the selection. A mismatch returns
`COUNTRY_MISMATCH`, which the UI presents as **No match found in &lt;country&gt;**.

The exact upstream response text is preserved for the Raw JSON tab. Required
response fields are validated before rendering; incomplete payloads are rejected
rather than replacing valid data.

---

## Testing

Run the deterministic checks:

```bash
npm test
```

The live end-to-end and responsive checks performed for this build are documented in [`docs/REQUIREMENT-CHECKLIST.md`](docs/REQUIREMENT-CHECKLIST.md).
