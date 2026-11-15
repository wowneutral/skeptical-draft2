// node test/shot.mjs <route> [--w 1440 --h 900] [--at 0,0.2,..] [--reduced] [--wait 1400] [--first 5000] [--tag x] [--clip x,y,w,h] [--cols n --tw px] [--eval js] [--hover x,y]
import './_lock.mjs';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const route = args[0];
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const flag = (k) => args.includes('--' + k);
const W = +opt('w', 1440), H = +opt('h', 900), wait = +opt('wait', 1500);
const out = path.resolve('test-shots'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: flag('reduced') ? 'reduce' : 'no-preference', hasTouch: W < 600, isMobile: W < 600 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|GL Driver|React DevTools|THREE.Clock|deprecated/i.test(m.text()))) errors.push(`[${m.type()}] ${m.text().slice(0, 260)}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + String(e).slice(0, 400)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (r) => { errors.push('[net] ' + r.request().url().slice(0, 100)); return r.abort(); });
await page.goto('http://127.0.0.1:5173' + route, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(+opt('first', 6000));
if (opt('eval')) await page.evaluate(opt('eval'));
const info = await page.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, ih: innerHeight }));
const stops = opt('px') ? opt('px').split(',').map(Number) : opt('at', '0,0.2,0.4,0.6,0.8,1').split(',').map((f) => Math.round(+f * (info.sh - info.ih)));
const shots = [];
const cl = opt('clip') ? opt('clip').split(',').map(Number) : null;
for (const y of stops) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  if (opt('hover')) { const [hx, hy] = opt('hover').split(',').map(Number); for (let i = 0; i < 12; i++) { await page.mouse.move(hx + i * 12, hy + Math.sin(i) * 30); await page.waitForTimeout(40); } }
  await page.waitForTimeout(wait);
  shots.push((await page.screenshot({ type: 'jpeg', quality: 80, ...(cl ? { clip: { x: cl[0], y: cl[1], width: cl[2], height: cl[3] } } : {}) })).toString('base64'));
}
const over = await page.evaluate(() => { const w = innerWidth; return [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && (r.right > w + 1 || r.left < -1) && cs.position !== 'fixed' && !e.closest('[data-allow-overflow], canvas, svg'); }).slice(0, 5).map((e) => e.tagName + '.' + String(e.className).slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().left) + '..' + Math.round(e.getBoundingClientRect().right)); });
const cols = +opt('cols', W < 600 ? 6 : 3), tw = +opt('tw', W < 600 ? 300 : 640);
const sheet = await ctx.newPage();
await sheet.setViewportSize({ width: cols * tw + (cols + 1) * 6, height: 100 });
await sheet.setContent(`<body style="margin:6px;background:#777;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:6px">${shots.map((s) => `<img style="width:${tw}px;display:block" src="data:image/jpeg;base64,${s}">`).join('')}</body>`);
const file = path.join(out, `${route.replace(/\W/g, '') || 'index'}-${W}${flag('reduced') ? '-rm' : ''}${opt('tag') ? '-' + opt('tag') : ''}.jpg`);
await sheet.screenshot({ path: file, fullPage: true, type: 'jpeg', quality: 78 });
console.log(JSON.stringify({ file, sh: info.sh, sw: info.sw, overflow: over, errors: [...new Set(errors)].slice(0, 10) }));
await browser.close();
