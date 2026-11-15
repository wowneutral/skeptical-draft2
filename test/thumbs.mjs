// node test/thumbs.mjs <slug> [waitMs=8000] [scroll=0]   (scroll: 0..1 of the page, or pixels if > 1)
import './_lock.mjs';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const [slug, first = '8000', f = '0'] = process.argv.slice(2);
fs.mkdirSync('public/thumbs', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5 });
const page = await ctx.newPage();
await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
await page.goto('http://127.0.0.1:5173/' + slug);
await page.waitForTimeout(+first);
if (+f) { await page.evaluate((f) => scrollTo(0, f > 1 ? f : f * (document.documentElement.scrollHeight - innerHeight)), +f); await page.waitForTimeout(2500); }
await page.addStyleTag({ content: 'nav[aria-label="Draft versions"]{display:none!important}' });
await page.screenshot({ path: `public/thumbs/${slug}.jpg`, type: 'jpeg', quality: 74 });
await browser.close();
console.log('thumb written: public/thumbs/' + slug + '.jpg');
