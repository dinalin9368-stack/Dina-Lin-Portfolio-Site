// Plays a transparent frame sequence while the circle is hovered, and plays it backwards from the current frame on leave.
function initRingHover({ circleSelector, canvasId, folder, frameCount, duration }) {
  const circle = document.querySelector(circleSelector);
  const canvas = document.getElementById(canvasId);
  if (!circle || !canvas) return;

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
  for (let i = 1; i <= frameCount; i++) {
    const img = new Image();
    img.src = `assets/home/${folder}/frame-${String(i).padStart(3, '0')}.png`;
    frames.push(img);
  }

  const lastFrame = frameCount - 1;
  let position = 0;
  let target = 0;
  let drawnFrame = -1;
  let lastTime = null;
  let rafId = null;

  const draw = () => {
    const index = Math.round(position);
    const img = frames[index];
    if (index === drawnFrame || !img.complete || !img.naturalWidth) return;
    drawnFrame = index;
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
  };

  const tick = (now) => {
    const dt = lastTime === null ? 0 : (now - lastTime) / 1000;
    lastTime = now;
    const step = (lastFrame / duration) * dt;
    position = position < target
      ? Math.min(target, position + step)
      : Math.max(target, position - step);
    draw();
    if (position === target) {
      rafId = null;
      lastTime = null;
      return;
    }
    rafId = requestAnimationFrame(tick);
  };

  const playTo = (value) => {
    target = value;
    if (rafId === null) rafId = requestAnimationFrame(tick);
  };

  circle.addEventListener('mouseenter', () => playTo(lastFrame));
  circle.addEventListener('mouseleave', () => playTo(0));
}

initRingHover({
  circleSelector: '.circle-bouqs',
  canvasId: 'bouqsRingsCanvas',
  folder: 'bouqs-hover-frames',
  frameCount: 45,
  duration: 0.75,
});

initRingHover({
  circleSelector: '.circle-alaska',
  canvasId: 'alaskaRingsCanvas',
  folder: 'alaska-hover-frames',
  frameCount: 45,
  duration: 0.75,
});

initRingHover({
  circleSelector: '.circle-homealone',
  canvasId: 'homealoneRingsCanvas',
  folder: 'homealone-hover-frames',
  frameCount: 45,
  duration: 0.75,
});
