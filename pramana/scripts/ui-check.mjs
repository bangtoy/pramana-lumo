// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright module, or install
// Playwright separately. It is verification tooling, not an application dependency.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const output = resolve('../docs/verification/screenshots');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const targets = process.argv.slice(2);
const results = [];
try {
  for (const target of targets.length ? targets : ['/']) {
    for (const [width, height] of [[1440, 900], [390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      const response = await page.goto(`http://localhost:${process.env.PORT || 3000}${target}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const style = await page.evaluate(() => ({
        font: getComputedStyle(document.body).fontFamily,
        primary: getComputedStyle(document.body).getPropertyValue('--color-primary').trim(),
        lang: document.documentElement.lang,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      const name = `${target.replace(/[^a-z0-9]/gi, '-') || 'home'}-${width}`;
      await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
      results.push({ target, width, height, status: response.status(), ...style, errors });
      await page.close();
    }
  }
} finally { await browser.close(); }
writeFileSync(`${output}/last-check.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
if (results.some(r => r.status !== 200 || r.errors.length || r.overflow || r.lang !== 'en' || r.primary !== '#1b8ce8' || !r.font.includes('Geist'))) process.exitCode = 1;
