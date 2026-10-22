import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { EChartsInitOpts } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MapTooltipDirective } from './map-tooltip.directive';
import { ensureMapRegistered } from './provide-world-map';
import {
  buildMapOption,
  geoCodes,
  geoNames,
  MapChartEvent,
  placeTooltip,
  resolveRegionCode,
  WorldMapOption,
} from './world-map.mapping';
import { MapPointer, MapRegion, MapTooltipContext, WorldGeoJson } from './world-map.types';

/**
 * Presentation-only world choropleth. Renders a fixed (non-roamable) map from
 * GeoJSON, colours regions by ISO alpha-3 code, and reports clicks.
 *
 * The host fills its parent, so give the parent an explicit height or aspect ratio.
 * Project an `<ng-template appMapTooltip let-code let-name="name">` to customise the tooltip.
 */
@Component({
  selector: 'app-world-map',
  imports: [NgxEchartsDirective, NgTemplateOutlet],
  templateUrl: './world-map.component.html',
  styleUrl: './world-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorldMapComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** GeoJSON whose features carry `properties.iso_a3`. */
  readonly geoJson = input.required<WorldGeoJson>();
  /** Per-country fill colours. Countries not listed use `noDataColor`. */
  readonly regions = input<readonly MapRegion[]>([]);
  /** ISO alpha-3 code of the country to outline as selected. */
  readonly selectedCode = input<string | null>(null);
  /** Name under which the GeoJSON is registered with ECharts. */
  readonly mapName = input('world');
  readonly noDataColor = input('#e4e3df');
  readonly borderColor = input('#fcfcfb');
  readonly selectedBorderColor = input('#0b0b0b');
  readonly ariaLabel = input('World map');

  /** Emits the ISO 3166-1 alpha-3 code of the clicked country. */
  readonly countrySelected = output<string>();
  /** Emits the ISO code of the hovered country, or `null` when the pointer leaves it. */
  readonly countryHovered = output<string | null>();

  protected readonly tooltip = contentChild(MapTooltipDirective);

  protected readonly initOpts: EChartsInitOpts = { renderer: 'svg' };

  private readonly knownCodes = computed(() => geoCodes(this.geoJson()));
  private readonly names = computed(() => geoNames(this.geoJson()));

  protected readonly options = computed<WorldMapOption>(() => {
    const geoJson = this.geoJson();
    const mapName = this.mapName();
    // Registration must precede any option that references the map by name.
    ensureMapRegistered(mapName, geoJson);
    return buildMapOption({
      mapName,
      geoJson,
      regions: this.regions(),
      selectedCode: this.selectedCode(),
      noDataColor: this.noDataColor(),
      borderColor: this.borderColor(),
      selectedBorderColor: this.selectedBorderColor(),
    });
  });

  protected readonly pointer = signal<MapPointer | null>(null);

  protected readonly tooltipContext = computed<MapTooltipContext | null>(() => {
    const p = this.pointer();
    return p ? { $implicit: p.code, code: p.code, name: p.name } : null;
  });

  protected readonly tooltipPlacement = computed(() => {
    const p = this.pointer();
    if (!p) {
      return null;
    }
    const el = this.host.nativeElement;
    return placeTooltip(p.x, p.y, el.clientWidth, el.clientHeight);
  });

  protected onClick(event: MapChartEvent): void {
    const code = resolveRegionCode(event, this.knownCodes());
    if (code) {
      // The consumer usually changes layout on selection, which would leave the tooltip stale.
      this.clearPointer();
      this.countrySelected.emit(code);
    }
  }

  protected onPointerMove(event: MapChartEvent): void {
    const code = resolveRegionCode(event, this.knownCodes());
    if (!code) {
      this.clearPointer();
      return;
    }
    const previous = this.pointer();
    this.pointer.set({
      code,
      name: this.names().get(code) ?? code,
      x: event.event?.offsetX ?? previous?.x ?? 0,
      y: event.event?.offsetY ?? previous?.y ?? 0,
    });
    if (previous?.code !== code) {
      this.countryHovered.emit(code);
    }
  }

  protected clearPointer(): void {
    if (this.pointer()) {
      this.pointer.set(null);
      this.countryHovered.emit(null);
    }
  }
}
