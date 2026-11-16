// The numerals: each digit in its own fixed box with a strip that rolls, so nothing ever jumps sideways.
import { forwardRef } from 'react';

const strip = (base: number) => [...Array.from({ length: base }, (_, k) => k), 0];

export const Digits = forwardRef<HTMLSpanElement, { small?: boolean }>(function Digits({ small }, ref) {
  return (
    <span ref={ref} className={`cl-digits${small ? ' is-small' : ''}`} aria-hidden="true">
      <span className="cl-d" data-u="m"><span className="cl-strip">{strip(10).map((n, k) => <span key={k}>{n}</span>)}</span></span>
      <span className="cl-colon">:</span>
      <span className="cl-d" data-u="t"><span className="cl-strip">{strip(6).map((n, k) => <span key={k}>{n}</span>)}</span></span>
      <span className="cl-d" data-u="o"><span className="cl-strip">{strip(10).map((n, k) => <span key={k}>{n}</span>)}</span></span>
    </span>
  );
});

/** Continuous odometer: each digit rolls only while the digits below it pass through their last unit. */
function digitPos(pos: number, unit: number, base: number) {
  const r = ((pos % unit) + unit) % unit;
  const v = Math.floor(pos / unit) + Math.min(1, Math.max(0, r - (unit - 1)));
  return ((v % base) + base) % base;
}

export function setDigits(el: HTMLElement, pos: number) {
  const strips = el.querySelectorAll<HTMLElement>('.cl-strip');
  const sec = ((pos % 60) + 60) % 60;
  const m = digitPos(pos, 60, 10);
  const t = digitPos(sec, 10, 6);
  const o = ((pos % 10) + 10) % 10;
  strips[0].style.transform = `translateY(${(-m * 100 / 11).toFixed(3)}%)`;
  strips[1].style.transform = `translateY(${(-t * 100 / 7).toFixed(3)}%)`;
  strips[2].style.transform = `translateY(${(-o * 100 / 11).toFixed(3)}%)`;
}
