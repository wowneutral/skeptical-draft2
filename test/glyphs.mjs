// Turn text set in an installed font into outline paths you can extrude in three.js (SVGLoader + ExtrudeGeometry) or draw as SVG.
// usage: node test/glyphs.mjs <font .woff under node_modules> "<text>" <out.json>
//   e.g. node test/glyphs.mjs node_modules/@fontsource/anton/files/anton-latin-400-normal.woff "SKEPTICAL?" src/versions/<slug>/glyphs.json
// Output: { unitsPerEm, ascender, descender, glyphs: [{ ch, d, x, advance }] }  (y grows downward, like SVG; x is the pen position with kerning; font size = 1000 units)
// Use the .woff file, not .woff2. Variable fonts give their default instance.
import opentype from 'opentype.js';
import fs from 'node:fs';
const [file, text, out] = process.argv.slice(2);
const buf = fs.readFileSync(file);
const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
const size = 1000, k = size / font.unitsPerEm;
let x = 0; const glyphs = []; const gs = font.stringToGlyphs(text);
gs.forEach((g, i) => {
  const d = g.getPath(x, 0, size).toPathData(2);
  glyphs.push({ ch: text[i], d, x: Math.round(x), advance: Math.round(g.advanceWidth * k) });
  x += g.advanceWidth * k + (gs[i + 1] ? font.getKerningValue(g, gs[i + 1]) * k : 0);
});
fs.writeFileSync(out, JSON.stringify({ unitsPerEm: size, ascender: Math.round(font.ascender * k), descender: Math.round(font.descender * k), width: Math.round(x), glyphs }));
console.log(`wrote ${out}: ${glyphs.length} glyphs, ${Math.round(x)} units wide`);
