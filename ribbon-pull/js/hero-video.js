const heroPanel = document.querySelector('.hero-panel');
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
      heroVideo.play().catch(() => {});
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
