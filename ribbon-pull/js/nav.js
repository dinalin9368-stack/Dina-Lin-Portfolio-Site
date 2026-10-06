const nav = document.querySelector('.nav');

if (heroPanel) {
  const heroBottom = heroPanel.getBoundingClientRect().bottom + window.scrollY;
  window.scrollTo(0, heroBottom - window.innerHeight);
}

if (nav && heroPanel) {
  // Bottom of the logo (top 60px + 45px height); the nav expands before the video reaches it.
  const navContentBottom = 105;

  const updateNavCompact = () => {
    nav.classList.toggle('nav-compact', heroPanel.getBoundingClientRect().top > navContentBottom);
  };
  updateNavCompact();
  window.addEventListener('scroll', updateNavCompact, { passive: true });
  window.addEventListener('resize', updateNavCompact);
}
