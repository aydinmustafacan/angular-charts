import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgxEchartsDirective } from 'ngx-echarts';
import { FakeEchartsDirective, mapEvent, TEST_GEOJSON } from '../../testing/fixtures';
import { MapTooltipDirective } from './map-tooltip.directive';
import { WorldMapComponent } from './world-map.component';
import { MapRegion } from './world-map.types';

@Component({
  imports: [WorldMapComponent, MapTooltipDirective],
  template: `
    <app-world-map
      mapName="spec-world"
      [geoJson]="geoJson"
      [regions]="regions()"
      [selectedCode]="selected()"
      (countrySelected)="selections.push($event)"
      (countryHovered)="hovers.push($event)"
    >
      @if (customTooltip()) {
        <ng-template appMapTooltip let-code let-name="name">
          <span class="custom">{{ code }}:{{ name }}</span>
        </ng-template>
      }
    </app-world-map>
  `,
})
class HostComponent {
  readonly geoJson = TEST_GEOJSON;
  readonly regions = signal<readonly MapRegion[]>([{ code: 'BRA', color: '#184f95' }]);
  readonly selected = signal<string | null>(null);
  readonly customTooltip = signal(true);
  readonly selections: string[] = [];
  readonly hovers: (string | null)[] = [];
}

describe('WorldMapComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let chart: FakeEchartsDirective;

  const tooltip = () =>
    fixture.nativeElement.querySelector('[data-testid="map-tooltip"]') as HTMLElement | null;

  beforeEach(async () => {
    TestBed.overrideComponent(WorldMapComponent, {
      remove: { imports: [NgxEchartsDirective] },
      add: { imports: [FakeEchartsDirective] },
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    await fixture.whenStable();
    chart = fixture.debugElement
      .query(By.directive(FakeEchartsDirective))
      .injector.get(FakeEchartsDirective);
  });

  it('renders with the SVG renderer and a non-roamable map', () => {
    expect(chart.initOpts()).toEqual({ renderer: 'svg' });
    const series = (chart.options()?.['series'] as Record<string, unknown>[])[0];
    expect(series).toMatchObject({ map: 'spec-world', roam: false });
  });

  it('rebuilds options when regions or the selection change', async () => {
    host.regions.set([{ code: 'FRA', color: '#00ff00' }]);
    host.selected.set('FRA');
    await fixture.whenStable();

    const data = (
      chart.options()?.['series'] as {
        data: { name: string; itemStyle: Record<string, unknown> }[];
      }[]
    )[0].data;
    expect(data.find((d) => d.name === 'FRA')?.itemStyle).toMatchObject({
      areaColor: '#00ff00',
      borderWidth: 2,
    });
  });

  it('emits countrySelected with the ISO code when a country is clicked', () => {
    chart.chartClick.emit(mapEvent('BRA'));
    expect(host.selections).toEqual(['BRA']);
  });

  it('ignores clicks outside known countries', () => {
    chart.chartClick.emit(mapEvent('SGP'));
    chart.chartClick.emit({ componentType: 'title' });
    expect(host.selections).toEqual([]);
  });

  it('shows the projected tooltip on hover and hides it on mouse out', async () => {
    chart.chartMouseOver.emit(mapEvent('BRA', 40, 30));
    await fixture.whenStable();

    expect(tooltip()?.textContent?.trim()).toBe('BRA:Brazil');
    expect(tooltip()?.style.left).toBe('54px');
    expect(host.hovers).toEqual(['BRA']);

    chart.chartMouseOut.emit(mapEvent('BRA'));
    await fixture.whenStable();

    expect(tooltip()).toBeNull();
    expect(host.hovers).toEqual(['BRA', null]);
  });

  it('only emits countryHovered when the hovered country changes', () => {
    chart.chartMouseOver.emit(mapEvent('BRA', 10, 10));
    chart.chartMouseMove.emit(mapEvent('BRA', 12, 12));
    chart.chartMouseMove.emit(mapEvent('FRA', 50, 50));
    chart.chartGlobalOut.emit({});
    expect(host.hovers).toEqual(['BRA', 'FRA', null]);
  });

  it('falls back to the GeoJSON name when no tooltip template is projected', async () => {
    host.customTooltip.set(false);
    await fixture.whenStable();

    chart.chartMouseOver.emit(mapEvent('XKX'));
    await fixture.whenStable();

    expect(tooltip()?.textContent?.trim()).toBe('Kosovo');
  });

  it('hides the tooltip when a country is selected', async () => {
    chart.chartMouseOver.emit(mapEvent('BRA'));
    await fixture.whenStable();
    chart.chartClick.emit(mapEvent('BRA'));
    await fixture.whenStable();

    expect(tooltip()).toBeNull();
  });
});
