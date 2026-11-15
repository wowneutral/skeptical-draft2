import { chromium } from 'playwright-core';
const [route, js, w = 1440, h = 900] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: +w, height: +h } })).newPage();
page.on('pageerror', (e) => console.log('PAGEERROR', String(e).slice(0, 300)));
await page.goto('http://127.0.0.1:5173' + route); await page.waitForTimeout(3500);
console.log(JSON.stringify(await page.evaluate(js)));
await browser.close();
