import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import {
  createCountryDataset,
  parseCountryMetrics,
  parseWorldGeoJson,
} from './country-data.mapping';
import { CountryDataset } from './country.models';

export interface CountryDataUrls {
  readonly geoJson: string;
  readonly metrics: string;
}

export const COUNTRY_DATA_URLS = new InjectionToken<CountryDataUrls>('COUNTRY_DATA_URLS', {
  providedIn: 'root',
  factory: () => ({
    geoJson: 'geo/world-countries.geo.json',
    metrics: 'data/country-metrics.json',
  }),
});

/** Loads country geometry and business metrics from static assets. */
@Injectable({ providedIn: 'root' })
export class CountryDataService {
  private readonly http = inject(HttpClient);
  private readonly urls = inject(COUNTRY_DATA_URLS);

  loadDataset(): Observable<CountryDataset> {
    return forkJoin({
      geoJson: this.http.get<unknown>(this.urls.geoJson).pipe(map(parseWorldGeoJson)),
      metrics: this.http.get<unknown>(this.urls.metrics).pipe(map(parseCountryMetrics)),
    }).pipe(map(({ geoJson, metrics }) => createCountryDataset(geoJson, metrics)));
  }
}
