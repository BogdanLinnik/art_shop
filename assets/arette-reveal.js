/**
 * Fade-in on scroll, matching the parent site: each element inside a `[data-arette-reveal-group]`
 * starts at opacity 0 and fades to 1 (1.5s) with a tiny stagger once its group enters the viewport.
 * Elements are only hidden after this module runs, so nothing stays invisible without JavaScript.
 * Skipped in the theme editor and when the visitor prefers reduced motion.
 */
const BASE_DELAY = 0.35;
const STEP_DELAY = 0.05;

const skipMotion = () =>
  document.documentElement.classList.contains('shopify-design-mode') ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** @type {IntersectionObserver | null} */
let observer = null;

/**
 * @param {Element} group
 */
const revealGroup = (group) => {
  group.querySelectorAll(':scope [data-arette-reveal]').forEach((item, index) => {
    if (!(item instanceof HTMLElement)) return;

    item.style.setProperty('--arette-reveal-delay', `${BASE_DELAY + index * STEP_DELAY}s`);
    item.classList.add('arette-reveal--visible');
  });
};

const scan = () => {
  if (skipMotion()) return;

  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        revealGroup(entry.target);
        observer?.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' }
  );

  document.querySelectorAll('[data-arette-reveal-group]:not([data-arette-reveal-ready])').forEach((group) => {
    group.setAttribute('data-arette-reveal-ready', '');
    group.querySelectorAll(':scope [data-arette-reveal]').forEach((item) => item.classList.add('arette-reveal'));
    observer?.observe(group);
  });
};

scan();
document.addEventListener('shopify:section:load', scan);
