# Aura Weather

Aura Weather is a React weather dashboard built around fast scanning, atmospheric context, and resilient client-side API handling.

It is designed as a portfolio project with real frontend concerns in scope:

- live weather, geocoding, air quality, and optional climate context
- responsive dashboard behavior from desktop down to small mobile screens
- accessible search, controls, and status messaging
- defensive API fallbacks for unsupported or degraded data sources
- automated smoke, visual regression, and unit coverage

## Live Demo

- Production: [aura-weather-platform.netlify.app](https://aura-weather-platform.netlify.app/)
- Local dev: `npm run dev`

## Product Highlights

- Immediate fallback forecast for Chicago on first load, with optional location permission instead of a stalled geolocation wait
- Current conditions, hourly outlook, rain guidance, risk signals, and 7-day forecast in one surface
- Open-Meteo powered weather, air quality, geocoding, and archive data
- NOAA / NWS severe alerts with explicit unsupported-region fallback messaging
- Saved cities, persisted location preference, and optional cloud sync for saved locations
- Temperature-unit changes stay local to the UI instead of forcing fresh forecast/climate requests
- Keyboard-friendly city search with async cancellation and combobox/listbox behavior
- Search feedback shows a real loading state before any empty-result messaging appears
- Startup-city controls only appear when a startup preference actually exists, reducing first-load clutter
- Reduced-motion-safe card rendering, refreshed mobile layouts, and deferred loading for lower-priority dashboard panels

## Tech Stack

- React 19
- Vite 6
- Lucide React
- Plain CSS
- Playwright + axe-core
- Open-Meteo APIs

## Project Structure

```text
src/
  api/                       # Open-Meteo + NWS fetch adapters
    openMeteo.js             #   forecast, archive, AQI, geocode, alerts
    transforms.js            #   raw → AppWeatherModel normalization
    types.js                 #   model schema + skeleton factory
  domain/                    # Pure weather classification logic
    weatherCodes.js          #   WMO code → label/icon/gradient
    weatherScene.js          #   forecast + loading + error → UI scene
    meteorology.js           #   storm risk, pressure trend, comfort
    aqi.js  wind.js  temperature.js
  hooks/                     # React orchestration + persistence
    useWeatherDashboardViewModel.js  # composes the dashboard hook bag
    useWeather.js            #   location + saved-cities + sync
    useWeatherData.js        #   forecast + supplemental fetch lifecycle
    useClimateComparison.js  #   historical archive lifecycle
    useLocation.js           #   geolocation + persisted/saved cities
    useSavedLocationsSync.js #   pull/push cloud sync orchestration
    useCitySearch.js         #   debounced abortable geocoder
    useRainAnalysis.js  useDeferredMount.js  useDisplayPreferences.js
    useLocalStorageState.js  useAppShellEffects.js
    climateComparison.js  savedLocationsSyncHelpers.js   # pure helpers
  components/                # React surface
    layout/                  #   AppShell, AppHeader, StatusStack,
                             #   WeatherDashboard, SupplementalWeatherPanels
    header/                  #   Saved cities, sync panel, display settings
    ui/                      #   Card primitives, DataTrustMeta, InfoDrawer
    HeroCard, RainCard, ForecastCard, NowcastCard,
    StormWatch, HourlyCard, AlertsCard, ExposureSection,
    CitySearch, WeatherIcon, AppErrorBoundary
  services/                  # Cross-cutting services
    savedLocationsSync.js    #   sync key + jsonblob persistence
  utils/                     # Pure helpers
    numbers.js               #   strict toFiniteNumber (rejects null)
    weatherUnits.js  meteorology.js  dates.js  dataTrust.js
    sunlight.js  timeSeries.js  weatherCodes.js  temperature.js
```

Each layer has a strict dependency direction:
`components → hooks → api/services → utils/domain`. Components never
fetch directly; hooks never compute UI gradients; the API layer
never imports a React module.

## Running Locally

1. Install dependencies:

```bash
npm ci
```

2. Copy the optional env file if you want key-based sync URLs:

```bash
Copy-Item .env.example .env
```

3. Start the dev server:

```bash
npm run dev
```

4. Open `http://127.0.0.1:5173`

## Environment Variables

Aura works without API keys for weather data.

Optional variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_AURA_SYNC_API_BASE` | No | Base URL for saved-location sync when users enter a short key instead of a full sync URL |

If `VITE_AURA_SYNC_API_BASE` is not set, sync still works when the stored account value is a full URL.

## Quality Checks

```bash
npm run lint
npm test
npm run build
npm run test:e2e
npm run test:visual
npm run test:lighthouse
```

### Latest local QA snapshot

- `npm run lint` passes
- `npm test` passes (`103` tests)
- `npm run build` passes
- `npm run test:e2e` passes (`13` Playwright checks, including smoke, unicode-escape leak guard, and visual regression)
- `npm run test:lighthouse` passes the local budget gate

### Current automated coverage

- Node tests for:
  - API model contracts
  - alert coverage fallback behavior
  - saved-location sync normalization and error handling
  - location persistence helpers
  - weather domain utilities and formatters
- Playwright smoke coverage for:
  - dashboard boot
  - city search and location switching
  - search loading feedback before empty-result states resolve
  - unit switching without refetching forecast/climate data
  - failed cloud-sync connection attempts staying disconnected with an explicit error
  - removing the active saved city clearing persisted startup-location storage
  - unsupported-region severe alert fallback
  - mobile overflow regression
  - regression guard ensuring no literal `\uXXXX` escape sequences leak into rendered text
  - accessibility scan using axe-core
- Playwright visual baselines for:
  - desktop dashboard
  - tablet dashboard
  - mobile dashboard

## Demo Expectations

- First load opens to a usable Chicago forecast immediately instead of stalling on a geolocation permission prompt.
- Browser location is opt-in. Users can keep the fallback city, search manually, or grant location access.
- Core weather data loads first. Air quality, alerts, and climate context can recover independently if a secondary API is slow or unavailable.
- Search shows a loading state before empty results, so users do not get a premature "No matching cities" response.
- Startup-city controls stay hidden until a startup preference actually exists.
- Failed cloud sync connection attempts surface an error and stay disconnected instead of leaving a stale connected-looking state.
- Cloud sync is optional and intentionally secondary to the main forecast workflow.

## Accessibility Notes

- Skip link to main content
- Visible focus states
- Keyboard-searchable city combobox
- Live status messaging for loading and refresh states
- Reduced-motion-safe card visibility and transitions
- Updated mobile touch targets for smaller utility controls

## Architecture Decisions

Short notes on the non-obvious choices a reviewer might question.

- **Forecast is always fetched in Fahrenheit / inch units; conversion is client-side.** Switching the °F/°C toggle must not trigger a refetch — it would invalidate the displayed timestamp and confuse users. A Playwright test asserts that toggling units does not refetch.
- **Three independent fetch tracks.** Forecast, supplemental (AQI + alerts), and climate-archive run concurrently with separate AbortController + request-id pairs. A slow archive call cannot delay the hero card; an alerts feed outage cannot wipe the AQI reading.
- **NWS alerts are U.S.-only by design.** A 400/404 from `api.weather.gov/alerts/active` is mapped to an explicit `unsupported` status (not `unavailable`) so the UI can say "Alerts unavailable for this region" instead of an ambiguous "no alerts".
- **Strict numeric coercion at the API boundary.** `Number(null) === 0` would surface as a fake 0°F humidity / 0% rain chance / 0°F historical sample whenever Open-Meteo returns a missing data point. A single shared `toFiniteNumber` helper rejects nullish, empty-string, boolean, array, and object inputs explicitly. Eight unit tests lock the contract.
- **Lazy supplemental panels.** The hero, exposure cards, and rain card render synchronously. Hourly chart, storm watch, alerts, forecast, and nowcast are mounted via `Suspense` after a `requestIdleCallback` (or 180ms fallback) so the first paint is just the data the user sees first.
- **CSS lives next to its component.** App.css holds only global tokens, resets, animations, and one shared focus-visible rule used across header buttons and retry buttons. Every feature's CSS is imported by its owning component.

## Recent Hardening

- **Unicode-escape rendering bug** — JSX text leaking literal `°` on the hourly chart Y axis and `—` in the AQI/UV empty state was fixed and now gated by an automated regression test.
- **Hourly chart "Now" alignment** — the active-hour indicator now snaps to the current hour band instead of skipping ahead to the next future timestamp, with a new `currentSlotToleranceMs` option in `findWindowStartIndex` and unit coverage to lock the behavior in.
- **Architecture trim** — extracted shared `CardFallback`, `useDeferredMount`, and `useClimateComparison` primitives to replace duplicated and oversized hook code. Pure helpers for climate comparison and saved-locations sync moved to dedicated modules with direct unit coverage. Activated the previously-unused `usePanelPreload` hook so heavy lazy panels warm up during browser idle.
- **CSS co-location** — `App.css` shrank from 2,067 to roughly 500 lines as `DataTrustMeta`, `InfoDrawer`, `AppShell`, `StatusStack`, the bento dashboard layout, and the entire header surface moved next to their owning components.
- **Scoped live regions** — `SyncAccountPanel` no longer wraps its full body in `aria-live="polite"`; only the error (`role="alert"`) and last-synced timestamp (`role="status"`) announce, and the truncated sync key advertises its full value via aria-label.
- **Strict API number coercion** — `Number(null)` is `0`, which silently surfaced as fake `0%` humidity, `0 hPa` pressure, `0°F` dew point, and `0°F` historical samples whenever Open-Meteo returned partial data. A shared `toFiniteNumber` helper rejects nullish/empty/boolean/object inputs at the API boundary, then routes the same contract through every per-element parser in HourlyCard, ForecastCard, NowcastCard, and `useRainAnalysis`.
- **In-flight async announcement** — async buttons (Use my location, Allow location, Retry, Sync now, Disconnect, Create cloud account) now expose `aria-busy` while their work is in flight, so screen-reader users get a signal even after tabbing away.
- **Climate comparison nullish-input fix** — `buildClimateComparison` now rejects nullish temperatures explicitly instead of coercing them to zero, which previously could surface fake "65°F warmer than average" lines for partial archive responses.
- **Status-stack collapse** — App.jsx no longer mounts two `role="status"` regions on every render.

## Known Limitations

- NOAA / NWS severe alerts are U.S.-region only; unsupported regions fall back to explanatory messaging instead of a false all-clear.
- Saved-location cloud sync is intentionally lightweight and expects either a full sync URL or a configured `VITE_AURA_SYNC_API_BASE`.
- The current Lighthouse budget now passes locally, but the app still carries a relatively large CSS surface and could be trimmed further for stronger real-world performance margins.

## Portfolio / Case Study Notes

If this project is presented in a portfolio, the strongest story is:

- resilient client-side API composition instead of a single happy-path fetch
- responsive dashboard work that now has smoke and visual regression protection
- accessibility work that goes beyond color tweaks into keyboard flow, live status messaging, and baseline axe coverage
- product decisions around trust cues, unsupported alert regions, location permission onboarding, and startup/sync recovery states

The weakest current story is still long-term performance optimization at scale. This repo is better as a frontend architecture and QA sample than as a claim of fully production-grade performance tuning, and there is still room to reduce CSS and JS weight further.

## Screenshot Guidance

- Use one desktop screenshot that shows the current conditions hero, exposure metrics, and risk panels together.
- Use one mobile screenshot that proves the stacked layout stays readable without horizontal overflow.
- If you write a case study, call out the unsupported-region alerts fallback, opt-in location onboarding, and the sync/search trust-state fixes instead of only showing polished visuals.

## Recruiter Notes

This project is strongest as a frontend implementation sample for:

- API integration and defensive client-side data handling
- responsive dashboard composition
- accessible interaction design
- CSS systems work without a component library
- QA maturity beyond a basic tutorial app, including regression coverage for async search, sync failures, and persistence cleanup

It is not pretending to be a full production weather platform. The strongest recruiter signal now is the combination of resilient client logic, accessible/mobile hardening, and a QA setup that includes smoke, visual, and Lighthouse gates. The remaining gap is headroom: the budget passes, but there is still room to slim the CSS/JS footprint further.
