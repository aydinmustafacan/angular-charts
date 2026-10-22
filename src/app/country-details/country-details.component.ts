import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { countryColor, STATUS_PRESENTATION } from '../core/country-colors';
import {
  formatPercent,
  formatPopulation,
  formatSignedPercent,
  formatUsd,
} from '../core/country-format';
import { CountryMetrics } from '../core/country.models';

export interface DetailRow {
  readonly label: string;
  readonly value: string;
}

/** Side panel with the full metrics of the selected country. */
@Component({
  selector: 'app-country-details',
  templateUrl: './country-details.component.html',
  styleUrl: './country-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'region',
    '[attr.aria-label]': '"Details for " + displayName()',
    '(document:keydown.escape)': 'closed.emit()',
  },
})
export class CountryDetailsComponent {
  /** ISO 3166-1 alpha-3 code of the selected country. */
  readonly code = input.required<string>();
  /** Name to show when no metrics exist (e.g. from the GeoJSON). */
  readonly fallbackName = input<string>('');
  readonly country = input<CountryMetrics | undefined>();

  readonly closed = output<void>();

  protected readonly displayName = computed(
    () => this.country()?.name ?? (this.fallbackName() || this.code()),
  );

  protected readonly status = computed(() => {
    const c = this.country();
    return c ? STATUS_PRESENTATION[c.status] : undefined;
  });

  protected readonly scoreColor = computed(() => {
    const c = this.country();
    return c ? countryColor(c) : undefined;
  });

  protected readonly rows = computed<readonly DetailRow[]>(() => {
    const c = this.country();
    if (!c) {
      return [];
    }
    return [
      { label: 'Region', value: c.region },
      { label: 'Population', value: formatPopulation(c.population) },
      { label: 'GDP per capita', value: formatUsd(c.gdpPerCapitaUsd) },
      { label: 'GDP growth', value: formatSignedPercent(c.gdpGrowthPct) },
      { label: 'Renewable energy share', value: formatPercent(c.renewableSharePct) },
      { label: 'Last updated', value: c.lastUpdated || '—' },
    ];
  });
}
