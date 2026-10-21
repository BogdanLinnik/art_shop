/**
 * Back-to-top links in the Arette footer. The page scrolls inside `.page-wrapper` on this theme
 * (with `window` as the fallback), and the sticky header means an in-page anchor to the top never
 * moves anything, so scroll both containers explicitly.
 */
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('click', (event) => {
  const link = event.target instanceof Element ? event.target.closest('[data-arette-back-to-top]') : null;
  if (!link) return;

  event.preventDefault();

  const options = { top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' };
  document.querySelector('.page-wrapper')?.scrollTo(options);
  window.scrollTo(options);
});
