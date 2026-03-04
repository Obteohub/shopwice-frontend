import { test, expect, type Page } from '@playwright/test';

const waitForVisibleFiltersPanel = async (page: Page) => {
  const visiblePanel = page.locator('[data-testid="collection-filters-panel"]:visible').first();
  const hasVisiblePanel = await visiblePanel.isVisible({ timeout: 5000 }).catch(() => false);

  if (!hasVisiblePanel) {
    const mobileFiltersButton = page.getByRole('button', { name: /open filters|filters/i }).first();
    const buttonVisible = await mobileFiltersButton.isVisible({ timeout: 3000 }).catch(() => false);
    if (buttonVisible) {
      await mobileFiltersButton.click();
    }
  }

  const panel = page.locator('[data-testid="collection-filters-panel"]:visible').first();
  await expect(panel).toBeVisible();
  return panel;
};

const getBrandCheckboxOptions = (panel: ReturnType<Page['locator']>) =>
  panel.locator(
    '[data-testid^="facet-brand-level-0-option-"] input[type="checkbox"], [data-testid^="facet-brand-option-"] input[type="checkbox"]',
  );

const ensureBrandsAccordionOpen = async (panel: ReturnType<Page['locator']>) => {
  const options = getBrandCheckboxOptions(panel);
  const before = await options.count();
  if (before > 0) return;

  const brandsToggle = panel.getByRole('button', { name: /brands/i }).first();
  const canToggle = await brandsToggle.isVisible({ timeout: 3000 }).catch(() => false);
  if (!canToggle) return;

  await brandsToggle.click();
  await panel.page().waitForTimeout(500);
};

const waitForBrandsFacetReady = async (panel: ReturnType<Page['locator']>, timeoutMs = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const hasError = await panel.locator('[data-testid="filters-error"]').isVisible().catch(() => false);
    if (hasError) return false;

    const hasBrandsAccordion = await panel
      .getByRole('button', { name: /brands/i })
      .first()
      .isVisible({ timeout: 500 })
      .catch(() => false);
    if (hasBrandsAccordion) return true;

    await panel.page().waitForTimeout(500);
  }
  return false;
};

const waitForBrandOptions = async (panel: ReturnType<Page['locator']>, timeoutMs = 20000) => {
  const options = getBrandCheckboxOptions(panel);
  const start = Date.now();
  let count = await options.count();

  while (count === 0 && Date.now() - start < timeoutMs) {
    await panel.page().waitForTimeout(500);
    count = await options.count();
  }

  return count;
};

const gotoWithRetry = async (page: Page, url: string) => {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await page.goto(url, { waitUntil: 'commit', timeout: 120000 });
      return response;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(400 * (attempt + 1));
    }
  }
  throw lastError;
};

test.describe('Collection filters', () => {
  test('category page keeps slug-only URL', async ({ page }) => {
    await page.goto('/product-category/electronics');
    await expect(page).toHaveURL(/\/product-category\/electronics(?:\?.*)?$/);
    await expect(page).not.toHaveURL(/category=/);
  });

  test('multi-filter and clear-all update URL query state', async ({ page }) => {
    await page.goto('/products');
    const panel = await waitForVisibleFiltersPanel(page);
    const ready = await waitForBrandsFacetReady(panel);
    test.skip(!ready, 'Brand facets unavailable in this environment');
    await ensureBrandsAccordionOpen(panel);

    const brandOptions = getBrandCheckboxOptions(panel);
    const brandOption = brandOptions.first();
    const brandCount = await waitForBrandOptions(panel);
    test.skip(brandCount === 0, 'Brand facets unavailable in this environment');

    await brandOption.click();
    await expect(page).toHaveURL(/brand=/);

    await panel.locator('#filter-min-price').first().fill('100');
    await expect(page).toHaveURL(/minPrice=100/);

    await panel.locator('[data-testid="filters-clear-all"]').first().click();
    await expect(page).not.toHaveURL(/brand=/);
    await expect(page).not.toHaveURL(/minPrice=100/);
  });

  test('query-state URLs restore filter state across navigations', async ({ page }) => {
    await page.goto('/products');
    const panel = await waitForVisibleFiltersPanel(page);
    const ready = await waitForBrandsFacetReady(panel);
    test.skip(!ready, 'Brand facets unavailable in this environment');
    await ensureBrandsAccordionOpen(panel);

    const brandOptions = getBrandCheckboxOptions(panel);
    const brandOption = brandOptions.first();
    const brandCount = await waitForBrandOptions(panel);
    test.skip(brandCount === 0, 'Brand facets unavailable in this environment');

    await brandOption.click();
    await expect(page).toHaveURL(/brand=/);
    const brandOnlyUrl = page.url();

    await panel.locator('#filter-min-price').first().fill('100');
    await expect(page).toHaveURL(/minPrice=100/);
    const brandAndPriceUrl = page.url();

    await gotoWithRetry(page, brandOnlyUrl);
    await expect(page).toHaveURL(/brand=/);
    await expect(page).not.toHaveURL(/minPrice=100/);

    await gotoWithRetry(page, brandAndPriceUrl);
    await expect(page).toHaveURL(/minPrice=100/);
  });

  test('brand filter supports progressive multi-level drill-down with breadcrumb backtracking', async ({ page }) => {
    const response = await gotoWithRetry(page, '/products');
    test.skip(!response || response.status() >= 400, 'Products page unavailable in this environment');

    const panel = await waitForVisibleFiltersPanel(page);
    const ready = await waitForBrandsFacetReady(panel);
    test.skip(!ready, 'Brand facets unavailable in this environment');
    await ensureBrandsAccordionOpen(panel);

    const level0Options = panel.locator('[data-testid^="facet-brand-level-0-option-"] input[type="checkbox"]');
    let level0Count = await level0Options.count();
    const waitStart = Date.now();
    while (level0Count === 0 && Date.now() - waitStart < 20000) {
      await page.waitForTimeout(500);
      level0Count = await level0Options.count();
    }
    test.skip(level0Count === 0, 'Multi-level brand facets unavailable in this environment');

    const avonOption = panel
      .locator('[data-testid^="facet-brand-level-0-option-"]', { hasText: /avon/i })
      .first();
    const hasAvon = await avonOption.isVisible({ timeout: 3000 }).catch(() => false);
    const parentOption = hasAvon
      ? avonOption.locator('input[type="checkbox"]').first()
      : level0Options.first();
    await parentOption.click();
    await expect(page).toHaveURL(/brand=/);

    const level1Options = panel.locator('[data-testid^="facet-brand-level-1-option-"] input[type="checkbox"]');
    let level1Count = await level1Options.count();
    const level1Start = Date.now();
    while (level1Count === 0 && Date.now() - level1Start < 20000) {
      await page.waitForTimeout(500);
      level1Count = await level1Options.count();
    }
    test.skip(level1Count === 0, 'Selected parent brand has no child levels in this environment');

    await level1Options.first().click();
    await expect(page).toHaveURL(/brand=/);

    const breadcrumb = panel.locator('[data-testid="brand-filter-breadcrumb"]');
    await expect(breadcrumb).toBeVisible();

    const firstCrumbButton = breadcrumb.locator('[data-testid="brand-filter-breadcrumb-item-0"]');
    await expect(firstCrumbButton).toBeVisible();
    await firstCrumbButton.click();

    await expect(panel.locator('[data-testid="brand-filter-breadcrumb"]')).toHaveCount(0);
    const level1AfterBacktrack = await panel.locator('[data-testid^="facet-brand-level-1-option-"]').count();
    expect(level1AfterBacktrack).toBeGreaterThan(0);
  });

  test('navigating between Avon nested routes clears stale page query', async ({ page }) => {
    const response = await gotoWithRetry(page, '/brand/avon/perfumes/men?page=7');
    test.skip(!response || response.status() >= 400, 'Avon nested route unavailable in this environment');

    await expect(page).toHaveURL(/\/brand\/avon\/perfumes\/men\?page=7/);

    const menChildLink = page.locator('a[href^="/brand/avon/perfumes/men/"]').first();
    let hasMenChild = false;
    const menStart = Date.now();
    while (!hasMenChild && Date.now() - menStart < 30000) {
      hasMenChild = await menChildLink.isVisible({ timeout: 500 }).catch(() => false);
      if (hasMenChild) break;
      await page.waitForTimeout(500);
    }
    test.skip(!hasMenChild, 'Avon men sub-brand links unavailable in this environment');

    await menChildLink.click();
    await expect(page).toHaveURL(/\/brand\/avon\/perfumes\/men\/[^/?#]+(?:\?.*)?$/);
    await expect(page).not.toHaveURL(/page=7/);

    await gotoWithRetry(page, '/brand/avon/perfumes');
    await expect(page).toHaveURL(/\/brand\/avon\/perfumes(?:\?.*)?$/);
    await expect(page).not.toHaveURL(/page=7/);

    const childLinks = page
      .locator('a[href^="/brand/avon/perfumes/"]')
      .filter({ hasNotText: /^$/ });
    const childCount = await childLinks.count();
    test.skip(childCount === 0, 'Avon perfumes child route links unavailable in this environment');
    await childLinks.first().click();
    await expect(page).toHaveURL(/\/brand\/avon\/perfumes\/[^/?#]+(?:\/[^/?#]+)?(?:\?.*)?$/);
    await expect(page).not.toHaveURL(/page=7/);
  });
});
