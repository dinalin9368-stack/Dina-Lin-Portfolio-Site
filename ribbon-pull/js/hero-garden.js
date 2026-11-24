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
  // Highest visible pixel row (the tulip tips) -- the wind-bend tapers from full
  // strength there down to nothing at the fence line, so the ground stays put.
  const CONTENT_TOP_FRAC = 1052 / FRAME_H;

  // Cursor-driven "gust": a swipe over the garden kicks a damped spring, which
  // leans the plants over and lets them spring back -- no extra art needed.
  const WIND_STIFFNESS = 70;   // spring pulling the lean back to upright, per second^2
  const WIND_DAMPING = 9;      // slightly underdamped, so it settles with one soft wobble
  const WIND_KICK = 0.5;       // how strongly swipe speed (css px/s) feeds the spring
  const WIND_MAX = 36;         // clamp on lean at the tulip tips, in css px
  const WIND_STRIPS = 48;

  const frameUrl = (i) => `assets/home/garden/garden-${String(i).padStart(3, '0')}.png`;

  let frames = new Array(FRAME_COUNT).fill(null);
  let ready = false;
  let visible = false;
  let raf = null;
  let decodeRun = 0;
  let drawScale = 1, drawOffsetX = 0, drawOffsetY = 0;
  let backingPerCssPx = 1;
  let windX = 0, windVel = 0, lastStepTime = null;
  let lastPointerX = null, lastPointerTime = null;

  panel.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (lastPointerX !== null && lastPointerTime !== null) {
      const dt = (now - lastPointerTime) / 1000;
      if (dt > 0 && dt < 0.2) {
        const speed = (e.clientX - lastPointerX) / dt; // css px/s
        windVel += speed * WIND_KICK;
        windVel = Math.max(-1800, Math.min(1800, windVel));
      }
    }
    lastPointerX = e.clientX;
    lastPointerTime = now;
  });

  panel.addEventListener('pointerleave', () => {
    lastPointerX = null;
    lastPointerTime = null;
  });

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

    const canvasRect = canvas.getBoundingClientRect();
    backingPerCssPx = canvasRect.height ? canvas.height / canvasRect.height : 1;

    if (introLin) {
      const linBottom = introLin.getBoundingClientRect().bottom;
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

    const bendPx = windX * backingPerCssPx;
    if (Math.abs(bendPx) < 0.4) {
      ctx.drawImage(frame, drawOffsetX, drawOffsetY, FRAME_W * drawScale, FRAME_H * drawScale);
      return;
    }

    const frameDrawH = FRAME_H * drawScale;
    const stripH = frameDrawH / WIND_STRIPS;
    const topPx = CONTENT_TOP_FRAC * FRAME_H;
    const bottomPx = CONTENT_BOTTOM_FRAC * FRAME_H;
    for (let i = 0; i < WIND_STRIPS; i++) {
      const yTop = i * stripH;
      const srcYMid = (yTop + stripH / 2) / drawScale;
      let t = (bottomPx - srcYMid) / (bottomPx - topPx);
      t = Math.max(0, Math.min(1, t));
      const profile = Math.pow(t, 1.6);
      const xOff = bendPx * profile;
      ctx.drawImage(
        frame,
        0, yTop, frame.width, stripH,
        drawOffsetX + xOff, drawOffsetY + yTop, FRAME_W * drawScale, stripH + 1,
      );
    }
  }

  function start() {
    if (raf || !ready) return;
    const t0 = performance.now();
    lastStepTime = t0;
    const step = (now) => {
      const dt = Math.min((now - lastStepTime) / 1000, 0.05);
      lastStepTime = now;
      const accel = -WIND_STIFFNESS * windX - WIND_DAMPING * windVel;
      windVel += accel * dt;
      windX += windVel * dt;
      windX = Math.max(-WIND_MAX, Math.min(WIND_MAX, windX));

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
