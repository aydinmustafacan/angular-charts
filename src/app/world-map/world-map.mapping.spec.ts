import { mapEvent, TEST_GEOJSON } from '../../testing/fixtures';
import {
  buildMapData,
  buildMapOption,
  deriveHoverColor,
  geoCodes,
  MapOptionConfig,
  placeTooltip,
  resolveRegionCode,
} from './world-map.mapping';

const config: MapOptionConfig = {
  mapName: 'test-world',
  geoJson: TEST_GEOJSON,
  regions: [
    { code: 'BRA', color: '#184f95' },
    { code: 'FRA', color: '#86b6ef', hoverColor: '#ff00ff' },
    { code: 'SGP', color: '#000000' },
  ],
  selectedCode: null,
  noDataColor: '#e4e3df',
  borderColor: '#ffffff',
  selectedBorderColor: '#000000',
};

describe('buildMapData', () => {
  it('creates one item per GeoJSON feature, named by ISO code', () => {
    expect(buildMapData(config).map((d) => (d as { name: string }).name)).toEqual([
      'BRA',
      'FRA',
      'XKX',
    ]);
  });

  it('applies each region colour independently and falls back for missing data', () => {
    const [bra, fra, xkx] = buildMapData(config) as { itemStyle: { areaColor: string } }[];
    expect(bra.itemStyle.areaColor).toBe('#184f95');
    expect(fra.itemStyle.areaColor).toBe('#86b6ef');
    expect(xkx.itemStyle.areaColor).toBe('#e4e3df');
  });

  it('uses the explicit hover colour or derives one', () => {
    const [bra, fra] = buildMapData(config) as { emphasis: { itemStyle: { areaColor: string } } }[];
    expect(bra.emphasis.itemStyle.areaColor).toBe(deriveHoverColor('#184f95'));
    expect(fra.emphasis.itemStyle.areaColor).toBe('#ff00ff');
  });

  it('outlines only the selected country', () => {
    const data = buildMapData({ ...config, selectedCode: 'FRA' }) as {
      itemStyle: { borderColor: string; borderWidth: number };
    }[];
    expect(data[1].itemStyle).toMatchObject({ borderColor: '#000000', borderWidth: 2 });
    expect(data[0].itemStyle).toMatchObject({ borderColor: '#ffffff', borderWidth: 0.6 });
  });
});

describe('buildMapOption', () => {
  it('configures a fixed, non-roamable map matched on iso_a3', () => {
    const series = (buildMapOption(config).series as Record<string, unknown>[])[0];
    expect(series).toMatchObject({
      type: 'map',
      map: 'test-world',
      nameProperty: 'iso_a3',
      roam: false,
      selectedMode: false,
    });
  });
});

describe('deriveHoverColor', () => {
  it('lightens dark colours and darkens light ones', () => {
    expect(deriveHoverColor('#000000')).toBe('#4d4d4d');
    expect(deriveHoverColor('#ffffff')).toBe('#d1d1d1');
  });

  it('expands shorthand hex and passes other formats through', () => {
    expect(deriveHoverColor('#000')).toBe('#4d4d4d');
    expect(deriveHoverColor('rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)');
  });
});

describe('resolveRegionCode', () => {
  const known = geoCodes(TEST_GEOJSON);

  it('returns the ISO code for a map series event', () => {
    expect(resolveRegionCode(mapEvent('BRA'), known)).toBe('BRA');
  });

  it('ignores events from other components, unknown regions and empty events', () => {
    expect(resolveRegionCode({ ...mapEvent('BRA'), componentType: 'geo' }, known)).toBeNull();
    expect(resolveRegionCode({ ...mapEvent('BRA'), seriesType: 'scatter' }, known)).toBeNull();
    expect(resolveRegionCode(mapEvent('SGP'), known)).toBeNull();
    expect(resolveRegionCode(mapEvent(''), known)).toBeNull();
    expect(resolveRegionCode(null, known)).toBeNull();
  });
});

describe('placeTooltip', () => {
  it('places the tooltip below-right of the pointer when it fits', () => {
    expect(placeTooltip(100, 100, 1000, 600)).toEqual({
      left: 114,
      top: 114,
      flipX: false,
      flipY: false,
    });
  });

  it('flips to the left and above near the bottom-right edge', () => {
    expect(placeTooltip(900, 550, 1000, 600)).toEqual({
      left: 886,
      top: 536,
      flipX: true,
      flipY: true,
    });
  });

  it('does not flip when the other side has no room either', () => {
    expect(placeTooltip(100, 100, 200, 150)).toMatchObject({ flipX: false, flipY: false });
  });
});
