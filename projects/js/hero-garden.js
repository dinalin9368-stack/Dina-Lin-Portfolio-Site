// Loops the hero-panel garden illustration: a 72-frame PNG sequence (transparent,
// 2940 x 1912) exported from After Effects, played at 24fps (3s) then held for a
// 2s pause before replaying from the first frame.
const panel = document.querySelector('.hero-panel');
const canvas = document.getElementById('heroGardenCanvas');
const introLin = document.querySelector('.intro-lin');

if (panel && canvas) {
  const ctx = canvas.getContext('2d');

  const FRAME_COUNT = 72;
  const FPS = 24;
  const PAUSE_SECONDS = 2;
  const CYCLE_SECONDS = FRAME_COUNT / FPS + PAUSE_SECONDS;
  const FRAME_W = 2940;
  const FRAME_H = 1912;
  // Lowest visible pixel row across every frame (fence/leaves sit here; only the
  // tulip heads sway above it) -- used to line the artwork up with the text.
  const CONTENT_BOTTOM_FRAC = 1675 / FRAME_H;

  const frameUrl = (i) => `/projects/assets/home/garden/garden-${String(i).padStart(3, '0')}.png`;

  let frames = new Array(FRAME_COUNT).fill(null);
  let ready = false;
  let visible = false;
  let raf = null;
  let decodeRun = 0;
  let drawScale = 1, drawOffsetX = 0, drawOffsetY = 0;

  const loadImage = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });

  function layout() {
    const cssWidth = canvas.clientWidth || panel.clientWidth;
    const cssHeight = canvas.clientHeight || panel.clientHeight;
    // The panel is fit by height, so cap the backing resolution against the
    // frames' native height -- going higher would just upscale and blur them.
    const dpr = Math.min(window.devicePixelRatio || 1, FRAME_H / Math.max(cssHeight, 1));
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    drawScale = Math.min(canvas.width / FRAME_W, canvas.height / FRAME_H);
    drawOffsetX = (canvas.width - FRAME_W * drawScale) / 2;
    drawOffsetY = (canvas.height - FRAME_H * drawScale) / 2;

    if (introLin) {
      const linBottom = introLin.getBoundingClientRect().bottom;
      const canvasRect = canvas.getBoundingClientRect();
      const backingPerCssPx = canvasRect.height ? canvas.height / canvasRect.height : 1;
      const targetBottom = (linBottom - canvasRect.top) * backingPerCssPx;
      drawOffsetY = targetBottom - FRAME_H * drawScale * CONTENT_BOTTOM_FRAC;
    }
  }

  async function decodeFrames() {
    const run = ++decodeRun;
    ready = false;
    layout();

    const next = new Array(FRAME_COUNT).fill(null);
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = await loadImage(frameUrl(i));
      if (run !== decodeRun) return;
      try {
        next[i] = await createImageBitmap(img, {
          resizeWidth: Math.round(FRAME_W * drawScale),
          resizeHeight: Math.round(FRAME_H * drawScale),
          resizeQuality: 'high',
        });
      } catch (err) {
        next[i] = img;
      }
      if (i === 0) {
        frames = next;
        draw(0);
      }
    }
    if (run !== decodeRun) return;
    frames = next;
    ready = true;
    if (visible) start();
  }

  function draw(index) {
    const frame = frames[index];
    if (!frame) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frame, drawOffsetX, drawOffsetY, FRAME_W * drawScale, FRAME_H * drawScale);
  }

  function start() {
    if (raf || !ready) return;
    const t0 = performance.now();
    const step = (now) => {
      const t = ((now - t0) / 1000) % CYCLE_SECONDS;
      const index = Math.min(Math.floor(t * FPS), FRAME_COUNT - 1);
      draw(index);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
  }, { threshold: 0 }).observe(panel);

  decodeFrames();

  let resizeTimer = null;
  const relayout = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(decodeFrames, 250);
  };
  window.addEventListener('resize', relayout);
  window.addEventListener('pagescale', relayout);
}
