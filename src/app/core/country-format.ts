const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const usd = new Intl.NumberFormat('en', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const percent = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const signedPercent = new Intl.NumberFormat('en', {
  maximumFractionDigits: 1,
  signDisplay: 'exceptZero',
});

export const formatPopulation = (value: number): string => compact.format(value);
export const formatUsd = (value: number): string => usd.format(value);
export const formatPercent = (value: number): string => `${percent.format(value)}%`;
export const formatSignedPercent = (value: number): string => `${signedPercent.format(value)}%`;
