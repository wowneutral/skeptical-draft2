// Automated checks for every route: errors, axe, reduced motion, phone overflow, copy rules.
import './_lock.mjs';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const axeSrc = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ['/', '/head', '/statue', '/question', '/flow', '/cards', '/ladder', '/blocks'];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function open(route, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: o.w || 1440, height: o.h || 900 }, reducedMotion: o.reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage(); const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 300)));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await page.goto('http://127.0.0.1:5173' + route); await page.waitForTimeout(o.wait || 9000);
  return { ctx, page, errors };
}
const hidden = () => {
  const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) {
    const t = n.textContent.trim(); if (t.length < 4) continue;
    const el = n.parentElement; if (el.closest('script,style,.sr-only,.sr-only-x,.skip-x,[aria-hidden="true"],.act:not(.is-on),.dv dd,[data-gl],[role="status"],[data-slot="tooltip-content"],[data-slot="accordion-content"]')) continue;
    const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight || r.width === 0) continue;
    let o = 1, clip = false, e = el;
    while (e && e !== document.body) { const cs = getComputedStyle(e); o *= +cs.opacity; if (cs.visibility === 'hidden') o = 0; if (/inset\(/.test(cs.clipPath) && /100%/.test(cs.clipPath)) clip = true; e = e.parentElement; }
    if (o < 0.5 || clip) out.push(t.slice(0, 36));
  }
  return out;
};
const report = {};
for (const route of routes) {
  const R = (report[route] = {});
  { const { ctx, page, errors } = await open(route);
    await page.addScriptTag({ content: axeSrc });
    R.axe = await page.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map((v) => `${v.id}(${v.impact}) x${v.nodes.length}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`));
    R.errors = errors;
    R.links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => !/^(#|\/|mailto:skepticalprep@gmail\.com|https:\/\/(skeptical\.pages\.dev|opencaselist\.com\/hsld26\/SkepticalIndependent|www\.instagram\.com\/skeptical_team|discord\.gg\/Z5tm2Q6zXX|github\.com\/wowneutral\/skeptical))/.test(h)));
    const text = await page.evaluate(() => document.body.innerText);
    R.copy = ['—', '–', 'Emerging', 'Champion Briefs', 'Tabroom', 'TOC', 'Yale', 'MORAL', 'undefined', 'NaN'].filter((w) => text.includes(w));
    await ctx.close(); }
  { const { ctx, page, errors } = await open(route, { reduced: true, wait: 7000 });
    const bad = []; const sh = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (const f of [0, 0.25, 0.5, 0.75, 1]) { await page.evaluate((y) => scrollTo(0, y), Math.round(f * sh)); await page.waitForTimeout(700); const h = await page.evaluate(hidden); if (h.length) bad.push(`${f}: ${h.slice(0, 3).join(' / ')} (+${h.length})`); }
    R.reduced = { errors, invisible: bad }; await ctx.close(); }
  { const { ctx, page, errors } = await open(route, { w: 390, h: 844, wait: 7000 });
    R.phone = { sw: await page.evaluate(() => document.documentElement.scrollWidth), errors }; await ctx.close(); }
}
console.log(JSON.stringify(report, null, 1));
await browser.close();
