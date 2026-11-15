# Skeptical, draft 2

Seven drafts of the [Skeptical](https://skeptical.pages.dev) site in one app, one route each. A design lab, not deployed.

| Route | Version | What it is |
| --- | --- | --- |
| `/head` | The head | The "Laocoön, Bronze and Time" prompt rebuilt as Skeptical. A chrome head you orbit once as you scroll, dithered in a post-processing pass, eyes covered by the question-mark bar. Move the pointer over it and the dither wipes off for a moment. |
| `/statue` | The statue | The prompt's bronze horse in a dark gallery: one volumetric light, a reflecting floor, dust in the beam, drained to black and off-white. |
| `/question` | The question | A glass question mark that refracts the headings behind it. At Join the hook leaves and the dot becomes the full stop. |
| `/flow` | The flow | The site as a flow sheet. The opening is pinned and the round plays out as you scroll. |
| `/cards` | The cards | The site as a speech doc. The first card is cut in front of you; then the highlighter, the reading speed and Shrink are yours. |
| `/ladder` | The ladder | Sextus's ladder: night, a bank of cloud, sunrise, and then the ladder goes. |
| `/blocks` | The blocks | A four-colour poster in one variable typeface, with a physics pit at the bottom. |

`[` and `]` step between versions. Route changes play an ordered-dither cover.

## Run it

    npm install
    npm run dev

Then open http://localhost:5173. On a Mac, double-clicking `start.command` does all of that and also fetches the bronze horse once.

## Stack

Vite, React 19, TypeScript. React Three Fiber, drei and postprocessing for the 3D. GSAP (ScrollTrigger, SplitText, DrawSVG) on a Lenis smooth scroll. Tailwind 4 with shadcn/ui components (Accordion, Button, Slider, Switch, ToggleGroup, Tooltip, Kbd). rough-notation for the pen marks, matter.js for the pit, two components from React Bits (Magnet, VariableProximity).

## Where things are

- `src/content.ts`: every word on every version. It mirrors the live site's `content.ts`; nothing is invented.
- `src/lib`: smooth scroll, text reveals, the per-version setup hook.
- `src/components`: the page transition, the version switcher, the loader, shadcn components, shared 3D pieces.
- `src/versions/*`: one folder per version.
- `PRODUCT.md`: the rules every version follows.

## Credits

- Head: Lee Perry-Smith scan by Infinite Realities, CC BY 3.0, as shipped with three.js. A stand-in: the live site's head is a photograph and cannot be orbited.
- Horse: "Bronze Horse" by Moshe Caine on Sketchfab, CC BY 4.0. Loaded from a local copy if `start.command` fetched one, otherwise from the address in the prompt. If neither answers, the Stanford "Lucy" scan stands in.
- Cloud texture from pmndrs/drei-assets. Fonts via Fontsource, all open licences.
- React Bits components are MIT + Commons Clause: fine to use in a site, not to resell as components.
