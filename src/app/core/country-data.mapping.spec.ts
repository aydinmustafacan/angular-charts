import { TEST_GEOJSON } from '../../testing/fixtures';
import {
  createCountryDataset,
  isIsoAlpha3,
  parseCountryMetrics,
  parseWorldGeoJson,
  toCountryMetrics,
} from './country-data.mapping';

const validRecord = {
  code: 'bra',
  name: 'Brazil',
  region: 'South America',
  score: 61,
  status: 'watch',
  population: 216_400_000,
  gdpPerCapitaUsd: 10_300,
  gdpGrowthPct: 2.9,
  renewableSharePct: 89.2,
  lastUpdated: '2026-09-30',
  summary: 'Clean grid.',
};

describe('isIsoAlpha3', () => {
  it('accepts three uppercase letters only', () => {
    expect(isIsoAlpha3('BRA')).toBe(true);
    expect(isIsoAlpha3('bra')).toBe(false);
    expect(isIsoAlpha3('BR')).toBe(false);
    expect(isIsoAlpha3('-99')).toBe(false);
    expect(isIsoAlpha3(42)).toBe(false);
  });
});

describe('parseWorldGeoJson', () => {
  it('keeps polygon features with ISO codes and sets the feature id', () => {
    const raw = {
      type: 'FeatureCollection',
      features: [
        ...TEST_GEOJSON.features.map((f) => ({ ...f, id: undefined })),
        {
          type: 'Feature',
          properties: { iso_a3: '-99', name: 'Unknown' },
          geometry: { type: 'Polygon', coordinates: [] },
        },
        {
          type: 'Feature',
          properties: { iso_a3: 'PNT', name: 'Point' },
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
        { type: 'Feature', properties: null, geometry: null },
      ],
    };

    const result = parseWorldGeoJson(raw);

    expect(result.features.map((f) => f.properties.iso_a3)).toEqual(['BRA', 'FRA', 'XKX']);
    expect(result.features.map((f) => f.id)).toEqual(['BRA', 'FRA', 'XKX']);
  });

  it('falls back to the code when a feature has no name', () => {
    const result = parseWorldGeoJson({
      type: 'FeatureCollection',
      features: [{ ...TEST_GEOJSON.features[0], properties: { iso_a3: 'BRA' } }],
    });
    expect(result.features[0].properties.name).toBe('BRA');
  });

  it('rejects payloads that are not a FeatureCollection', () => {
    expect(() => parseWorldGeoJson({ type: 'Feature' })).toThrowError(/FeatureCollection/);
    expect(() => parseWorldGeoJson(null)).toThrowError(/FeatureCollection/);
  });

  it('rejects collections without any usable country', () => {
    expect(() => parseWorldGeoJson({ type: 'FeatureCollection', features: [] })).toThrowError(
      /no country features/,
    );
  });
});

describe('toCountryMetrics', () => {
  it('normalises the ISO code to upper case', () => {
    expect(toCountryMetrics(validRecord)?.code).toBe('BRA');
  });

  it('clamps the score to 0–100', () => {
    expect(toCountryMetrics({ ...validRecord, score: 140 })?.score).toBe(100);
    expect(toCountryMetrics({ ...validRecord, score: -5 })?.score).toBe(0);
  });

  it('keeps a colour override only when it is a non-empty string', () => {
    expect(toCountryMetrics({ ...validRecord, color: '#ff0000' })?.color).toBe('#ff0000');
    expect(toCountryMetrics({ ...validRecord, color: '' })).not.toHaveProperty('color');
  });

  it.each([
    ['an invalid code', { code: 'BRAZIL' }],
    ['an unknown status', { status: 'great' }],
    ['a non-numeric score', { score: '61' }],
    ['a missing population', { population: undefined }],
    ['a NaN metric', { gdpGrowthPct: Number.NaN }],
  ])('returns null for %s', (_label, patch) => {
    expect(toCountryMetrics({ ...validRecord, ...patch })).toBeNull();
  });
});

describe('parseCountryMetrics', () => {
  it('drops invalid and duplicate records', () => {
    const result = parseCountryMetrics([
      validRecord,
      { ...validRecord, name: 'Duplicate' },
      { ...validRecord, code: 'FRA', name: 'France' },
      { nonsense: true },
    ]);
    expect(result.map((m) => [m.code, m.name])).toEqual([
      ['BRA', 'Brazil'],
      ['FRA', 'France'],
    ]);
  });

  it('rejects a payload that is not an array', () => {
    expect(() => parseCountryMetrics({})).toThrowError(/expected an array/);
  });
});

describe('createCountryDataset', () => {
  it('indexes metrics by code and reports codes without geometry', () => {
    const metrics = parseCountryMetrics([
      validRecord,
      { ...validRecord, code: 'SGP', name: 'Singapore' },
    ]);

    const dataset = createCountryDataset(TEST_GEOJSON, metrics);

    expect(dataset.countries.get('BRA')?.name).toBe('Brazil');
    expect(dataset.countries.get('SGP')?.name).toBe('Singapore');
    expect(dataset.unmatchedCodes).toEqual(['SGP']);
    expect(dataset.geoJson).toBe(TEST_GEOJSON);
  });
});
