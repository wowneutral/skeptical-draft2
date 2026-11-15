// Drive a page like a person and photograph each step.
// usage: node test/play.mjs /<route> <steps.mjs> [--w 1440 --h 900] [--first 9000] [--reduced] [--cols 3 --tw 640] [--tag name]
// steps.mjs:  export default async ({ page, snap, wait }) => { await page.mouse.click(700, 400); await wait(600); await snap(); await page.keyboard.press('ArrowRight'); await snap(); };
// `page` is a Playwright Page. Each snap() adds one frame to the contact sheet written to test-shots/.
import './_lock.mjs';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const args = process.argv.slice(2);
const [route, file] = args;
const opt = (k, d) => { const i = args.indexOf('--' + k); return i < 0 ? d : args[i + 1]; };
const flag = (k) => args.includes('--' + k);
const W = +opt('w', 1440), H = +opt('h', 900);
const out = path.resolve('test-shots'); fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: flag('reduced') ? 'reduce' : 'no-preference', hasTouch: W < 600, isMobile: W < 600 });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && !/GPU stall|GL Driver|React DevTools|THREE.Clock|deprecated/i.test(m.text()))) errors.push(`[${m.type()}] ${m.text().slice(0, 260)}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + String(e).slice(0, 400)));
await page.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (r) => { errors.push('[net] ' + r.request().url().slice(0, 100)); return r.abort(); });
await page.goto('http://127.0.0.1:5173' + route, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(+opt('first', 9000));
const shots = [];
const snap = async () => { shots.push((await page.screenshot({ type: 'jpeg', quality: 80 })).toString('base64')); };
const wait = (ms) => page.waitForTimeout(ms);
let failed = null;
try { await (await import(pathToFileURL(path.resolve(file)).href)).default({ page, snap, wait }); } catch (e) { failed = String(e).slice(0, 500); }
if (!shots.length) await snap();
const cols = +opt('cols', W < 600 ? 6 : 3), tw = +opt('tw', W < 600 ? 300 : 640);
const sheet = await ctx.newPage();
await sheet.setViewportSize({ width: cols * tw + (cols + 1) * 6, height: 100 });
await sheet.setContent(`<body style="margin:6px;background:#777;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:6px">${shots.map((s) => `<img style="width:${tw}px;display:block" src="data:image/jpeg;base64,${s}">`).join('')}</body>`);
const name = path.join(out, `${route.replace(/\W/g, '') || 'index'}-play-${W}${opt('tag') ? '-' + opt('tag') : ''}.jpg`);
await sheet.screenshot({ path: name, fullPage: true, type: 'jpeg', quality: 78 });
console.log(JSON.stringify({ file: name, frames: shots.length, stepsFailed: failed, errors: [...new Set(errors)].slice(0, 10) }));
await browser.close();
