const hero = document.querySelector('.hero-panel');

if (hero) {
  // land on the hero video; layout position (ignores the entrance slide), converted to on-screen pixels
  const heroBottom = (hero.offsetTop + hero.offsetHeight) * (window.pageScale || 1);
  window.scrollTo(0, heroBottom - window.innerHeight);
}
