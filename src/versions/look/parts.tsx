// Small drawings that are not the main pair.

/** A tiny narrowed eye with one brow up, for hints. */
export function Squint() {
  return (
    <svg className="squint" viewBox="0 0 64 40" aria-hidden="true">
      <path d="M 10 8 Q 32 -2 54 6" className="q-b" />
      <path d="M 6 26 C 18 14 46 14 58 26 C 46 36 18 36 6 26 Z" className="q-w" />
      <circle cx="38" cy="26" r="6" className="q-p" />
      <path d="M 6 26 C 18 18 46 18 58 26" className="q-l" />
    </svg>
  );
}
