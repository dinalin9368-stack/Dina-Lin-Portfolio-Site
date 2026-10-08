// Slides each [data-marquee] strip to the left on its own, and lets the visitor scroll it sideways (wheel,
// trackpad, touch, keys, or dragging with the mouse). The slide never waits: it carries on from wherever the
// visitor takes the strip (only the hand holding it, by touch or mouse drag, stops it for that moment).
// A strip is cloned before and after so it loops without a jump.
//   data-speed  design px per second (default 50)
//   data-start  how far into the strip it starts, in design px (default 0)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('[data-marquee]').forEach((frame) => {
  const speed = Number(frame.dataset.speed) || 50;
  const start = Number(frame.dataset.start) || 0;
  const track = frame.querySelector('.marquee-track');
  const originals = [...track.children];

  const cloneSet = () => originals.map((item) => {
    const copy = item.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.removeAttribute('tabindex');
    if (copy.matches('img')) copy.alt = '';
    copy.querySelectorAll('img').forEach((img) => { img.alt = ''; });
    return copy;
  });
  const before = cloneSet();
  const after = cloneSet();
  before.forEach((copy) => track.insertBefore(copy, originals[0]));
  after.forEach((copy) => track.appendChild(copy));

  // one full set, including the gap that follows it
  const period = () => originals[0].offsetLeft - before[0].offsetLeft;

  // scroll positions are in design pixels; the original set begins one period in
  let pos = period() + start;
  frame.scrollLeft = pos;

  const wrap = (value) => {
    const P = period();
    if (value >= 2 * P) return value - P;
    if (value <= 0) return value + P;
    return value;
  };

  let visible = true;
  let held = false;       // a finger or the mouse is holding the strip
  let lastSet = frame.scrollLeft;

  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
  }).observe(frame);

  frame.addEventListener('dragstart', (e) => e.preventDefault());
  frame.addEventListener('touchstart', () => { held = true; }, { passive: true });
  frame.addEventListener('touchend', () => { held = false; }, { passive: true });
  frame.addEventListener('touchcancel', () => { held = false; }, { passive: true });

  // mouse dragging: moves on the window, so a click on an image still reaches the image;
  // a drag that actually moved swallows the click that follows it
  let dragStartX = 0;
  let dragStartScroll = 0;
  let dragging = false;
  let dragMoved = false;
  let swallowClick = false;

  frame.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragging = true;
    dragMoved = false;
    dragStartX = e.clientX;
    dragStartScroll = frame.scrollLeft;
    held = true;
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
  });

  function onDragMove(e) {
    if (!dragging) return;
    if (!dragMoved && Math.abs(e.clientX - dragStartX) < 5) return;
    if (!dragMoved) {
      dragMoved = true;
      frame.classList.add('is-dragging');
    }
    const scale = window.pageScale || 1;
    const target = dragStartScroll - (e.clientX - dragStartX) / scale;
    const looped = wrap(target);
    dragStartScroll += looped - target;   // keep the drag anchored if the loop jumped by a period
    frame.scrollLeft = looped;
  }

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    held = false;
    frame.classList.remove('is-dragging');
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
    if (dragMoved) {
      swallowClick = true;
      setTimeout(() => { swallowClick = false; }, 50);
    }
  }

  frame.addEventListener('click', (e) => {
    if (swallowClick) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  let previous = performance.now();
  const tick = (now) => {
    const dt = Math.min((now - previous) / 1000, 0.1);
    previous = now;

    // the browser keeps scroll positions in whole device pixels, so a bigger change than that was the visitor's
    const tolerance = 1.5 / (window.pageScale || 1);
    const current = frame.scrollLeft;
    if (held || Math.abs(current - lastSet) > tolerance) pos = current;   // follow wherever the visitor took it

    if (!held && visible && !reduceMotion.matches && !document.hidden) pos += speed * dt;
    pos = wrap(pos);
    if (Math.abs(pos - current) > 0.001) frame.scrollLeft = pos;
    lastSet = frame.scrollLeft;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
