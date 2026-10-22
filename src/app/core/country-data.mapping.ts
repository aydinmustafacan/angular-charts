import { CountryFeature, WorldGeoJson } from '../world-map/world-map.types';
import { COUNTRY_STATUSES, CountryDataset, CountryMetrics, CountryStatus } from './country.models';

const ISO_ALPHA3 = /^[A-Z]{3}$/;

export function isIsoAlpha3(value: unknown): value is string {
  return typeof value === 'string' && ISO_ALPHA3.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStatus(value: unknown): value is CountryStatus {
  return COUNTRY_STATUSES.includes(value as CountryStatus);
}

/**
 * Validates a GeoJSON payload and keeps only polygon features identified by an
 * ISO alpha-3 code. Each kept feature also gets `id` set to that code.
 */
export function parseWorldGeoJson(raw: unknown): WorldGeoJson {
  if (!isRecord(raw) || raw['type'] !== 'FeatureCollection' || !Array.isArray(raw['features'])) {
    throw new Error('Invalid GeoJSON: expected a FeatureCollection.');
  }

  const features: CountryFeature[] = [];
  for (const feature of raw['features'] as unknown[]) {
    if (!isRecord(feature) || !isRecord(feature['properties']) || !isRecord(feature['geometry'])) {
      continue;
    }
    const properties = feature['properties'];
    const geometry = feature['geometry'];
    const code = properties['iso_a3'];
    if (
      !isIsoAlpha3(code) ||
      (geometry['type'] !== 'Polygon' && geometry['type'] !== 'MultiPolygon')
    ) {
      continue;
    }
    const name = typeof properties['name'] === 'string' ? properties['name'] : code;
    features.push({
      type: 'Feature',
      id: code,
      properties: { iso_a3: code, name },
      geometry: geometry as unknown as CountryFeature['geometry'],
    });
  }

  if (features.length === 0) {
    throw new Error('Invalid GeoJSON: no country features with ISO alpha-3 codes.');
  }
  return { type: 'FeatureCollection', features };
}

/** Converts one raw record into `CountryMetrics`, or `null` if it is invalid. */
export function toCountryMetrics(raw: unknown): CountryMetrics | null {
  if (!isRecord(raw)) {
    return null;
  }
  const code = typeof raw['code'] === 'string' ? raw['code'].trim().toUpperCase() : '';
  const { name, region, score, status, population, gdpPerCapitaUsd, gdpGrowthPct } = raw;
  const { renewableSharePct, lastUpdated, summary, color } = raw;

  if (
    !isIsoAlpha3(code) ||
    typeof name !== 'string' ||
    !isFiniteNumber(score) ||
    !isStatus(status) ||
    !isFiniteNumber(population) ||
    !isFiniteNumber(gdpPerCapitaUsd) ||
    !isFiniteNumber(gdpGrowthPct) ||
    !isFiniteNumber(renewableSharePct)
  ) {
    return null;
  }

  return {
    code,
    name,
    region: typeof region === 'string' ? region : 'Unknown',
    score: Math.min(100, Math.max(0, score)),
    status,
    population,
    gdpPerCapitaUsd,
    gdpGrowthPct,
    renewableSharePct,
    lastUpdated: typeof lastUpdated === 'string' ? lastUpdated : '',
    summary: typeof summary === 'string' ? summary : '',
    ...(typeof color === 'string' && color.length > 0 ? { color } : {}),
  };
}

/** Parses an array of raw metric records, dropping invalid and duplicate entries. */
export function parseCountryMetrics(raw: unknown): CountryMetrics[] {
  if (!Array.isArray(raw)) {
    throw new Error('Invalid country metrics: expected an array.');
  }
  const seen = new Set<string>();
  const result: CountryMetrics[] = [];
  for (const record of raw) {
    const metrics = toCountryMetrics(record);
    if (metrics && !seen.has(metrics.code)) {
      seen.add(metrics.code);
      result.push(metrics);
    }
  }
  return result;
}

export function createCountryDataset(
  geoJson: WorldGeoJson,
  metrics: readonly CountryMetrics[],
): CountryDataset {
  const geoCodes = new Set(geoJson.features.map((f) => f.properties.iso_a3));
  return {
    geoJson,
    countries: new Map(metrics.map((m) => [m.code, m])),
    unmatchedCodes: metrics.filter((m) => !geoCodes.has(m.code)).map((m) => m.code),
  };
}
