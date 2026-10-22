/**
 * Mobile auto-advance for the product details photo strip: every 10 seconds the strip scrolls one tile,
 * and returns to the start after the last one. It only runs at mobile widths, never with reduced motion,
 * and pauses while the visitor touches the strip or the page is hidden.
 */
const INTERVAL = 10000;
const mobile = window.matchMedia('(max-width: 749px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** @type {Map<Element, AbortController>} */
const instances = new Map();

/**
 * @param {HTMLElement} strip
 */
const setup = (strip) => {
  instances.get(strip)?.abort();
  const controller = new AbortController();
  const { signal } = controller;
  instances.set(strip, controller);

  let touching = false;
  /** @type {number | undefined} */
  let timer;

  const advance = () => {
    const tile = strip.firstElementChild;
    if (!(tile instanceof HTMLElement)) return;

    const step = tile.getBoundingClientRect().width + (parseFloat(getComputedStyle(strip).columnGap) || 0);
    const atEnd = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
    strip.scrollTo({ left: atEnd ? 0 : strip.scrollLeft + step, behavior: 'smooth' });
  };

  const start = () => {
    window.clearInterval(timer);
    if (!mobile.matches || reducedMotion.matches || touching || document.hidden) return;
    timer = window.setInterval(advance, INTERVAL);
  };

  const touch = (value) => () => {
    touching = value;
    start();
  };

  strip.addEventListener('touchstart', touch(true), { signal, passive: true });
  strip.addEventListener('touchend', () => window.setTimeout(touch(false), INTERVAL), { signal, passive: true });
  document.addEventListener('visibilitychange', start, { signal });
  mobile.addEventListener('change', start, { signal });
  reducedMotion.addEventListener('change', start, { signal });
  signal.addEventListener('abort', () => window.clearInterval(timer));

  start();
};

const scan = () => {
  document.querySelectorAll('[data-arette-auto-scroll]').forEach((strip) => {
    if (strip instanceof HTMLElement) setup(strip);
  });
};

scan();
document.addEventListener('shopify:section:load', scan);
