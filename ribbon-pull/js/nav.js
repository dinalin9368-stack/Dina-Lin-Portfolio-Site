const nav = document.querySelector('.nav');
const hero = document.querySelector('.hero-panel');
// the home page tracks its hero video; other pages mark their first block with data-nav-anchor
const navAnchor = hero || document.querySelector('[data-nav-anchor]');

if (hero) {
  // layout position (ignores the entrance slide), converted to on-screen pixels
  const heroBottom = (hero.offsetTop + hero.offsetHeight) * (window.pageScale || 1);
  window.scrollTo(0, heroBottom - window.innerHeight);
}

if (nav && navAnchor) {
  // Bottom of the logo (top 60px + 45px height) in design pixels; the nav expands before the video reaches it.
  const navContentBottom = 105;

  const updateNavCompact = () => {
    const cutoff = navContentBottom * (window.pageScale || 1);
    nav.classList.toggle('nav-compact', navAnchor.getBoundingClientRect().top > cutoff);
  };
  updateNavCompact();
  window.addEventListener('scroll', updateNavCompact, { passive: true });
  window.addEventListener('resize', updateNavCompact);
  window.addEventListener('pagescale', updateNavCompact);
}
