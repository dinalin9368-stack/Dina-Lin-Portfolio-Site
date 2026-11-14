const box = document.querySelector('.ribbon-box');
const canvas = document.getElementById('ribbon-canvas');
const ctx = canvas.getContext('2d');
const handle = document.getElementById('handle');
const hint = document.getElementById('hint');

// The animation is a PNG sequence (transparent frames, 3420 x 2433), played once at 18 fps after the pull.
const FRAME_COUNT = 22;
const FPS = 18;
const MAX_BACKING_WIDTH = 2400;   // device px; keeps the decoded frames' memory in check on large screens

// The frames are drawn at frameScale times the size they were exported at (1 = as exported, where the bow spans 42.5% of
// the width of the picture area). They are placed so that their bottom edge is the bottom of the screen, because the
// ribbon leaves the picture through the bottom edge: that way it looks as if it runs off the screen. Sideways, the bow keeps
// the spot it had (its centre 49.7% across), whatever the scale.
//
// The scale follows the window: the ribbon is as big as it can be while the highest point it reaches during the animation
// stays clear of the nav bar. The pull handle and hint sit on the ribbon tail, which moves with the scale.
const BOW_CENTRE_IN_FRAME = 0.5328;           // where the bow's centre is across the exported frame
const BOW_CENTRE_ON_SCREEN = 0.4969;          // where it should be across the picture area
const TAIL_IN_FRAME = { x: 0.7056, y: 0.7997 };   // the end of the right ribbon in the first exported frame
const HIGHEST_POINT_IN_FRAME = 0.0053;        // the ribbon's highest point in any frame, as a share of the frame height
const MIN_SCALE = 0.4;
const MAX_SCALE = 1;
const NAV_GAP = 12;                           // design px kept between the nav bar and the ribbon

let frameScale = 1;
let frameOffsetX = 0;                         // share of the canvas width
let frameOffsetY = 0;                         // share of the canvas height: the frame bottom is the canvas bottom

function layoutRibbon() {
  const nav = document.querySelector('.nav');
  const pageScale = window.pageScale || 1;
  const navBottom = nav ? nav.getBoundingClientRect().bottom : 0;
  const boxHeight = canvas.clientHeight || box.clientHeight;
  // the highest ribbon point sits at (viewport height - frameScale * boxHeight * (1 - HIGHEST_POINT_IN_FRAME))
  const room = window.innerHeight - navBottom - NAV_GAP * pageScale;
  frameScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, room / (boxHeight * (1 - HIGHEST_POINT_IN_FRAME))));
  frameOffsetX = BOW_CENTRE_ON_SCREEN - frameScale * BOW_CENTRE_IN_FRAME;
  frameOffsetY = 1 - frameScale;

  // the handle sits on the tail end; the hint sits a little below it
  const tailX = frameOffsetX + frameScale * TAIL_IN_FRAME.x;
  const tailY = frameOffsetY + frameScale * TAIL_IN_FRAME.y;
  handle.style.left = `${(tailX * 100).toFixed(2)}%`;
  handle.style.top = `${(tailY * 100).toFixed(2)}%`;
  hint.style.left = `calc(${(tailX * 100).toFixed(2)}% + 5px)`;
  hint.style.top = `${(tailY * 100 + 2.74).toFixed(2)}%`;
}

const FRAME_VERSION = 2;   // bump when the frame files are replaced, so browsers do not keep showing the old ones
const frameUrl = (i) => `assets/opening-frames/frame-${String(i + 1).padStart(3, '0')}.png?v=${FRAME_VERSION}`;

let frames = new Array(FRAME_COUNT).fill(null);
let playing = false;
let started = false;
let ready = false;
let startWhenReady = false;
let decodeRun = 0;

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = url;
});

// Decodes every frame once at the size it will be drawn, so playback never waits on a decode.
async function decodeFrames() {
  const run = ++decodeRun;
  ready = false;
  layoutRibbon();
  const cssWidth = canvas.clientWidth || box.clientWidth;
  const backingWidth = Math.min(Math.round(cssWidth * (window.devicePixelRatio || 1)), MAX_BACKING_WIDTH);
  const backingHeight = Math.round(backingWidth * 2433 / 3420);
  canvas.width = backingWidth;
  canvas.height = backingHeight;

  const next = new Array(FRAME_COUNT).fill(null);
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = await loadImage(frameUrl(i));
    if (run !== decodeRun) return;
    try {
      next[i] = await createImageBitmap(img, {
        resizeWidth: Math.round(backingWidth * frameScale),
        resizeHeight: Math.round(backingHeight * frameScale),
        resizeQuality: 'high',
      });
    } catch (err) {
      next[i] = img;   // older browsers: draw the full-size frame and let the canvas scale it
    }
    if (i === 0) {
      frames = next;
      draw(0);
    }
  }
  if (run !== decodeRun) return;
  frames = next;
  ready = true;
  if (!started) draw(0);
  if (startWhenReady) play();
}

function draw(index) {
  const frame = frames[index];
  if (!frame) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    frame,
    frameOffsetX * canvas.width,
    frameOffsetY * canvas.height,
    frameScale * canvas.width,
    frameScale * canvas.height,
  );
}

function play() {
  if (started) return;
  if (!ready) { startWhenReady = true; return; }
  started = true;
  playing = true;
  const t0 = performance.now();
  let shown = -1;
  const step = (now) => {
    const index = Math.floor(((now - t0) / 1000) * FPS);
    if (index >= FRAME_COUNT) {
      window.location.href = 'home.html';
      return;
    }
    if (index !== shown) {
      shown = index;
      draw(index);
      // frames only play forward once, so the ones already shown can be freed
      for (let i = 0; i < index; i++) {
        if (frames[i] && frames[i].close) frames[i].close();
        frames[i] = null;
      }
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

decodeFrames();

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { if (!started) decodeFrames(); }, 250);
});

const THRESHOLD = 90;
let dragging = false;
let startX = 0, startY = 0;
let pointerId = null;

function setHandle(dx, dy) {
  const maxR = 46;
  const dist = Math.hypot(dx, dy);
  const scale = dist > maxR ? maxR / dist : 1;
  handle.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
}

function resetHandle() {
  handle.style.transition = 'transform 0.35s cubic-bezier(.34,1.56,.64,1)';
  handle.style.transform = 'translate(0,0)';
  setTimeout(() => { handle.style.transition = ''; }, 360);
}

function onPointerDown(e) {
  if (started) return;
  dragging = true;
  pointerId = e.pointerId;
  handle.setPointerCapture(pointerId);
  handle.classList.add('grabbing');
  hint.classList.add('hidden');
  startX = e.clientX;
  startY = e.clientY;
}

function onPointerMove(e) {
  if (!dragging) return;
  const dx = e.clientX - startX;
  const dy = e.clientY - startY;
  setHandle(dx, dy);
  if (Math.hypot(dx, dy) > THRESHOLD) {
    release();
  }
}

function onPointerUp() {
  if (!dragging) return;
  dragging = false;
  handle.classList.remove('grabbing');
  resetHandle();
  hint.classList.remove('hidden');
}

function release() {
  dragging = false;
  handle.classList.remove('grabbing');
  handle.classList.add('hidden');
  hint.classList.add('hidden');
  play();
}

handle.addEventListener('pointerdown', onPointerDown);
handle.addEventListener('pointermove', onPointerMove);
handle.addEventListener('pointerup', onPointerUp);
handle.addEventListener('pointercancel', onPointerUp);
