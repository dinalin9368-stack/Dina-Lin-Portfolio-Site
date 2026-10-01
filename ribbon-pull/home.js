const heroVideo = document.querySelector('.hero-panel-video');
const heroPlayBtn = document.getElementById('heroPlayBtn');
const heroMuteBtn = document.getElementById('heroMuteBtn');

let autoMuted = false;

if (heroVideo) {
  heroVideo.play().catch(() => {
    autoMuted = true;
    heroVideo.muted = true;
    heroMuteBtn?.classList.add('is-muted');
    heroVideo.play().catch(() => {});
  });
}

if (heroVideo) {
  const unmuteOnFirstInteraction = () => {
    if (autoMuted) {
      autoMuted = false;
      heroVideo.muted = false;
      heroMuteBtn?.classList.remove('is-muted');
    }
  };
  document.addEventListener('pointerdown', unmuteOnFirstInteraction, { once: true });
  document.addEventListener('keydown', unmuteOnFirstInteraction, { once: true });
}

if (heroVideo && heroPlayBtn && heroMuteBtn) {
  heroPlayBtn.addEventListener('click', () => {
    if (heroVideo.paused) {
      heroVideo.play();
    } else {
      heroVideo.pause();
    }
  });

  heroVideo.addEventListener('play', () => heroPlayBtn.classList.remove('is-paused'));
  heroVideo.addEventListener('pause', () => heroPlayBtn.classList.add('is-paused'));

  heroMuteBtn.addEventListener('click', () => {
    autoMuted = false;
    heroVideo.muted = !heroVideo.muted;
    heroMuteBtn.classList.toggle('is-muted', heroVideo.muted);
  });
}

const nav = document.querySelector('.nav');
const heroPanel = document.querySelector('.hero-panel');

if (heroPanel) {
  const heroBottom = heroPanel.getBoundingClientRect().bottom + window.scrollY;
  window.scrollTo(0, heroBottom - window.innerHeight);
}

if (nav && heroPanel) {
  const updateNavCompact = () => {
    const rect = heroPanel.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    nav.classList.toggle('nav-compact', midpoint > 0);
  };
  updateNavCompact();
  window.addEventListener('scroll', updateNavCompact, { passive: true });
  window.addEventListener('resize', updateNavCompact);
}

if (heroVideo && heroPanel) {
  let autoPaused = false;

  const heroPauseObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting && !heroVideo.paused) {
        autoPaused = true;
        heroVideo.pause();
      } else if (entry.isIntersecting && autoPaused) {
        autoPaused = false;
        heroVideo.play().catch(() => {});
      }
    });
  }, { threshold: 0 });
  heroPauseObserver.observe(heroPanel);

  heroPlayBtn?.addEventListener('click', () => {
    autoPaused = false;
  });
}

const backToTop = document.getElementById('backToTop');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    backToTop.classList.toggle('visible', entry.isIntersecting);
  });
}, { threshold: 0.2 });

observer.observe(backToTop);

backToTop.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
