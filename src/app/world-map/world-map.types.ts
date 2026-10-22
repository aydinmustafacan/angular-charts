/** Properties every country feature in the GeoJSON must carry. */
export interface CountryFeatureProperties {
  /** ISO 3166-1 alpha-3 code, used as the region identifier. */
  readonly iso_a3: string;
  readonly name: string;
}

type Position = readonly number[];

export type CountryGeometry =
  | { readonly type: 'Polygon'; readonly coordinates: readonly (readonly Position[])[] }
  | {
      readonly type: 'MultiPolygon';
      readonly coordinates: readonly (readonly (readonly Position[])[])[];
    };

export interface CountryFeature {
  readonly type: 'Feature';
  readonly id?: string;
  readonly properties: CountryFeatureProperties;
  readonly geometry: CountryGeometry;
}

export interface WorldGeoJson {
  readonly type: 'FeatureCollection';
  readonly features: readonly CountryFeature[];
}

/** Presentation data for one region on the map. */
export interface MapRegion {
  /** ISO 3166-1 alpha-3 code matching `iso_a3` in the GeoJSON. */
  readonly code: string;
  /** Fill colour for the region. */
  readonly color: string;
  /** Fill colour on hover. Derived from `color` when omitted. */
  readonly hoverColor?: string;
}

/** Context passed to a projected tooltip template. */
export interface MapTooltipContext {
  /** ISO 3166-1 alpha-3 code of the hovered region. */
  readonly $implicit: string;
  readonly code: string;
  /** Country name from the GeoJSON. */
  readonly name: string;
}

export interface MapPointer {
  readonly code: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
}
