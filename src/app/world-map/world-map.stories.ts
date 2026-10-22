import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  applicationConfig,
  componentWrapperDecorator,
  moduleMetadata,
  type Decorator,
  type Meta,
  type StoryObj,
} from '@storybook/angular-vite';
import { fn } from 'storybook/test';
import metricsJson from '../../../public/data/country-metrics.json';
import geoJsonFile from '../../../public/geo/world-countries.geo.json';
import { CountryDetailsComponent } from '../country-details/country-details.component';
import { CountryTooltipComponent } from '../country-tooltip/country-tooltip.component';
import { NO_DATA_COLOR, toMapRegions } from '../core/country-colors';
import { parseCountryMetrics, parseWorldGeoJson } from '../core/country-data.mapping';
import { MapTooltipDirective } from './map-tooltip.directive';
import { provideWorldMap } from './provide-world-map';
import { WorldMapComponent } from './world-map.component';
import { MapRegion } from './world-map.types';

// The same static assets the app loads over HTTP, imported directly so stories render synchronously.
const geoJson = parseWorldGeoJson(geoJsonFile);
const countries = parseCountryMetrics(metricsJson);
const countriesByCode = new Map(countries.map((c) => [c.code, c]));
const scoreRegions = toMapRegions(countries);

/** Categorical palette, assigned to regions in a fixed order. */
const REGION_COLORS: Readonly<Record<string, string>> = {
  'North America': '#2a78d6',
  'South America': '#eb6834',
  Europe: '#1baf7a',
  Africa: '#eda100',
  Asia: '#e87ba4',
  Oceania: '#008300',
};

const regionRegions: MapRegion[] = countries.map((c) => ({
  code: c.code,
  color: REGION_COLORS[c.region] ?? NO_DATA_COLOR,
}));

const countryCodes = geoJson.features.map((f) => f.properties.iso_a3).sort();

/**
 * Gives the map a 2:1 frame to fill. `parameters.mapFrame` sets its max width,
 * or `false` to render the story unframed.
 */
const withMapFrame: Decorator = (storyFn, context) => {
  const maxWidth = context.parameters['mapFrame'] as string | false | undefined;
  if (maxWidth === false) {
    return storyFn();
  }
  return componentWrapperDecorator(
    (story) =>
      `<div style="aspect-ratio: 2 / 1; width: 100%; max-width: ${maxWidth ?? '1100px'}">${story}</div>`,
  )(storyFn, context);
};

const meta: Meta<WorldMapComponent> = {
  title: 'Components/World Map',
  component: WorldMapComponent,
  tags: ['autodocs'],
  decorators: [applicationConfig({ providers: [provideWorldMap()] }), withMapFrame],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Presentation-only world choropleth built on ECharts (SVG renderer). Colours come from ' +
          '`regions`, keyed by ISO 3166-1 alpha-3 code; countries without a region use ' +
          '`noDataColor`. Zoom and pan are disabled. The host fills its parent, so give the ' +
          'parent a height or aspect ratio.',
      },
    },
  },
  // The GeoJSON is passed in render, not as an arg, so ~90 KB of coordinates stay out of the controls panel.
  render: (args) => ({ props: { ...args, geoJson } }),
  args: {
    regions: scoreRegions,
    selectedCode: null,
    mapName: 'world',
    noDataColor: NO_DATA_COLOR,
    borderColor: '#fcfcfb',
    selectedBorderColor: '#0b0b0b',
    ariaLabel: 'World map',
    countrySelected: fn(),
    countryHovered: fn(),
  },
  argTypes: {
    geoJson: { table: { disable: true } },
    selectedCode: { control: 'select', options: [null, ...countryCodes] },
    noDataColor: { control: 'color' },
    borderColor: { control: 'color' },
    selectedBorderColor: { control: 'color' },
  },
};

export default meta;
type Story = StoryObj<WorldMapComponent>;

/** Countries coloured by score on a single-hue ordinal ramp. */
export const ScoreChoropleth: Story = {};

/** Every country is coloured independently: here by world region, in a fixed categorical order. */
export const CustomColours: Story = {
  args: { regions: regionRegions },
};

/** Explicit `hoverColor` values replace the derived highlight. Hover these three countries. */
export const CustomHoverColours: Story = {
  args: {
    regions: [
      { code: 'BRA', color: '#2a78d6', hoverColor: '#eb6834' },
      { code: 'AUS', color: '#2a78d6', hoverColor: '#1baf7a' },
      { code: 'CAN', color: '#2a78d6', hoverColor: '#e87ba4' },
    ],
  },
};

/** `selectedCode` outlines one country. */
export const WithSelection: Story = {
  args: { selectedCode: 'BRA' },
};

/** No region data: every country falls back to `noDataColor`. */
export const NoData: Story = {
  args: { regions: [] },
};

/** A projected `appMapTooltip` template replaces the default name-only tooltip. */
export const CustomTooltip: Story = {
  decorators: [moduleMetadata({ imports: [MapTooltipDirective, CountryTooltipComponent] })],
  render: (args) => ({
    props: { ...args, geoJson, countriesByCode },
    template: `
      <app-world-map
        [geoJson]="geoJson"
        [regions]="regions"
        [selectedCode]="selectedCode"
        [mapName]="mapName"
        [noDataColor]="noDataColor"
        [borderColor]="borderColor"
        [selectedBorderColor]="selectedBorderColor"
        [ariaLabel]="ariaLabel"
        (countrySelected)="countrySelected($event)"
        (countryHovered)="countryHovered($event)"
      >
        <ng-template appMapTooltip let-code let-name="name">
          <app-country-tooltip [name]="name" [country]="countriesByCode.get(code)" />
        </ng-template>
      </app-world-map>
    `,
  }),
};

/** The map inside a narrow container, as on a phone. */
export const NarrowContainer: Story = {
  parameters: { mapFrame: '360px' },
};

@Component({
  selector: 'app-world-map-playground',
  imports: [
    WorldMapComponent,
    MapTooltipDirective,
    CountryTooltipComponent,
    CountryDetailsComponent,
  ],
  template: `
    <div class="playground">
      <div class="map">
        <app-world-map
          [geoJson]="geoJson"
          [regions]="regions"
          [selectedCode]="selected()"
          (countrySelected)="selected.set($event)"
        >
          <ng-template appMapTooltip let-code let-name="name">
            <app-country-tooltip [name]="name" [country]="countries.get(code)" />
          </ng-template>
        </app-world-map>
      </div>
      @if (selected(); as code) {
        <app-country-details
          [code]="code"
          [country]="countries.get(code)"
          [fallbackName]="selectedName()"
          (closed)="selected.set(null)"
        />
      }
    </div>
  `,
  styles: `
    .playground {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 320px;
      gap: 16px;
      align-items: start;
    }
    .map {
      aspect-ratio: 2 / 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class WorldMapPlaygroundComponent {
  protected readonly geoJson = geoJson;
  protected readonly regions = scoreRegions;
  protected readonly countries = countriesByCode;
  protected readonly selected = signal<string | null>(null);
  protected readonly selectedName = computed(
    () => geoJson.features.find((f) => f.properties.iso_a3 === this.selected())?.properties.name,
  );
}

/** Click a country: the selection is fed back into `selectedCode` and opens the details panel. */
export const Interactive: StoryObj<WorldMapPlaygroundComponent> = {
  render: () => ({
    moduleMetadata: { imports: [WorldMapPlaygroundComponent] },
    template: '<app-world-map-playground />',
  }),
  // The playground lays out its own map and panel.
  parameters: { mapFrame: false, controls: { disable: true } },
};
