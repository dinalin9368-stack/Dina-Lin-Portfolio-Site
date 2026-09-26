const box = document.querySelector('.ribbon-box');
const video = document.getElementById('ribbon-video');
const handle = document.getElementById('handle');
const hint = document.getElementById('hint');

video.pause();
video.currentTime = 0;

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
  if (video.currentTime > 0) return;
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
  video.currentTime = 0;
  video.play();
}

handle.addEventListener('pointerdown', onPointerDown);
handle.addEventListener('pointermove', onPointerMove);
handle.addEventListener('pointerup', onPointerUp);
handle.addEventListener('pointercancel', onPointerUp);

video.addEventListener('ended', () => {
  window.location.href = 'home.html';
});
