import { Directive, input, output } from '@angular/core';
import type { EChartsCoreOption, EChartsInitOpts } from 'echarts/core';
import { CountryMetrics } from '../app/core/country.models';
import { MapChartEvent } from '../app/world-map/world-map.mapping';
import { CountryFeature, WorldGeoJson } from '../app/world-map/world-map.types';

function square(code: string, name: string, x: number, y: number): CountryFeature {
  return {
    type: 'Feature',
    id: code,
    properties: { iso_a3: code, name },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [x, y],
          [x + 10, y],
          [x + 10, y + 10],
          [x, y + 10],
          [x, y],
        ],
      ],
    },
  };
}

export const TEST_GEOJSON: WorldGeoJson = {
  type: 'FeatureCollection',
  features: [
    square('BRA', 'Brazil', -50, -15),
    square('FRA', 'France', 0, 45),
    square('XKX', 'Kosovo', 20, 42),
  ],
};

export function metrics(
  overrides: Partial<CountryMetrics> & Pick<CountryMetrics, 'code'>,
): CountryMetrics {
  return {
    name: overrides.code,
    region: 'Test',
    score: 50,
    status: 'stable',
    population: 1_000_000,
    gdpPerCapitaUsd: 10_000,
    gdpGrowthPct: 1.5,
    renewableSharePct: 30,
    lastUpdated: '2026-09-30',
    summary: '',
    ...overrides,
  };
}

export const TEST_METRICS: readonly CountryMetrics[] = [
  metrics({ code: 'BRA', name: 'Brazil', score: 61, status: 'watch', summary: 'Clean grid.' }),
  metrics({ code: 'FRA', name: 'France', score: 77, status: 'stable' }),
];

export function mapEvent(name: string, offsetX = 100, offsetY = 50): MapChartEvent {
  return { componentType: 'series', seriesType: 'map', name, event: { offsetX, offsetY } };
}

/** Stand-in for `NgxEchartsDirective` so component tests do not need a real chart. */
@Directive({ selector: '[echarts]' })
export class FakeEchartsDirective {
  readonly options = input<EChartsCoreOption>();
  readonly initOpts = input<EChartsInitOpts>();
  readonly chartClick = output<MapChartEvent>();
  readonly chartMouseOver = output<MapChartEvent>();
  readonly chartMouseMove = output<MapChartEvent>();
  readonly chartMouseOut = output<MapChartEvent>();
  readonly chartGlobalOut = output<MapChartEvent>();
}
