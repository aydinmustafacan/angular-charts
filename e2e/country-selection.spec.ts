import { expect, Page, test } from '@playwright/test';

/**
 * Finds a point inside a country by sweeping the pointer across the map until
 * the tooltip names it. Independent of viewport size and map layout.
 */
async function findCountry(page: Page, name: string): Promise<{ x: number; y: number }> {
  const box = await page.locator('app-world-map').boundingBox();
  if (!box) {
    throw new Error('Map is not visible');
  }
  const tooltipName = page.getByTestId('map-tooltip').locator('.name');
  const steps = 40;
  for (let row = 1; row < steps / 2; row++) {
    for (let col = 1; col < steps; col++) {
      const x = box.x + (box.width * col) / steps;
      const y = box.y + (box.height * row) / (steps / 2);
      await page.mouse.move(x, y);
      if ((await tooltipName.count()) > 0 && (await tooltipName.textContent())?.trim() === name) {
        return { x, y };
      }
    }
  }
  throw new Error(`Could not find ${name} on the map`);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('app-world-map svg path').first()).toBeVisible();
});

test('hovering a country shows its tooltip', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Hover is not available on touch devices');

  await findCountry(page, 'Brazil');

  const tooltip = page.getByTestId('map-tooltip');
  await expect(tooltip).toContainText('Score');
  await expect(tooltip).toContainText('61');
  await expect(tooltip).toContainText('Watch');
});

test('clicking a country opens its details panel', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Locating a country relies on hover');

  const details = page.getByTestId('country-details');
  await expect(details).toBeHidden();

  const point = await findCountry(page, 'Brazil');
  await page.mouse.click(point.x, point.y);

  await expect(details).toBeVisible();
  await expect(page.getByTestId('details-title')).toHaveText('Brazil');
  await expect(page.getByTestId('details-score')).toHaveText('61');
  await expect(page.getByTestId('details-status')).toContainText('Watch');
  await expect(details).toContainText('South America');
  await expect(page.getByTestId('country-picker')).toHaveValue('BRA');

  await page.getByRole('button', { name: 'Close details' }).click();
  await expect(details).toBeHidden();
});

test('a country without metrics shows the missing-data message', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Locating a country relies on hover');

  const point = await findCountry(page, 'Greenland');
  await expect(page.getByTestId('map-tooltip')).toContainText('No data available');

  await page.mouse.click(point.x, point.y);

  await expect(page.getByTestId('details-title')).toHaveText('Greenland');
  await expect(page.getByTestId('details-empty')).toBeVisible();
});

test('the country picker opens the details panel', async ({ page }) => {
  await page.getByTestId('country-picker').selectOption('JPN');

  await expect(page.getByTestId('details-title')).toHaveText('Japan');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('country-details')).toBeHidden();
});

test('the map does not overflow the page horizontally', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('an unavailable GeoJSON shows the error state and recovers on retry', async ({ page }) => {
  let fail = true;
  await page.route('**/geo/world-countries.geo.json', (route) =>
    fail ? route.fulfill({ status: 500 }) : route.continue(),
  );
  await page.reload();

  await expect(page.getByTestId('error-state')).toBeVisible();

  fail = false;
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('app-world-map svg path').first()).toBeVisible();
});
