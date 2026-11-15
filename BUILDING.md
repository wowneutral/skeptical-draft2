# Building a version

This app holds many drafts of the Skeptical site, one route each. This file is the contract for anyone (person or agent) adding a new one. Read all of it before writing code.

Skeptical is a free, independent Lincoln-Douglas debate team run by a 14-year-old head coach. The audience is middle-school and high-school debaters deciding whether to join. A good version is something a debater would screenshot and send to a friend.

## 1. What you own

A new version is one folder and nothing else:

```
src/versions/<slug>/index.tsx   default export: the page component
src/versions/<slug>/meta.ts     default export: { slug, n, name, color, ink, kind, text }
src/versions/<slug>/*.css|tsx   anything else you need
public/<slug>/                  your own assets, if any
```

`meta.ts` registers the route and the index row by itself (see `src/registry.ts`). Example:

```ts
import type { Version } from '@/content';
const meta: Version = { slug: 'prism', n: 14, name: 'The prism', color: '#06070c', ink: '#f2f2f6', kind: 'New, round three', text: 'One sentence, plain words, saying what the visitor sees and does.' };
export default meta;
```

`color` is the page background (used by the page transition), `ink` the main text colour.

**Never edit anything outside your folder and `public/<slug>/`.** Not `src/lib`, not `src/components`, not `content.ts`, not `App.tsx`, not `package.json`, not another version. Other people are building in this repo at the same moment. **Never run `npm install`, `git add`, `git commit` or `git checkout`.** If a shared file seems to need a change, work around it inside your folder.

## 2. Copy rules (hard)

- Every claim about the team comes from `src/content.ts`. Import it; do not retype it.
- You may add short interface words of your own (button labels, instructions, section framing, up to about six words each). They must never state a fact about the team, a result, a person, a number, a date or a place that is not in `content.ts`.
- The only real numbers: 8 debaters, 2 coaches, 7 things in the drive, 1 tournament (September 2026, National Speech & Debate Season Opener, Lexington, Kentucky), 2 results. Do not invent scores, rounds, records, rankings, schedules, quotes or testimonials.
- Students appear only as "Shong Z." and "Nina H.", only with their results. Coaches are "Armaan Seth" and "Nathan Shannon". Never put invented words in a named person's mouth.
- The drive is described, never shown, never linked.
- No em dashes and no en dashes anywhere in visible text. Titles end with a period, as in `content.ts`.
- Never mention: Emerging Tech, TOC bids, Champion Briefs, Yale, Tabroom.
- Links: only the hrefs in `content.ts` (the live site's pages, caselist, Instagram, Discord, GitHub, the email).
- Every version must carry all of it somewhere: the pitch, the three-line statement and the two doors; the four manifesto lines; the record (rule, event line, both results, the "more" link); the drive (lead, all seven items with their text, the "more" link); the people (both coaches with role and bio, the count, the "more" link); join (lead, all three paths with at least their line and first text line and their href, the "already" and "coach" lines, the "also" line with the email); the footer (line, links, pages) and a small "Draft 2, version N. Not the live site."

## 3. Shared code you can use

- `useVersion(slug, { anchorOffset? })` from `@/lib/version`. Call it first in your component. It names the page, sets the theme colour, starts smooth scroll (Lenis on GSAP's ticker) and lifts the page-transition cover. In-page `<a href="#id">` links scroll smoothly by themselves.
- `@/lib/scroll`: `gsap`, `ScrollTrigger`, `SplitText`, `useGSAP`, `scroll` (a mutable `{ y, p, v }` you can read inside `useFrame` or a ticker), `scrollToY`, `scrollToId`. `DrawSVGPlugin` and `CustomEase` are registered; eases `'site'` and `'out'` exist.
- `@/lib/motion`: `<Split as="h2" by="lines|words|chars" on="view|load|none" effect="rise|blur">` and `useRise(ref)` (everything with `data-rise` inside fades up on entry).
- `@/lib/utils`: `still` (prefers-reduced-motion), `coarse` (touch), `clamp`, `lerp`, `smooth`, `damp`, `cn`, `isPhone()`.
- `@/components/Loader`: a real loading counter for 3D scenes (reads drei's progress).
- shadcn/ui in `@/components/ui`: accordion, button, dropdown-menu, kbd, slider, switch, toggle, toggle-group, tooltip. Set `--background --foreground --primary --primary-foreground --border --input --ring --muted --muted-foreground --accent --accent-foreground --popover --popover-foreground --radius` on your root so they take your colours.
- `@/components/bits` (React Bits): Magnet, VariableProximity, SplitFlapText, Lanyard, FaultyTerminal, Hyperspeed, CountUp, MetallicPaint.
- More React Bits: the whole library is checked out at `/home/claude/lab/rb/src/ts-default/<Category>/<Name>/`. Copy what you want into `src/versions/<slug>/bits/`, delete the `'use client'` line and any Google Fonts `@import`. If a component needs a package that is not installed, do not use it.
- Installed packages: react 19, react-router, three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, postprocessing, @react-three/rapier, gsap (all plugins), @gsap/react, lenis, motion, maath, zustand, matter-js, rough-notation, roughjs, simplex-noise, @use-gesture/react, tone, canvas-confetti, ogl, lucide-react, radix-ui, tailwindcss 4.
- Fonts (Fontsource, import the CSS in your component): variable: archivo (also `/wdth.css`), big-shoulders-display, bodoni-moda, bricolage-grotesque, eb-garamond, familjen-grotesk, fraunces, hanken-grotesk, instrument-sans, jetbrains-mono, newsreader, oswald, playfair-display, schibsted-grotesk, syne, unbounded. Static: abril-fatface, anton, bebas-neue, bodoni-moda, carlito, caveat, chivo-mono, courier-prime, dm-serif-display, gloock, ibm-plex-mono, kalam, libre-baskerville, old-standard-tt, permanent-marker, press-start-2p, reenie-beanie, schibsted-grotesk, silkscreen, space-mono, special-elite, unifrakturcook, vt323. Check `node_modules/@fontsource*/<name>/` for the exact CSS file names and family name.
- `src/lib/marks.json` has the SVG paths of the brand's Bodoni question mark (`italic` and `roman`, each `{ d, w, h }`).
- Look at existing versions for patterns: `src/versions/ladder` (R3F scene driven by scroll), `question` (DOM text mirrored in WebGL), `flow` (pinned GSAP sequence), `cards` (shadcn controls), `blocks/Pit.tsx` (matter.js with DOM bodies), `badge` (canvas-drawn textures).

## 4. CSS rules

- Put every selector under one root class named `.v-<slug>`, plus `html[data-v="<slug>"] { background: ... }`. Styles from every version are loaded into the same document.
- Tailwind's reset is on: links have no underline and inherit colour, headings and lists are unstyled. Style them yourself.
- Do not name your own classes after Tailwind utilities: block, inline, flex, grid, table, hidden, contents, container, fixed, absolute, relative, static, sticky, visible, invisible, italic, underline, uppercase, truncate, border, ring, shadow, outline, blur, filter, transition, transform, resize, grow, shrink, group, peer, isolate. shadcn components use those names and your rule would hit them.
- A small switcher sits fixed at the bottom-left of every page (about 12rem by 3.5rem). Keep fixed interface out of that corner and give footers enough bottom padding.
- No horizontal scrolling at 390px wide. Body text at least 16px. Hit targets at least 44px.

## 5. Robustness and accessibility

- One `<h1>`. A skip link (`<a className="skip-x" href="#main">`). Visually hidden text uses `className="sr-only-x"`.
- Text contrast at least 4.5:1, including dimmed states. Visible `:focus-visible` styles in your palette. Themed `::selection`.
- `aria-label` only on elements that may take one (links, buttons, headings, landmarks, `role="img"`), never on a bare `span`, `p` or `div`.
- Every interaction works with a keyboard and has a touch path. Nothing is reachable only by hover. Content never depends on WebGL: check for it and show the content plainly without it.
- Reduced motion (`still`): nothing moves on its own, everything is visible, the page is complete.
- Canvases must not swallow the page scroll: `touch-action: pan-y`, and never `preventDefault` on wheel.
- No network at runtime: no font CDNs, no remote images or models. You may download assets at build time from `raw.githubusercontent.com` into `public/<slug>/` (3 MB total at most) and must credit the source and licence in the footer's small line.
- No console errors or warnings of your own.

## 6. 3D notes (learned the hard way)

- Read the scroll from the `scroll` store inside `useFrame`; never drive a scene with React state per frame.
- A `ShaderMaterial` under `<EffectComposer>` must output linear colour: convert your sRGB constants with `pow(c, vec3(2.2))`.
- three here is r187: `PCFSoftShadowMap` is gone, use `shadows={{ type: THREE.PCFShadowMap }}`.
- Bloom can flash white from a single hot pixel. Keep `luminanceThreshold` at 0.9 or more, and do not combine Bloom with `MeshReflectorMaterial`.
- `dpr={[1, 1.6]}`; lighten the scene on phones (`isPhone()`).
- The test browser renders in software, so 3D frames are slow there: wait 12 seconds before the first screenshot. That says nothing about real speed; still keep draw calls and overdraw sane.

## 7. The bar

The last round was called "mid" and "AI slop" where a version was a tidy layout with one borrowed effect. Do not ship that. Before you finish, your version must have:

1. **A first screen that lands in three seconds**: one unmistakable idea, visible without scrolling, that could not belong to any other site.
2. **At least four distinct things that happen**: scroll set-pieces, things to drag, press, type or throw, state that changes. One effect repeated six times does not count.
3. **A reason in debate or in the team's own words for the idea.** If the concept would fit a coffee shop equally well, push it until it would not.
4. **Its own typography and colour**, chosen for the idea. No purple-to-blue gradients, no glass cards, no dashboard tiles, no generic "hero, three features, call to action".
5. **Detail at the edges**: hover and focus states, an authored loading or opening moment, a considered ending, a phone layout that was designed and not just stacked.
6. **Depth over breadth**: finish one idea completely before adding a second.

Spend your effort in that order. When you think you are done, look at your own screenshots and ask what a sceptical 16-year-old would say, then fix that.

## 8. Verify before you finish (required)

```
bash test/serve.sh                                   # the shared dev server on 127.0.0.1:5173
bash test/tscheck.sh <slug>                          # type errors in your folder only
node test/shot.mjs /<slug> --first 9000 --wait 1800  # six stops down the page, desktop; prints a JSON line with the image path
node test/shot.mjs /<slug> --w 390 --h 844 --first 9000 --wait 1800   # phone
node test/check.mjs /<slug>                          # console errors, axe, reduced motion, phone overflow, copy rules
```

`shot.mjs` options: `--at 0,0.2,0.5,1` (scroll fractions) or `--px 0,800` (pixels), `--cols 3 --tw 640` (contact-sheet layout), `--tag name`, `--reduced`, `--hover x,y`, `--eval "js to run first"`, `--clip x,y,w,h`. Open the image it writes and actually look at it, on desktop and on phone, and fix what you see. Do at least two look-and-fix rounds. `check.mjs` must come back with empty `axe`, `errors`, `links`, `copy` and `reduced.invisible`, and `phone.sw` equal to 390.

Your final message is a short report: what the version is, what happens in it, what you could not finish, and anything you are unsure of. Be honest; a reviewer will check it against the screenshots.
