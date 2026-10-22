import type { MapSeriesOption } from 'echarts/charts';
import type { AriaComponentOption } from 'echarts/components';
import type { ComposeOption } from 'echarts/core';
import { MapRegion, WorldGeoJson } from './world-map.types';

export type WorldMapOption = ComposeOption<MapSeriesOption | AriaComponentOption>;

type MapDataItem = NonNullable<MapSeriesOption['data']>[number];

export interface MapOptionConfig {
  readonly mapName: string;
  readonly geoJson: WorldGeoJson;
  readonly regions: readonly MapRegion[];
  readonly selectedCode: string | null;
  readonly noDataColor: string;
  readonly borderColor: string;
  readonly selectedBorderColor: string;
}

/** Minimal shape of an ECharts mouse event that the map reacts to. */
export interface MapChartEvent {
  readonly componentType?: string;
  readonly seriesType?: string;
  readonly name?: string;
  readonly event?: { readonly offsetX?: number; readonly offsetY?: number };
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function parseHex(hex: string): [number, number, number] | null {
  if (!HEX.test(hex)) {
    return null;
  }
  const body = hex.length === 4 ? [...hex.slice(1)].map((c) => c + c).join('') : hex.slice(1);
  return [0, 2, 4].map((i) => parseInt(body.slice(i, i + 2), 16)) as [number, number, number];
}

/**
 * Hover colour for a fill: dark fills are lightened, light fills darkened, so
 * the highlight is visible on every step of a ramp. Non-hex colours pass through.
 */
export function deriveHoverColor(color: string): string {
  const rgb = parseHex(color);
  if (!rgb) {
    return color;
  }
  const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
  const [target, amount] = luminance < 0.45 ? [255, 0.3] : [0, 0.18];
  return (
    '#' +
    rgb
      .map((c) => Math.round(c + (target - c) * amount))
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  );
}

export function geoCodes(geoJson: WorldGeoJson): Set<string> {
  return new Set(geoJson.features.map((f) => f.properties.iso_a3));
}

export function geoNames(geoJson: WorldGeoJson): Map<string, string> {
  return new Map(geoJson.features.map((f) => [f.properties.iso_a3, f.properties.name]));
}

/**
 * One data item per GeoJSON feature: regions with a colour use it, the rest
 * fall back to `noDataColor`. Regions without geometry are ignored.
 */
export function buildMapData(config: MapOptionConfig): MapDataItem[] {
  const colors = new Map(config.regions.map((r) => [r.code, r]));
  return config.geoJson.features.map(({ properties: { iso_a3: code } }) => {
    const region = colors.get(code);
    const color = region?.color ?? config.noDataColor;
    const selected = code === config.selectedCode;
    return {
      name: code,
      itemStyle: {
        areaColor: color,
        borderColor: selected ? config.selectedBorderColor : config.borderColor,
        borderWidth: selected ? 2 : 0.6,
      },
      emphasis: {
        itemStyle: { areaColor: region?.hoverColor ?? deriveHoverColor(color) },
      },
    };
  });
}

export function buildMapOption(config: MapOptionConfig): WorldMapOption {
  return {
    animationDurationUpdate: 200,
    aria: { enabled: true },
    series: [
      {
        type: 'map',
        map: config.mapName,
        nameProperty: 'iso_a3',
        roam: false,
        selectedMode: false,
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        label: { show: false },
        itemStyle: { areaColor: config.noDataColor, borderColor: config.borderColor },
        emphasis: {
          label: { show: false },
          itemStyle: { borderColor: config.selectedBorderColor, borderWidth: 1.2 },
        },
        data: buildMapData(config),
      },
    ],
  };
}

/** Returns the ISO code of the region under a map event, or `null` for anything else. */
export function resolveRegionCode(
  event: MapChartEvent | null | undefined,
  knownCodes: ReadonlySet<string>,
): string | null {
  if (!event || event.componentType !== 'series' || event.seriesType !== 'map') {
    return null;
  }
  return event.name && knownCodes.has(event.name) ? event.name : null;
}

export interface TooltipPlacement {
  readonly left: number;
  readonly top: number;
  readonly flipX: boolean;
  readonly flipY: boolean;
}

/** Keeps the tooltip inside the container by flipping it to the other side of the pointer. */
export function placeTooltip(
  x: number,
  y: number,
  containerWidth: number,
  containerHeight: number,
  tooltipWidth = 260,
  tooltipHeight = 180,
  offset = 14,
): TooltipPlacement {
  const flipX = x + offset + tooltipWidth > containerWidth && x - offset - tooltipWidth >= 0;
  const flipY = y + offset + tooltipHeight > containerHeight && y - offset - tooltipHeight >= 0;
  return {
    left: flipX ? x - offset : x + offset,
    top: flipY ? y - offset : y + offset,
    flipX,
    flipY,
  };
}
