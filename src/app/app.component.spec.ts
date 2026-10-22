import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgxEchartsDirective } from 'ngx-echarts';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { FakeEchartsDirective, mapEvent, TEST_GEOJSON, TEST_METRICS } from '../testing/fixtures';
import { AppComponent } from './app.component';
import { createCountryDataset } from './core/country-data.mapping';
import { CountryDataService } from './core/country-data.service';
import { CountryDataset } from './core/country.models';
import { WorldMapComponent } from './world-map';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let el: HTMLElement;

  async function setup(dataset$: Observable<CountryDataset>): Promise<void> {
    TestBed.configureTestingModule({
      providers: [{ provide: CountryDataService, useValue: { loadDataset: () => dataset$ } }],
    });
    TestBed.overrideComponent(WorldMapComponent, {
      remove: { imports: [NgxEchartsDirective] },
      add: { imports: [FakeEchartsDirective] },
    });
    fixture = TestBed.createComponent(AppComponent);
    el = fixture.nativeElement;
    // A pending resource keeps the app unstable, so only render while loading.
    if (dataset$ === NEVER) {
      fixture.detectChanges();
    } else {
      await fixture.whenStable();
    }
  }

  const chart = () =>
    fixture.debugElement
      .query(By.directive(FakeEchartsDirective))
      .injector.get(FakeEchartsDirective);
  const byTestId = (id: string) => el.querySelector(`[data-testid="${id}"]`);

  it('shows a loading state while data is loading', async () => {
    await setup(NEVER);
    expect(byTestId('loading-state')).not.toBeNull();
    expect(el.querySelector('app-world-map')).toBeNull();
  });

  it('shows an error state with a retry button when loading fails', async () => {
    await setup(throwError(() => new Error('offline')));
    expect(byTestId('error-state')?.textContent).toContain('could not be loaded');
    expect(byTestId('error-state')?.querySelector('button')?.textContent).toContain('Retry');
  });

  describe('with data', () => {
    beforeEach(() => setup(of(createCountryDataset(TEST_GEOJSON, TEST_METRICS))));

    it('passes a colour for every country with metrics to the map', () => {
      const map = fixture.debugElement.query(By.directive(WorldMapComponent))
        .componentInstance as WorldMapComponent;
      expect(map.regions().map((r) => r.code)).toEqual(['BRA', 'FRA']);
    });

    it('opens the details panel for the clicked country', async () => {
      expect(byTestId('country-details')).toBeNull();

      chart().chartClick.emit(mapEvent('BRA'));
      await fixture.whenStable();

      expect(byTestId('details-title')?.textContent).toBe('Brazil');
      expect(byTestId('details-score')?.textContent).toBe('61');
      expect(byTestId('details-status')?.textContent).toContain('Watch');
    });

    it('shows a missing-data message for a country without metrics', async () => {
      chart().chartClick.emit(mapEvent('XKX'));
      await fixture.whenStable();

      expect(byTestId('details-title')?.textContent).toBe('Kosovo');
      expect(byTestId('details-empty')?.textContent).toContain('No metrics are available');
    });

    it('closes the details panel', async () => {
      chart().chartClick.emit(mapEvent('FRA'));
      await fixture.whenStable();

      (el.querySelector('app-country-details button.close') as HTMLButtonElement).click();
      await fixture.whenStable();

      expect(byTestId('country-details')).toBeNull();
    });

    it('selects a country from the picker', async () => {
      const picker = byTestId('country-picker') as HTMLSelectElement;
      picker.value = 'FRA';
      picker.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(byTestId('details-title')?.textContent).toBe('France');
    });
  });

  it('shows a notice when no metrics are available', async () => {
    await setup(of(createCountryDataset(TEST_GEOJSON, [])));
    expect(byTestId('missing-data-notice')).not.toBeNull();
  });
});
