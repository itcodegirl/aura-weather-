# Screenshots

This folder is populated by two Playwright specs:

- `e2e/readme-screenshots.spec.js` — real-data dashboard shots
  (`dashboard-desktop.png`, `dashboard-mobile.png`) and the
  alert-overflow shot (`alert-overflow.png`)
- `e2e/trust-contract-screenshot.spec.js` — the `?mock=missing` shots
  (`trust-contract-desktop.png`, `trust-contract-mobile.png`)

The CI workflow uploads the contents as an artifact named
`trust-contract-screenshots`.

## Regenerate locally

```bash
npm run screenshots
```

That single command runs both specs and produces all five PNGs.

## Files produced

| File | Viewport | What it shows |
| --- | --- | --- |
| `dashboard-desktop.png` | 1366×900 | Full dashboard with real-data mocks, frozen at 2026-04-21T12:00 CDT |
| `dashboard-mobile.png` | 390×844 | Mobile stacked layout with the same frozen forecast |
| `alert-overflow.png` | 1366×900 (cropped to AlertsCard) | 6 active NWS alerts so the `+N more` overflow chip is visible |
| `trust-contract-desktop.png` | 1280×900 | `?mock=missing` desktop — hero shows `—` + "Some readings are unavailable" helper |
| `trust-contract-mobile.png` | 390×844 | `?mock=missing` mobile |

## Notes

- Time is frozen to `2026-04-21T12:00:00-05:00` (matches the visual
  regression baseline) so the images stay byte-stable across runs.
- Animations and transitions are disabled and the font is pinned to
  Arial so images stay stable across machines.
- The PNGs are not currently committed to git (the `.gitkeep` keeps
  the folder tracked). Run `npm run screenshots` after a checkout to
  produce them. See the project root `README.md` for the rendered
  trust-contract narrative.
