'use client';
import { useEffect } from 'react';
import { useA11y, useLang } from '../contexts/providers';

/* ============================================================
   ReadingAids — global reading helpers, mounted once in layout.
   1. Bionic Reading: bolds the first ~40% of every word so the
      eye has a fixation anchor (helps ADHD/dyslexia focus).
   2. Text-to-Speech: click any paragraph/heading to hear it.

   Bionic reading uses the CSS Custom Highlight API (Range-based
   styling) instead of splitting text nodes into <b>/<span> wrappers.
   An earlier version restructured the DOM directly, which raced
   with React's own reconciliation and crashed navigation on
   dynamic pages (removeChild "not a child of this node") — Ranges
   just point at existing text and never touch the tree, so React
   can re-render or remove those nodes freely.
============================================================ */

// Elements whose text must never be highlighted (form controls, code, opt-outs).
// Note: <button> is intentionally NOT skipped — this app renders substantial
// readable content (task titles, descriptions) inside clickable <button>
// cards (e.g. TaskGraph's quest nodes), not just short action labels.
const BIONIC_SKIP =
  'script,style,noscript,input,textarea,select,code,pre,svg,[contenteditable="true"],[data-no-bionic]';

function fixationLength(len: number): number {
  if (len <= 3) return 1;
  return Math.ceil(len * 0.4);
}

function supportsHighlightApi(): boolean {
  return typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';
}

const HIGHLIGHT_STYLE_ID = 'bionic-highlight-style';

// Injected as a real <style> tag (parsed by the browser's own CSS engine)
// rather than shipped through globals.css — Turbopack's CSS parser
// (lightningcss) doesn't recognize ::highlight() yet and hard-fails the
// whole stylesheet build if the rule appears in a bundled file.
//
// `::highlight()` only paints a small allow-listed set of properties —
// font-weight and -webkit-text-stroke are silently no-ops (confirmed
// empirically: the Highlight registers fine, nothing renders). text-shadow
// IS painted, so a 4-direction shadow is used as a "fake bold" that
// thickens strokes without changing text-weight/layout metrics.
function ensureHighlightStyle() {
  if (document.getElementById(HIGHLIGHT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = HIGHLIGHT_STYLE_ID;
  style.textContent =
    '::highlight(bionic) { text-shadow: 0.3px 0 currentColor, -0.3px 0 currentColor, 0 0.3px currentColor, 0 -0.3px currentColor; }';
  document.head.appendChild(style);
}

function collectBionicRanges(root: HTMLElement): Range[] {
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !/[\p{L}\p{M}]{2,}/u.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
      const parent = n.parentElement;
      if (!parent || parent.closest(BIONIC_SKIP)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue ?? '';
    for (const m of text.matchAll(/[\p{L}\p{M}]+/gu)) {
      const word = m[0];
      if (word.length < 2) continue;
      const start = m.index ?? 0;
      const range = new Range();
      range.setStart(node, start);
      range.setEnd(node, start + fixationLength(word.length));
      ranges.push(range);
    }
  }
  return ranges;
}

function applyBionic(root: HTMLElement) {
  if (!supportsHighlightApi()) return;
  CSS.highlights.set('bionic', new Highlight(...collectBionicRanges(root)));
}

function removeBionic() {
  if (!supportsHighlightApi()) return;
  CSS.highlights.delete('bionic');
}

// Blocks worth reading aloud on click
const TTS_TARGETS = 'p,h1,h2,h3,h4,h5,h6,li,blockquote,td,th,dt,dd,figcaption,[data-tts]';
// Clicks that must keep their normal behavior instead of speaking
const TTS_IGNORE = 'a,button,input,textarea,select,label,[role="switch"],[role="button"],[data-no-tts]';

export default function ReadingAids() {
  const { bionic, tts } = useA11y();
  const { lang } = useLang();

  /* ---------- Bionic Reading ---------- */
  useEffect(() => {
    if (!bionic || !supportsHighlightApi()) return;
    ensureHighlightStyle();
    const root = document.body;
    let raf = 0;
    const run = () => applyBionic(root);
    run();
    // Re-compute ranges after React re-renders — Highlight ranges don't
    // mutate the DOM, so observing does not re-trigger itself.
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(run);
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      removeBionic();
    };
  }, [bionic]);

  /* ---------- Text-to-Speech ---------- */
  useEffect(() => {
    if (!tts || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    let current: HTMLElement | null = null;

    const stop = () => {
      synth.cancel();
      current?.classList.remove('tts-speaking');
      current = null;
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || target.closest(TTS_IGNORE)) return;
      const el = target.closest(TTS_TARGETS) as HTMLElement | null;
      if (!el) return;
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      if (current === el) { stop(); return; } // click again to stop
      stop();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang === 'id' ? 'id-ID' : 'en-US';
      utter.rate = 0.95;
      utter.onend = stop;
      utter.onerror = stop;
      current = el;
      el.classList.add('tts-speaking');
      synth.speak(utter);
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') stop(); };

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      stop();
    };
  }, [tts, lang]);

  return null;
}
