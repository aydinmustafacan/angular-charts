import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { MapChart } from 'echarts/charts';
import { AriaComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import { provideEchartsCore } from 'ngx-echarts';

// Register only what the map needs, so the rest of ECharts is tree-shaken.
echarts.use([MapChart, AriaComponent, SVGRenderer]);

/** Provides the ECharts core used by `WorldMapComponent`. Add once to the application config. */
export function provideWorldMap(): EnvironmentProviders {
  return makeEnvironmentProviders([provideEchartsCore({ echarts })]);
}

/** Registers a GeoJSON map with ECharts once per (name, GeoJSON) pair. */
const registered = new Map<string, object>();

export function ensureMapRegistered(name: string, geoJson: object): void {
  if (registered.get(name) === geoJson) {
    return;
  }
  echarts.registerMap(name, geoJson as Parameters<typeof echarts.registerMap>[1]);
  registered.set(name, geoJson);
}
