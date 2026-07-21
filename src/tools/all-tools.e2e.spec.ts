import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import { expect, test } from '@playwright/test';

const toolsDirectory = join(process.cwd(), 'src/tools');
const toolRoutes = readdirSync(toolsDirectory, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .flatMap((entry) => {
    const indexPath = join(toolsDirectory, entry.name, 'index.ts');
    try {
      const source = readFileSync(indexPath, 'utf8');
      return [...source.matchAll(/\bpath:\s*'([^']+)'/g)].map(match => match[1]);
    }
    catch (_) {
      return [];
    }
  })
  .sort();

test.describe('All tool routes', () => {
  for (const route of toolRoutes) {
    test(`${route} renders without an uncaught error`, async ({ browserName, page }) => {
      test.skip(browserName !== 'chromium', 'The focused E2E suite covers cross-browser behavior.');

      const pageErrors: string[] = [];
      page.on('pageerror', error => pageErrors.push(error.message));

      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });

      expect(response?.ok()).toBe(true);
      await expect(page).toHaveTitle(/ - IT Tools$/);
      await expect(page.getByRole('heading', { name: 'Page not found' })).toHaveCount(0);
      expect(pageErrors).toEqual([]);
    });
  }
});
