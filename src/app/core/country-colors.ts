import { MapRegion } from '../world-map/world-map.types';
import { CountryMetrics, CountryStatus } from './country.models';

export interface ScoreBucket {
  readonly min: number;
  readonly max: number;
  readonly color: string;
  readonly label: string;
}

/** Single-hue ordinal ramp (light → dark) for the composite score. */
export const SCORE_BUCKETS: readonly ScoreBucket[] = [
  { min: 0, max: 20, color: '#86b6ef', label: '0–19' },
  { min: 20, max: 40, color: '#3987e5', label: '20–39' },
  { min: 40, max: 60, color: '#256abf', label: '40–59' },
  { min: 60, max: 80, color: '#184f95', label: '60–79' },
  { min: 80, max: 101, color: '#0d366b', label: '80–100' },
];

export const NO_DATA_COLOR = '#e4e3df';

export function scoreToColor(score: number): string {
  const bucket = SCORE_BUCKETS.find((b) => score >= b.min && score < b.max);
  return (bucket ?? (score < 0 ? SCORE_BUCKETS[0] : SCORE_BUCKETS[SCORE_BUCKETS.length - 1])).color;
}

export function countryColor(country: CountryMetrics): string {
  return country.color ?? scoreToColor(country.score);
}

export function toMapRegions(countries: Iterable<CountryMetrics>): MapRegion[] {
  return Array.from(countries, (c) => ({ code: c.code, color: countryColor(c) }));
}

export interface StatusPresentation {
  readonly label: string;
  readonly icon: string;
  readonly color: string;
}

/** Status colours always ship with an icon and label, never colour alone. */
export const STATUS_PRESENTATION: Readonly<Record<CountryStatus, StatusPresentation>> = {
  stable: { label: 'Stable', icon: '✓', color: '#0ca30c' },
  watch: { label: 'Watch', icon: '!', color: '#fab219' },
  'at-risk': { label: 'At risk', icon: '▲', color: '#ec835a' },
  critical: { label: 'Critical', icon: '✕', color: '#d03b3b' },
};
