const pageTop = (el) => el.getBoundingClientRect().top + window.scrollY;
const pageBottom = (el) => el.getBoundingClientRect().bottom + window.scrollY;
const scaled = (designPx) => () => designPx * (window.pageScale || 1);

// Starts when the video's bottom edge reaches the bottom of the viewport.
const heroBottomPage = () => (heroPanel ? pageBottom(heroPanel) : 0);

// Starts when the canvas's top edge enters the bottom of the viewport.
function ownPositionStart(canvasId) {
  const canvas = document.getElementById(canvasId);
  return () => {
    if (!canvas) return 0;
    return pageTop(canvas) - window.innerHeight;
  };
}

// Starts when the gap between the 2nd and 3rd project circles reaches the middle of the viewport.
function betweenCirclesStart() {
  const secondCircle = document.querySelector('.circle-alaska');
  const thirdCircle = document.querySelector('.circle-homealone');
  return () => {
    if (!secondCircle || !thirdCircle) return 0;
    const gapMiddle = (pageBottom(secondCircle) + pageTop(thirdCircle)) / 2;
    return gapMiddle - window.innerHeight / 2;
  };
}

initScrollSequence({
  canvasId: 'bowCanvas',
  folder: 'bow-frames',
  frameCount: 51,
  getScrollStart: () => heroBottomPage() - window.innerHeight,
  scrollDistance: scaled(700),
});

initScrollSequence({
  canvasId: 'bow2Canvas',
  folder: 'bow2-frames',
  frameCount: 46,
  getScrollStart: ownPositionStart('bow2Canvas'),
  scrollDistance: scaled(700),
});

// Finishes exactly at the bottom of the page, over the same 700 design px as the other ribbons.
// Starts no later than the gap between the circles, earlier if the page is too short.
const bow3Distance = scaled(700);
const bow3GapStart = betweenCirclesStart();
const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

initScrollSequence({
  canvasId: 'bow3Canvas',
  folder: 'bow3-frames',
  frameCount: 46,
  getScrollStart: () => Math.min(bow3GapStart(), maxScroll() - bow3Distance()),
  scrollDistance: bow3Distance,
});
