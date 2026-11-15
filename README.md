# Skeptical, draft 2

Twelve drafts of the [Skeptical](https://skeptical.pages.dev) site in one app, one route each. A design lab, not deployed.

| Route | Version | What it is |
| --- | --- | --- |
| `/head` | The head | The "Laocoön, Bronze and Time" prompt rebuilt as Skeptical, around the live site's own head: the same photograph, dither veil and censor bar. The pointer uncovers the photograph; the scroll spreads the question marks over the head. (`/head-3d` keeps the earlier 3D scan.) |
| `/statue` | The statue | The prompt's bronze horse in a dark gallery: one volumetric light, a reflecting floor, dust in the beam, drained to black and off-white. |
| `/question` | The question | A glass question mark that refracts the headings behind it. At Join the hook leaves and the dot becomes the full stop. |
| `/flow` | The flow | The site as a flow sheet. The opening is pinned and the round plays out as you scroll. |
| `/cards` | The cards | The site as a speech doc. The first card is cut in front of you; then the highlighter, the reading speed and Shrink are yours. |
| `/ladder` | The ladder | Sextus's ladder: night, a bank of cloud, sunrise, and then the ladder goes. |
| `/blocks` | The blocks | A four-colour poster in one variable typeface, with a physics pit at the bottom. |
| `/board` | The board | A split-flap postings board with a live clock and a globe pinned on the one tournament so far. |
| `/badge` | The badge | A tournament badge on a lanyard you can grab and swing; its faces are drawn in the browser. |
| `/terminal` | The terminal | The site as a command line, with history and on-screen keys. |
| `/spread` | The spread | A speed reader: the whole site one word at a time, over a night road that keeps pace. |
| `/bento` | The bento | Everything in one grid of tiles, with counting numbers, a pointer light and the same globe. |

`[` and `]` step between versions. Route changes play an ordered-dither cover.

## Run it

    npm install
    npm run dev

Then open http://localhost:5173. On a Mac, double-clicking `start.command` does all of that and also fetches the bronze horse once.

## Stack

Vite, React 19, TypeScript. React Three Fiber, drei and postprocessing for the 3D. GSAP (ScrollTrigger, SplitText, DrawSVG) on a Lenis smooth scroll. Tailwind 4 with shadcn/ui components (Accordion, Button, Slider, Switch, ToggleGroup, Tooltip, Kbd). rough-notation for the pen marks, matter.js for the pit, cobe for the globe, and React Bits components (Magnet, VariableProximity, SplitFlapText, Lanyard, FaultyTerminal, Hyperspeed, CountUp, and the live site's own DitherVeil).

## Where things are

- `src/content.ts`: every word on every version. It mirrors the live site's `content.ts`; nothing is invented.
- `src/lib`: smooth scroll, text reveals, the per-version setup hook.
- `src/components`: the page transition, the version switcher, the loader, shadcn components, shared 3D pieces.
- `src/versions/*`: one folder per version.
- `PRODUCT.md`: the rules every version follows.

## Credits

- Head: the live site's photograph (Unsplash licence), veil and censor. The 3D scan at `/head-3d` is the Lee Perry-Smith head by Infinite Realities, CC BY 3.0, as shipped with three.js.
- Horse: "Bronze Horse" by Moshe Caine on Sketchfab, CC BY 4.0. Loaded from a local copy if `start.command` fetched one, otherwise from the address in the prompt. If neither answers, the Stanford "Lucy" scan stands in.
- Cloud texture from pmndrs/drei-assets. Fonts via Fontsource, all open licences.
- React Bits components are MIT + Commons Clause: fine to use in a site, not to resell as components.
