# Countries Choropleth Map

An Angular 22 app with an interactive world choropleth map, built on
Apache ECharts (SVG renderer) through `ngx-echarts`. Hover a country to see a
summary tooltip. Click it to open a side panel with full details.

## Requirements

- **Node.js `^22.22.3 || ^24.15.0 || >=26`** (required by Angular CLI 22).
  The project is pinned to Node 24.22.1 through [Volta](https://volta.sh)
  (`"volta"` in `package.json`). If you use nvm or fnm instead, switch to Node 24.
- npm 11

## Installation

```bash
npm install
npm run e2e:install   # one-off: downloads the Playwright Chromium build
```

## Development

```bash
npm start             # dev server on http://localhost:4200
npm run build         # production build in dist/countries-choropleth-map
```

## Testing

```bash
npm test              # unit tests (Vitest via @angular/build:unit-test), single run
npm run test:watch    # unit tests in watch mode
npm run e2e           # Playwright E2E; starts its own dev server on port 4300
```

The E2E suite runs a desktop project and a mobile project (Pixel 7). Tests
that depend on hover are skipped on mobile.

## Storybook

```bash
npm run storybook        # http://localhost:6006
npm run build-storybook  # static build in storybook-static/
```

Storybook 10 runs on the Vite-based `@storybook/angular-vite` framework, in
zoneless mode like the app, and loads `src/styles.scss`. The a11y and docs
addons are enabled. Stories for `WorldMapComponent` live in
`src/app/world-map/world-map.stories.ts` and use the real GeoJSON and mock
metrics:

| Story                  | Shows                                                         |
| ---------------------- | ------------------------------------------------------------- |
| Score Choropleth       | Countries coloured by score                                   |
| Custom Colours         | Independent per-country colours (here grouped by world region) |
| Custom Hover Colours   | Explicit `hoverColor` overriding the derived highlight        |
| With Selection         | `selectedCode` outline                                        |
| No Data                | Every country falling back to `noDataColor`                   |
| Custom Tooltip         | A projected `appMapTooltip` template (`CountryTooltipComponent`) |
| Narrow Container       | The map at phone width                                        |
| Interactive            | Click to select, with the details panel; selection fed back into the map |

All inputs can be changed from Controls. `countrySelected` and `countryHovered`
are logged in the Actions panel.

## Project structure

```
public/
  geo/world-countries.geo.json   Simplified country polygons (geography only)
  data/country-metrics.json      Mock business metrics (no geometry)
src/app/
  world-map/                     Reusable, presentation-only map
    world-map.component.*        WorldMapComponent
    map-tooltip.directive.ts     Typed <ng-template appMapTooltip> slot
    world-map.mapping.ts         Pure option-building and event helpers
    provide-world-map.ts         ECharts module registration + registerMap
    world-map.types.ts           GeoJSON / MapRegion types
    world-map.stories.ts         Storybook stories
    index.ts                     Public API
  country-tooltip/               CountryTooltipComponent (tooltip content)
  country-details/               CountryDetailsComponent (side panel)
  core/
    country-data.service.ts      Loads GeoJSON + metrics
    country-data.mapping.ts      Validation / normalisation of both payloads
    country-colors.ts            Score → colour scale, status presentation
    country.models.ts            Business types
  app.component.*                Composition and signal-based state
src/testing/fixtures.ts          Shared unit-test fixtures (not in the app build)
.storybook/                      Storybook configuration
e2e/                             Playwright tests
```

## Using `WorldMapComponent`

`WorldMapComponent` doesn't know about the app's business model. It takes
GeoJSON and a list of `{ code, color }` regions, and reports interaction by
ISO 3166-1 alpha-3 code.

1. Register ECharts once, in the application config:

   ```ts
   providers: [provideWorldMap()];
   ```

2. Render it inside a container that has a height or aspect ratio:

   ```html
   <div style="aspect-ratio: 2 / 1">
     <app-world-map
       [geoJson]="geoJson"
       [regions]="[{ code: 'BRA', color: '#184f95' }, { code: 'FRA', color: '#86b6ef' }]"
       [selectedCode]="selected()"
       (countrySelected)="selected.set($event)"
     >
       <!-- Optional custom tooltip; the context is typed as MapTooltipContext -->
       <ng-template appMapTooltip let-code let-name="name">
         <strong>{{ name }}</strong> ({{ code }})
       </ng-template>
     </app-world-map>
   </div>
   ```

| Input                 | Type                   | Default        | Notes                                           |
| --------------------- | ---------------------- | -------------- | ----------------------------------------------- |
| `geoJson`             | `WorldGeoJson`         | required       | Features must carry `properties.iso_a3`         |
| `regions`             | `readonly MapRegion[]` | `[]`           | Fill colour per country; optional `hoverColor`  |
| `selectedCode`        | `string \| null`       | `null`         | Outlined as selected                            |
| `mapName`             | `string`               | `'world'`      | Name passed to `echarts.registerMap`            |
| `noDataColor`         | `string`               | `#e4e3df`      | Fill for countries missing from `regions`       |
| `borderColor`         | `string`               | `#fcfcfb`      | Country borders                                 |
| `selectedBorderColor` | `string`               | `#0b0b0b`      | Selected outline and hover border               |
| `ariaLabel`           | `string`               | `'World map'`  |                                                 |

| Output            | Payload          | Notes                                          |
| ----------------- | ---------------- | ---------------------------------------------- |
| `countrySelected` | `string`         | ISO alpha-3 code of the clicked country        |
| `countryHovered`  | `string \| null` | Emits on hover change, `null` when the pointer leaves |

Zoom and pan are disabled (`roam: false`). Hover highlighting uses ECharts'
`emphasis` state. A hover fill is derived from each region's colour unless you
pass `hoverColor`. The tooltip is an Angular template positioned over the
chart, not an HTML string from ECharts, so it is type-checked and avoids
`innerHTML`.

## Data

**Geography** (`public/geo/world-countries.geo.json`, about 90 KB) is the
[Natural Earth](https://www.naturalearthdata.com/) 1:110m Admin 0 countries
dataset (public domain). It was simplified with mapshaper and reduced to two
properties, `iso_a3` and `name`. The country identifier comes from Natural
Earth's `ISO_A3_EH` field. A few non-ISO areas were adjusted:

- Somaliland is merged into Somalia (`SOM`), and Northern Cyprus into Cyprus (`CYP`).
- Kosovo uses `XKX`, the user-assigned code most commonly used for it.
- Antarctica is removed.

To regenerate it:

```bash
npx mapshaper ne_110m_admin_0_countries.geojson \
  -each 'iso_a3 = ISO_A3_EH !== "-99" ? ISO_A3_EH : ({CYN:"CYP",SOL:"SOM",KOS:"XKX"})[ADM0_A3]; name = ({CYN:"Cyprus",SOL:"Somalia"})[ADM0_A3] || NAME' \
  -filter 'iso_a3 !== "ATA"' \
  -dissolve iso_a3 copy-fields=name \
  -simplify 40% keep-shapes \
  -o public/geo/world-countries.geo.json format=geojson precision=0.01 id-field=iso_a3
```

**Metrics** (`public/data/country-metrics.json`) are **illustrative mock values**
for 37 countries, not real statistics. They are joined to the geography only by
ISO code. Singapore is included on purpose: it has no polygon at 1:110m, which
exercises the "metrics without geometry" footnote. Countries that have geometry
but no metrics render grey and show a "no data" tooltip and panel. A record
can set an optional `color` to override its score-derived colour.

`CountryDataService` validates both payloads. It drops features without a
valid alpha-3 code, drops malformed or duplicate metric records, and clamps
scores to 0–100. The URLs can be overridden with the `COUNTRY_DATA_URLS`
injection token.

## Notes

- The colour scale is a single-hue ordinal blue ramp (light means low score).
  Status colours always appear with an icon and a label.
- The page includes a country `<select>`, so a country can be chosen with the
  keyboard or a screen reader without using the map.
- ECharts accounts for most of the initial bundle (about 190 kB transferred),
  so the production budget in `angular.json` is set to 800 kB warning / 1.2 MB error.
