import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { CountryDetailsComponent } from './country-details/country-details.component';
import { CountryTooltipComponent } from './country-tooltip/country-tooltip.component';
import { NO_DATA_COLOR, SCORE_BUCKETS, toMapRegions } from './core/country-colors';
import { CountryDataService } from './core/country-data.service';
import { CountryMetrics } from './core/country.models';
import { MapTooltipDirective, WorldMapComponent } from './world-map';

interface CountryOption {
  readonly code: string;
  readonly name: string;
}

@Component({
  selector: 'app-root',
  imports: [
    WorldMapComponent,
    MapTooltipDirective,
    CountryTooltipComponent,
    CountryDetailsComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  private readonly dataService = inject(CountryDataService);

  protected readonly dataset = rxResource({ stream: () => this.dataService.loadDataset() });

  protected readonly selectedCode = signal<string | null>(null);

  protected readonly legend = SCORE_BUCKETS;
  protected readonly noDataColor = NO_DATA_COLOR;

  private readonly loaded = computed(() => (this.dataset.hasValue() ? this.dataset.value() : null));

  protected readonly countries = computed<ReadonlyMap<string, CountryMetrics>>(
    () => this.loaded()?.countries ?? new Map(),
  );

  protected readonly regions = computed(() => toMapRegions(this.countries().values()));

  protected readonly geoNames = computed(
    () =>
      new Map(this.loaded()?.geoJson.features.map((f) => [f.properties.iso_a3, f.properties.name])),
  );

  /** All mapped countries, alphabetical, for the keyboard-accessible picker. */
  protected readonly countryOptions = computed<readonly CountryOption[]>(() =>
    Array.from(this.geoNames(), ([code, geoName]) => ({
      code,
      name: this.countries().get(code)?.name ?? geoName,
    })).sort((a, b) => a.name.localeCompare(b.name)),
  );

  protected readonly selectedCountry = computed(() => {
    const code = this.selectedCode();
    return code ? this.countries().get(code) : undefined;
  });

  protected readonly selectedName = computed(() => {
    const code = this.selectedCode();
    return code ? (this.geoNames().get(code) ?? code) : '';
  });

  protected readonly unmatchedCodes = computed(() => this.loaded()?.unmatchedCodes ?? []);

  protected onCountrySelected(code: string): void {
    this.selectedCode.set(code);
  }

  protected onPickerChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedCode.set(value || null);
  }

  protected closeDetails(): void {
    this.selectedCode.set(null);
  }
}
