import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { STATUS_PRESENTATION } from '../core/country-colors';
import { formatPopulation, formatSignedPercent, formatUsd } from '../core/country-format';
import { CountryMetrics } from '../core/country.models';

@Component({
  selector: 'app-country-tooltip',
  template: `
    <p class="name">{{ country()?.name ?? name() }}</p>
    @if (country(); as c) {
      <dl>
        <dt>Score</dt>
        <dd class="score">{{ c.score }}<span class="muted">/100</span></dd>
        <dt>Status</dt>
        <dd>
          <span class="status-dot" [style.background]="status()?.color" aria-hidden="true">{{
            status()?.icon
          }}</span>
          {{ status()?.label }}
        </dd>
        <dt>Population</dt>
        <dd>{{ population() }}</dd>
        <dt>GDP / capita</dt>
        <dd>{{ gdp() }}</dd>
        <dt>GDP growth</dt>
        <dd>{{ growth() }}</dd>
      </dl>
      <p class="hint">Click for details</p>
    } @else {
      <p class="muted">No data available</p>
    }
  `,
  styleUrl: './country-tooltip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountryTooltipComponent {
  /** Fallback name (from the GeoJSON) used when no metrics exist. */
  readonly name = input.required<string>();
  readonly country = input<CountryMetrics | undefined>();

  protected readonly status = computed(() => {
    const c = this.country();
    return c ? STATUS_PRESENTATION[c.status] : undefined;
  });
  protected readonly population = computed(() => formatPopulation(this.country()?.population ?? 0));
  protected readonly gdp = computed(() => formatUsd(this.country()?.gdpPerCapitaUsd ?? 0));
  protected readonly growth = computed(() =>
    formatSignedPercent(this.country()?.gdpGrowthPct ?? 0),
  );
}
