# Changelog

Notable changes to Aura Weather. The audit pass below captures the
work that hardened the dashboard from a polished demo into a
portfolio-grade product. Format roughly follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased] — Audit pass (2026-05)

### Added

- **Data Trust Contract** enforcement at four layers (API normalization,
  per-element parsers, component fallback rendering, visual + a11y cue).
  See the README's "Data Trust Contract" section for the full layout.
- `src/utils/numbers.js` — strict `toFiniteNumber()` helper that rejects
  `null`, `undefined`, `""`, `boolean`, and `object` inputs explicitly.
  `MISSING_VALUE_PLACEHOLDER` and `isMissingPlaceholder()` constants for
  the shared em-dash glyph.
- `src/utils/temperature.js` exports `formatTemperatureValue()` and
  `formatTemperatureWithUnit()` — the unit suffix is suppressed on the
  missing path so the UI never renders the misleading `"—°F"` string.
- `useDeferredMount`, `useClimateComparison`, `usePrefersReducedData` —
  three new hooks extracted from oversized parents.
- Pure helper modules: `climateComparison.js`, `locationHelpers.js`,
  `savedLocationsSyncHelpers.js`, each with direct unit coverage.
- `PanelErrorBoundary` — isolates lazy-chunk failures so a hourly-chart
  load error cannot blank out the whole dashboard.
- `CardFallback` — shared loading-card primitive (was duplicated
  between `WeatherDashboard` and `SupplementalWeatherPanels`).
- `?mock=missing` dev mode (`src/dev/missingDataMock.js`) — patches
  `fetch` to reproduce the missing-data state on demand for screenshots
  and ad-hoc QA. Tree-shaken from production builds via
  `import.meta.env.DEV`.
- React render-test harness (`@testing-library/react` + `jsdom`) wired
  into `node:test` via a small esbuild-powered loader. No Vitest
  dependency.
- Per-card render tests for `Stat`, `HeroCard`, and `MetricCard` that
  pin the missing-data trust contract at the React DOM level.
- Hero "Some readings are unavailable" helper note when any stat is
  missing, with `role="status"` for assistive tech.
- Alert overflow signal — when NWS returns more than 4 alerts the card
  now surfaces an "+ N more alerts not shown" footnote.
- `prefers-reduced-data` support — historical archive fetch is
  suppressed automatically when the user-agent reports the preference.
- "CURRENT_TEMPERATURE_UNAVAILABLE" aria-label and muted typography for
  the giant hero temperature when the reading is missing.

### Changed

- `App.css` shrank from 2,067 → ~500 lines as the bento dashboard,
  AppHeader, AppShell, StatusStack, DataTrustMeta, and InfoDrawer styles
  moved next to their owning components.
- `useWeatherData` 459 → 354 lines after the climate comparison
  lifecycle moved into its own hook.
- `useSavedLocationsSync` 360 → 273 lines after pure helpers were
  extracted.
- `loadWeather` and `loadSavedCity` collapsed into a shared helper so
  the two paths cannot drift.
- `SyncAccountPanel` no longer wraps its full body in
  `aria-live="polite"`; only the error (`role="alert"`) and last-synced
  timestamp (`role="status"`) announce.
- Async controls (Use my location, Allow location, Retry, Sync now,
  Disconnect, Create cloud account) now expose `aria-busy` while their
  work is in flight.
- The 1-minute `DataTrustMeta` clock pauses while the tab is hidden so
  background tabs do not churn re-renders.
- InfoDrawer trigger uses a `HelpCircle` icon instead of a literal `?`.
- Hero card hides the unit suffix when a reading is missing — `"—°F"`
  is gone everywhere.

### Fixed

- Literal `°` rendering on the hourly chart Y axis and `—`
  rendering in the AQI/UV empty state — JSX text was treating the
  escape sequences as literal characters.
- Hourly chart "Now" indicator skipping ahead instead of snapping to
  the active hour band.
- `parseCoordinates(null, null)` resolving to `(0, 0)` Null Island.
- `dataTrust.toTimestamp(null)` computing "minutes since the Unix epoch"
  and rendering a misleading "Stale data" warning.
- `convertTemp(null)` silently producing `0°F`.
- `Number(null) === 0` coercion throughout — every nullable API field
  was being silently rendered as `0%` / `0 hPa` / `0°F`. Closed at the
  API boundary (`transforms.js`, `openMeteo.js`) and at every consumer
  (HourlyCard, ForecastCard, NowcastCard, RainCard, ExposureSection,
  HeroCard, NowcastCard, MetricCard, WeatherIcon, DataTrustMeta).
- Precipitation and wind formatters silently rendering `"0.00 in"`,
  `"0 mph"`, `"N"`, `"Calm"` for null API reads — `formatPrecipitation`,
  `formatWindSpeed`, `windDirectionName`, and `classifyWind` now route
  through `toFiniteNumber` and surface `"—"` / `"Variable"` / `"Unknown"`
  instead.
- Domain classifiers leaking the same coercion bug — `classifyStormRisk`
  (CAPE input), `calculatePressureTrend` (null pressure slots were being
  counted as 0 hPa data points), and `getWeather` / `WeatherIcon` (null
  code → "Clear" / Sun icon by accident) now route through
  `toFiniteNumber` so the null path is explicit.
- Lazy chunk failures crashing the whole app via the root error
  boundary — now isolated by `PanelErrorBoundary`.
- `buildClimateComparison` producing fake "65°F warmer than average"
  lines when archive responses had nullish samples.
- City switch leaking the previous city's weather under the new city's
  name — weather state now clears on a different-coordinates request,
  while same-city refreshes still keep the snapshot visible behind the
  `Refreshing` pill.
- Date-dependent test in `fetchHistoricalTemperatureAverage` that
  silently failed on a calendar-day boundary.

### Removed

- Dead `.settings-toggle` CSS rules — no JSX referenced the class for
  several refactors.
- Duplicated `CardFallback` (was inline in two layout files).
- Duplicate inline numeric coercion helpers in HourlyCard, ForecastCard,
  NowcastCard, useRainAnalysis (all now route through the shared
  `toFiniteNumber`).
- `src/utils/missingData.js` — duplicate of `numbers.js` with looser
  coercion semantics. `hasFiniteValue` moved into `numbers.js`,
  `MISSING_VALUE_DASH` consumers redirected to the existing
  `MISSING_VALUE_PLACEHOLDER`, dead `formatMissingValue` export removed.
  Single source of truth for the trust contract.

### Tests

- 45 → **190** Node tests, including 25 React render tests via
  `@testing-library/react` + `jsdom` (HeroCard, InfoDrawer, MetricCard,
  Stat, useTimeNow). New regressions pin null-input contracts for
  every formatter and domain classifier.
- 12 → **14** Playwright checks, including a missing-data placeholder
  guard and a unicode-escape leak guard.
