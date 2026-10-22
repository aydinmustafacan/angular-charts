import { WorldGeoJson } from '../world-map/world-map.types';

/** Business status of a country. Kept separate from any geographic data. */
export type CountryStatus = 'stable' | 'watch' | 'at-risk' | 'critical';

export const COUNTRY_STATUSES: readonly CountryStatus[] = [
  'stable',
  'watch',
  'at-risk',
  'critical',
];

/** Business metrics for a single country, keyed by ISO 3166-1 alpha-3 code. */
export interface CountryMetrics {
  readonly code: string;
  readonly name: string;
  readonly region: string;
  /** Composite score in the range 0–100. */
  readonly score: number;
  readonly status: CountryStatus;
  readonly population: number;
  readonly gdpPerCapitaUsd: number;
  readonly gdpGrowthPct: number;
  readonly renewableSharePct: number;
  /** ISO 8601 date (YYYY-MM-DD). */
  readonly lastUpdated: string;
  readonly summary: string;
  /** Optional explicit map colour, overriding the score-derived colour. */
  readonly color?: string;
}

/** Geography and metrics, loaded together but stored independently. */
export interface CountryDataset {
  readonly geoJson: WorldGeoJson;
  readonly countries: ReadonlyMap<string, CountryMetrics>;
  /** Metric codes that have no matching geometry in the GeoJSON. */
  readonly unmatchedCodes: readonly string[];
}
