import { chromium } from 'playwright-core';
import fs from 'node:fs';
const at = { head: [0, 9000], statue: [0, 16000], question: [0, 12000], flow: [0, 6500], cards: [1300, 3500], ladder: [0.74, 10000], blocks: [0, 5000] };
fs.mkdirSync('public/thumbs', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const [name, [f, first]] of Object.entries(at)) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5 });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await page.goto('http://127.0.0.1:5173/' + name);
  await page.waitForTimeout(first);
  if (f) { await page.evaluate((f) => scrollTo(0, f > 1 ? f : f * (document.documentElement.scrollHeight - innerHeight)), f); await page.waitForTimeout(3000); }
  await page.addStyleTag({ content: 'nav[aria-label="Draft versions"]{display:none!important}' });
  await page.screenshot({ path: `public/thumbs/${name}.jpg`, type: 'jpeg', quality: 74 });
  await ctx.close();
}
await browser.close();
