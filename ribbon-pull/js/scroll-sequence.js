function initScrollSequence({ canvasId, folder, frameCount, getScrollStart, scrollDistance }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = canvas.width;
  const displayHeight = canvas.height;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  let currentFrame = -1;

  // The backing store follows the on-screen size, capped at 2x because the frames have no more detail than that.
  const sizeBackingStore = () => {
    const ratio = Math.min(dpr * (window.pageScale || 1), 2);
    canvas.width = Math.round(displayWidth * ratio);
    canvas.height = Math.round(displayHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    currentFrame = -1;
  };
  sizeBackingStore();

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

    let resizeTimer = null;
    window.addEventListener('pagescale', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        sizeBackingStore();
        update();
      }, 60);
    });
  });
}
