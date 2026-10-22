import { metrics } from '../../testing/fixtures';
import { countryColor, SCORE_BUCKETS, scoreToColor, toMapRegions } from './country-colors';

describe('scoreToColor', () => {
  it.each([
    [0, SCORE_BUCKETS[0].color],
    [19.9, SCORE_BUCKETS[0].color],
    [20, SCORE_BUCKETS[1].color],
    [59, SCORE_BUCKETS[2].color],
    [79, SCORE_BUCKETS[3].color],
    [80, SCORE_BUCKETS[4].color],
    [100, SCORE_BUCKETS[4].color],
  ])('maps score %d to its bucket colour', (score, color) => {
    expect(scoreToColor(score)).toBe(color);
  });

  it('clamps out-of-range scores to the end buckets', () => {
    expect(scoreToColor(-10)).toBe(SCORE_BUCKETS[0].color);
    expect(scoreToColor(150)).toBe(SCORE_BUCKETS[4].color);
  });
});

describe('countryColor', () => {
  it('prefers an explicit colour over the score colour', () => {
    expect(countryColor(metrics({ code: 'BRA', score: 10, color: '#123456' }))).toBe('#123456');
    expect(countryColor(metrics({ code: 'BRA', score: 10 }))).toBe(SCORE_BUCKETS[0].color);
  });
});

describe('toMapRegions', () => {
  it('turns each country into a map region keyed by ISO code', () => {
    const regions = toMapRegions([
      metrics({ code: 'BRA', score: 61 }),
      metrics({ code: 'FRA', score: 85, color: '#00ff00' }),
    ]);
    expect(regions).toEqual([
      { code: 'BRA', color: SCORE_BUCKETS[3].color },
      { code: 'FRA', color: '#00ff00' },
    ]);
  });
});
