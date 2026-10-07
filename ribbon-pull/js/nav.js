const nav = document.querySelector('.nav');

if (heroPanel) {
  // layout position (ignores the entrance slide), converted to on-screen pixels
  const heroBottom = (heroPanel.offsetTop + heroPanel.offsetHeight) * (window.pageScale || 1);
  window.scrollTo(0, heroBottom - window.innerHeight);
}

if (nav && heroPanel) {
  // Bottom of the logo (top 60px + 45px height) in design pixels; the nav expands before the video reaches it.
  const navContentBottom = 105;

  const updateNavCompact = () => {
    const cutoff = navContentBottom * (window.pageScale || 1);
    nav.classList.toggle('nav-compact', heroPanel.getBoundingClientRect().top > cutoff);
  };
  updateNavCompact();
  window.addEventListener('scroll', updateNavCompact, { passive: true });
  window.addEventListener('resize', updateNavCompact);
  window.addEventListener('pagescale', updateNavCompact);
}
