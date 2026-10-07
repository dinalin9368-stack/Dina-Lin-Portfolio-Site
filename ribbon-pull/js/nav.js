const nav = document.querySelector('.nav');

if (heroPanel) {
  const heroBottom = heroPanel.getBoundingClientRect().bottom + window.scrollY;
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
