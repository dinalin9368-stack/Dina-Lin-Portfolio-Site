// Draws a PNG sequence on a canvas, one frame for each step of scrolling.
//
// The frames are exported at about twice the size they are shown, so decoding all of them at once would take well over
// a gigabyte. Instead the frames around the current scroll position are kept decoded, mostly in the direction the
// page is moving, and everything else is released. Frames are prepared nearest-first, a few at a time, and the closest
// decoded frame is shown while a new one is on its way.
//
// Each sequence has two copies of its files: the full set, about twice the size it is shown, for sharp screens, and a
// "-1x" set already at the size it is drawn on a standard screen. Resizing a big frame costs about 30 ms, which is too slow to
// keep up with scrolling, so standard screens use the small set, which decodes in a few milliseconds.
//
// `fit` places the frames on the canvas, in the canvas's own design pixels: the frame is drawn at `scale` times the
// canvas size with its top left corner at (x, y). The exported frames do not all line up with the layout the page was
// built around, so each sequence carries the scale and offset that put the ribbon back where it was.

// Bump this when the frame files are replaced, so browsers do not keep showing the old ones.
const FRAME_VERSION = 2;

function initScrollSequence({ canvasId, folder, frameCount, getScrollStart, scrollDistance, fit }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const place = Object.assign({ scale: 1, x: 0, y: 0 }, fit);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = canvas.width;
  const displayHeight = canvas.height;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;

  const AHEAD = 8;           // frames kept ready in the direction of travel
  const BEHIND = 3;          // ...and the other way
  const MAX_IN_FLIGHT = 3;   // decodes running at once, so the nearest frame is never stuck behind far ones
  const NEAR = 0.25;         // how far outside its scroll range (as a share of it) a ribbon starts getting ready

  let ratio = 1;
  let generation = 0;        // bumped whenever decoded frames are thrown away, so late results can be ignored
  let wanted = 0;
  let direction = 1;         // +1 while scrolling down, -1 while scrolling up
  let active = false;        // close to or inside its scroll range
  let shown = -1;
  let inFlight = 0;

  // the compressed files stay in the page; decoded bitmaps are made from them on demand
  let images = [];
  let loaded = [];
  let variant = '';

  function loadSet(name) {
    variant = name;
    images = [];
    loaded = [];
    for (let i = 1; i <= frameCount; i++) {
      const img = new Image();
      loaded.push(new Promise((resolve) => {
        img.addEventListener('load', resolve);
        img.addEventListener('error', resolve);
      }));
      img.src = `assets/home/${name}/frame-${String(i).padStart(3, '0')}.png?v=${FRAME_VERSION}`;
      images.push(img);
    }
  }

  // The backing store follows the on-screen size, capped at 2x; that also decides which set of files is used.
  const sizeBackingStore = () => {
    ratio = Math.min(dpr * (window.pageScale || 1), 2);
    canvas.width = Math.round(displayWidth * ratio);
    canvas.height = Math.round(displayHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    shown = -1;
    const wantedVariant = ratio < 1.25 ? `${folder}-1x` : folder;
    if (wantedVariant !== variant) loadSet(wantedVariant);
  };
  sizeBackingStore();

  const bitmaps = new Map();    // frame index -> decoded frame
  const pending = new Set();

  // the frames worth keeping decoded right now
  const windowRange = () => {
    if (!active) return [wanted, wanted];
    const back = direction >= 0 ? BEHIND : AHEAD;
    const ahead = direction >= 0 ? AHEAD : BEHIND;
    return [Math.max(0, wanted - back), Math.min(frameCount - 1, wanted + ahead)];
  };
  const inWindow = (i) => {
    const [lo, hi] = windowRange();
    return i >= lo && i <= hi;
  };

  const release = (bitmap) => { if (bitmap && bitmap.close) bitmap.close(); };

  const dropAll = () => {
    generation++;
    bitmaps.forEach(release);
    bitmaps.clear();
    pending.clear();
    inFlight = 0;
  };

  // The frame file is only resized when it is far bigger than it is drawn: a resize costs several times more than a plain
  // decode (about 58 ms against 10 ms for the widest ribbon), and only the plain one keeps up with scrolling. Which set
  // of files is used already keeps the difference in size small.
  async function decode(i) {
    await loaded[i];
    const img = images[i];
    if (!img.naturalWidth || !window.createImageBitmap) return img;
    const targetWidth = Math.round(place.scale * displayWidth * ratio);
    const targetHeight = Math.round(place.scale * displayHeight * ratio);
    try {
      if (img.naturalWidth <= targetWidth * 2.5) return await createImageBitmap(img);
      return await createImageBitmap(img, { resizeWidth: targetWidth, resizeHeight: targetHeight, resizeQuality: 'high' });
    } catch (err) {
      return img;
    }
  }

  // the missing frame in the window that is closest to the one wanted, preferring the direction of travel
  const nextNeeded = () => {
    const [lo, hi] = windowRange();
    for (let d = 0; d <= Math.max(wanted - lo, hi - wanted); d++) {
      const first = wanted + d * direction;
      const second = wanted - d * direction;
      for (const i of d === 0 ? [first] : [first, second]) {
        if (i >= lo && i <= hi && !bitmaps.has(i) && !pending.has(i)) return i;
      }
    }
    return -1;
  };

  function pump() {
    while (inFlight < MAX_IN_FLIGHT) {
      const i = nextNeeded();
      if (i < 0) return;
      const run = generation;
      pending.add(i);
      inFlight++;
      decode(i).then((frame) => {
        if (run !== generation) { release(frame); return; }
        inFlight--;
        pending.delete(i);
        if (inWindow(i)) {
          bitmaps.set(i, frame);
          draw();
        } else {
          release(frame);
        }
        pump();
      });
    }
  }

  // the closest decoded frame to the one wanted
  const nearestReady = () => {
    for (let d = 0; d < frameCount; d++) {
      if (bitmaps.has(wanted - d)) return wanted - d;
      if (bitmaps.has(wanted + d)) return wanted + d;
    }
    return -1;
  };

  function draw() {
    const index = nearestReady();
    if (index < 0 || index === shown) return;
    shown = index;
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    ctx.drawImage(bitmaps.get(index), place.x, place.y, place.scale * displayWidth, place.scale * displayHeight);
    if (window.__seqDebug) { canvas.dataset.shown = index; canvas.dataset.wanted = wanted; }
  }

  const refreshWindow = () => {
    bitmaps.forEach((bitmap, i) => {
      if (!inWindow(i)) { release(bitmap); bitmaps.delete(i); }
    });
    pump();
  };

  const update = () => {
    const distance = typeof scrollDistance === 'function' ? scrollDistance() : scrollDistance;
    const progress = (window.scrollY - getScrollStart()) / Math.max(1, distance);
    const clamped = Math.min(1, Math.max(0, progress));
    const index = Math.round(clamped * (frameCount - 1));
    const nowActive = progress > -NEAR && progress < 1 + NEAR;
    const changed = index !== wanted || nowActive !== active;
    if (index !== wanted) direction = index > wanted ? 1 : -1;
    wanted = index;
    active = nowActive;
    if (changed) refreshWindow();
    draw();
    if (window.__seqDebug) { canvas.dataset.wanted = wanted; }
  };

  refreshWindow();
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  let resizeTimer = null;
  window.addEventListener('pagescale', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      sizeBackingStore();
      dropAll();
      refreshWindow();
      update();
    }, 60);
  });
}
