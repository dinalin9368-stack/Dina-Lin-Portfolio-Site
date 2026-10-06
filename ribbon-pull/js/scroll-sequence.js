function initScrollSequence({ canvasId, folder, frameCount, getScrollStart, scrollDistance }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = canvas.width;
  const displayHeight = canvas.height;
  canvas.width = displayWidth * dpr;
  canvas.height = displayHeight * dpr;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
  ctx.scale(dpr, dpr);

  const frames = [];
  const loadPromises = [];
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    loadPromises.push(new Promise((resolve) => {
      img.addEventListener('load', resolve);
      img.addEventListener('error', resolve);
    }));
    img.src = `assets/home/${folder}/frame-${String(i).padStart(3, '0')}.png`;
    frames.push(img);
  }

  let currentFrame = -1;
  const drawFrame = (index) => {
    if (index === currentFrame) return;
    currentFrame = index;
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.drawImage(frames[index], 0, 0, displayWidth, displayHeight);
  };

  const update = () => {
    const distance = typeof scrollDistance === 'function' ? scrollDistance() : scrollDistance;
    const progress = (window.scrollY - getScrollStart()) / Math.max(1, distance);
    const clamped = Math.min(1, Math.max(0, progress));
    drawFrame(Math.round(clamped * (frameCount - 1)));
  };

  Promise.all(loadPromises).then(() => {
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
  });
}
