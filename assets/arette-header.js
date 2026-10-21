/**
 * Arette header behaviour.
 * - Keeps `--header-height` and `--header-group-height` current. The Horizon header component
 *   normally owns these values; the Arette header is a plain element, so this mirrors the same measurement.
 * - Sets `data-scrolled` on the header once the page has scrolled a little, so the transparent
 *   header can switch to its solid style. The scroll container is `.page-wrapper` on this theme,
 *   with `window` as the fallback, so scroll events are caught in the capture phase.
 */
const SCROLL_THRESHOLD = 40;

const header = document.querySelector('#header-component');
const headerGroup = document.querySelector('#header-group');

if (header instanceof HTMLElement && headerGroup instanceof HTMLElement) {
  const updateHeights = () => {
    document.body.style.setProperty('--header-height', `${header.offsetHeight}px`);
    document.body.style.setProperty('--header-group-height', `${headerGroup.offsetHeight}px`);
  };

  const updateScrolled = () => {
    const wrapper = document.querySelector('.page-wrapper');
    const offset = Math.max(window.scrollY, wrapper instanceof HTMLElement ? wrapper.scrollTop : 0);

    header.toggleAttribute('data-scrolled', offset > SCROLL_THRESHOLD);
  };

  updateHeights();
  updateScrolled();

  new ResizeObserver(updateHeights).observe(headerGroup);
  document.addEventListener('scroll', updateScrolled, { capture: true, passive: true });
}

/**
 * Mobile menu: a native modal dialog slides in from the start edge. The dialog handles focus
 * trapping, Escape and focus restoration; this wires the open/close buttons, `aria-expanded`,
 * backdrop clicks and closing when a link inside is followed.
 */
const drawer = document.querySelector('#arette-header-drawer');
const openButton = document.querySelector('[data-arette-menu-open]');

if (drawer instanceof HTMLDialogElement && openButton instanceof HTMLElement) {
  const syncExpanded = () => openButton.setAttribute('aria-expanded', String(drawer.open));

  openButton.addEventListener('click', () => {
    if (!drawer.open) drawer.showModal();
    syncExpanded();
  });

  drawer.addEventListener('close', syncExpanded);

  drawer.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    // A click on the dialog element itself lands on the backdrop only when it is outside the panel.
    const outsidePanel = target === drawer && event.clientX > drawer.getBoundingClientRect().right;

    if (outsidePanel || target.closest('[data-arette-menu-close]') || target.closest('a')) drawer.close();
  });

  window.matchMedia('(min-width: 750px)').addEventListener('change', (event) => {
    if (event.matches && drawer.open) drawer.close();
  });
}
