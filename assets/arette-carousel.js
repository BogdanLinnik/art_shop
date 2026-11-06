/**
 * "Other tequilas" carousel: a native scroll-snap row made infinite by cloning the cards at both ends
 * and jumping back to the real cards as soon as scrolling settles on a clone. Clones are interactive (they can
 * be visible next to real cards) but are skipped by the keyboard and screen readers.
 * - Desktop shows three cards and arrow buttons; mobile shows one card with dots.
 * - It auto-advances on a timer at every width. It pauses while the visitor touches, hovers or focuses
 *   the carousel or while the page is hidden, and never runs with reduced motion.
 * - With no more cards than fit on screen the carousel is not made infinite and the arrows stay hidden.
 * - With `data-arette-mobile-only` on the root the carousel only exists on mobile: from 750px up the row is left
 *   alone (no clones, no auto-advance), so the section can show an ordinary grid there.
 */
const MOBILE_QUERY = '(max-width: 749px)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SETTLE_DELAY = 60;

/** @type {Map<Element, AbortController>} */
const instances = new Map();

/**
 * @param {HTMLElement} root
 */
const setup = (root) => {
  instances.get(root)?.abort();

  const controller = new AbortController();
  const { signal } = controller;
  instances.set(root, controller);

  const track = root.querySelector('[data-arette-carousel-track]');
  if (!(track instanceof HTMLElement)) return;

  const realSlides = [...track.querySelectorAll('[data-arette-carousel-slide]:not([data-clone])')].filter(
    (el) => el instanceof HTMLElement
  );
  const count = realSlides.length;
  const dots = [...root.querySelectorAll('[data-arette-carousel-dot]')];
  const prev = root.querySelector('[data-arette-carousel-prev]');
  const next = root.querySelector('[data-arette-carousel-next]');

  const mobile = window.matchMedia(MOBILE_QUERY);
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  const interval = Math.max(3, Number(root.dataset.interval) || 10) * 1000;
  const mobileOnly = root.hasAttribute('data-arette-mobile-only');
  const active = () => !mobileOnly || mobile.matches;

  /** Cards that fit on screen at once. */
  let visible = mobile.matches ? 1 : 3;
  let infinite = false;
  /** @type {HTMLElement[]} */
  let items = [...realSlides];
  let interacting = false;
  /** @type {number | undefined} */
  let autoTimer;
  /** @type {number | undefined} */
  let settleTimer;

  const behavior = () => (reducedMotion.matches ? 'auto' : 'smooth');
  // The row has inline padding on desktop (room for the card shadow); cards snap to the padding edge.
  const positionOf = (item) => item.offsetLeft - track.offsetLeft - (parseFloat(getComputedStyle(track).paddingInlineStart) || 0);

  /** Moves without animation or snapping, then restores snapping. */
  const jumpTo = (item) => {
    track.style.scrollSnapType = 'none';
    track.style.scrollBehavior = 'auto';
    track.scrollLeft = positionOf(item);
    window.requestAnimationFrame(() => {
      track.style.scrollSnapType = '';
      track.style.scrollBehavior = '';
    });
  };

  const removeClones = () => track.querySelectorAll('[data-clone]').forEach((clone) => clone.remove());

  /**
   * @param {HTMLElement} slide
   */
  const makeClone = (slide) => {
    const clone = /** @type {HTMLElement} */ (slide.cloneNode(true));
    clone.removeAttribute('data-arette-carousel-slide');
    clone.setAttribute('data-clone', '');
    clone.setAttribute('aria-hidden', 'true');
    // Clones stay clickable and hoverable, because after a jump the last visible cards can be clones, but
    // they are taken out of the tab order and hidden from assistive technology.
    clone.querySelectorAll('a, button, input, select, textarea, summary, [tabindex]').forEach((el) => {
      el.setAttribute('tabindex', '-1');
    });
    // Clones must not duplicate ids (forms, labels) that the real cards own.
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    return clone;
  };

  const build = () => {
    removeClones();
    visible = mobile.matches ? 1 : 3;
    infinite = active() && count > visible;
    root.dataset.aretteInfinite = String(infinite);
    items = [...realSlides];

    if (!infinite) {
      track.scrollLeft = 0;
      return;
    }

    const front = realSlides.slice(count - visible).map(makeClone);
    const back = realSlides.slice(0, visible).map(makeClone);
    track.prepend(...front);
    track.append(...back);
    items = [...front, ...realSlides, ...back];
    jumpTo(items[visible]);
  };

  const nearestIndex = () => {
    let best = 0;
    let bestDistance = Infinity;
    items.forEach((item, i) => {
      const distance = Math.abs(positionOf(item) - track.scrollLeft);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  };

  const realIndex = (index) => (((index - (infinite ? visible : 0)) % count) + count) % count;

  const markCurrent = (index) => {
    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  };

  /** Leaves a clone for the matching real card (the two look identical, so nothing visibly moves). */
  const leaveClone = () => {
    if (!infinite) return;

    const index = nearestIndex();
    if (index < visible) jumpTo(items[index + count]);
    else if (index >= visible + count) jumpTo(items[index - count]);
  };

  /** Called once scrolling stops. */
  const settle = () => {
    markCurrent(realIndex(nearestIndex()));
    leaveClone();
  };

  const step = () => (items.length > 1 ? positionOf(items[1]) - positionOf(items[0]) : track.clientWidth);

  const move = (direction) => {
    // A move that starts while resting on a clone would run out of cards, so leave the clone first.
    leaveClone();
    track.scrollBy({ left: direction * step(), behavior: behavior() });
  };

  const goToReal = (index) => {
    const target = items[(infinite ? visible : 0) + index];
    if (target) track.scrollTo({ left: positionOf(target), behavior: behavior() });
  };

  const stopAuto = () => window.clearInterval(autoTimer);

  const startAuto = () => {
    stopAuto();
    if (!active() || reducedMotion.matches || interacting || document.hidden || count < 2) return;

    autoTimer = window.setInterval(() => move(1), interval);
  };

  // The dots follow the scroll position live; jumping off a clone waits until scrolling settles.
  let frame = 0;
  track.addEventListener(
    'scroll',
    () => {
      if (!frame) {
        frame = window.requestAnimationFrame(() => {
          frame = 0;
          markCurrent(realIndex(nearestIndex()));
        });
      }

      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, SETTLE_DELAY);
    },
    { signal, passive: true }
  );

  // A new gesture that begins while the row rests on a clone must start from the real card, otherwise the
  // jump back would interrupt it and the first swipe after wrapping around would seem to do nothing.
  for (const type of ['touchstart', 'pointerdown', 'wheel']) {
    track.addEventListener(type, leaveClone, { signal, passive: true });
  }
  track.addEventListener('scrollend', settle, { signal });

  prev?.addEventListener('click', () => move(-1), { signal });
  next?.addEventListener('click', () => move(1), { signal });

  dots.forEach((dot, index) => {
    dot.addEventListener(
      'click',
      () => {
        goToReal(index);
        startAuto();
      },
      { signal }
    );
  });

  const setInteracting = (value) => () => {
    interacting = value;
    startAuto();
  };

  root.addEventListener('pointerenter', setInteracting(true), { signal });
  root.addEventListener('pointerleave', setInteracting(false), { signal });
  root.addEventListener('focusin', setInteracting(true), { signal });
  root.addEventListener('focusout', setInteracting(false), { signal });
  root.addEventListener('touchstart', setInteracting(true), { signal, passive: true });
  root.addEventListener('touchend', () => window.setTimeout(setInteracting(false), interval), { signal, passive: true });

  document.addEventListener('visibilitychange', startAuto, { signal });
  reducedMotion.addEventListener('change', startAuto, { signal });
  mobile.addEventListener(
    'change',
    () => {
      build();
      markCurrent(0);
      startAuto();
    },
    { signal }
  );

  // Keep the current card aligned when the layout width changes.
  let lastWidth = track.clientWidth;
  const resizeObserver = new ResizeObserver(() => {
    if (track.clientWidth === lastWidth) return;
    lastWidth = track.clientWidth;
    jumpTo(items[nearestIndex()]);
  });
  resizeObserver.observe(track);

  signal.addEventListener('abort', () => {
    stopAuto();
    window.clearTimeout(settleTimer);
    window.cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    removeClones();
    delete root.dataset.aretteInfinite;
  });

  build();
  startAuto();
};

const scan = () => {
  document.querySelectorAll('[data-arette-carousel]').forEach((root) => {
    if (root instanceof HTMLElement) setup(root);
  });
};

scan();
document.addEventListener('shopify:section:load', scan);
