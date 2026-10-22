import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { TEST_GEOJSON, TEST_METRICS } from '../../testing/fixtures';
import { COUNTRY_DATA_URLS, CountryDataService } from './country-data.service';

describe('CountryDataService', () => {
  let service: CountryDataService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: COUNTRY_DATA_URLS,
          useValue: { geoJson: '/geo.json', metrics: '/metrics.json' },
        },
      ],
    });
    service = TestBed.inject(CountryDataService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads geometry and metrics separately and combines them into a dataset', async () => {
    const result = firstValueFrom(service.loadDataset());

    http.expectOne('/geo.json').flush(TEST_GEOJSON);
    http.expectOne('/metrics.json').flush(TEST_METRICS);

    const dataset = await result;
    expect(dataset.geoJson.features).toHaveLength(3);
    expect([...dataset.countries.keys()]).toEqual(['BRA', 'FRA']);
    expect(dataset.unmatchedCodes).toEqual([]);
  });

  it('fails and cancels the metrics request when the GeoJSON request fails', async () => {
    const result = firstValueFrom(service.loadDataset());
    const metricsRequest = http.expectOne('/metrics.json');

    http.expectOne('/geo.json').flush('Not found', { status: 404, statusText: 'Not Found' });

    await expect(result).rejects.toMatchObject({ status: 404 });
    expect(metricsRequest.cancelled).toBe(true);
  });

  it('fails when the metrics payload is malformed', async () => {
    const result = firstValueFrom(service.loadDataset());

    http.expectOne('/geo.json').flush(TEST_GEOJSON);
    http.expectOne('/metrics.json').flush({ unexpected: true });

    await expect(result).rejects.toThrowError(/expected an array/);
  });
});
