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

// The scroll position where the Home Alone circle's centre is 39.7% of the way down the window
// (the circle sits in the upper half, its top just under the nav, with its title and button beside it).
function homeAloneCircleInPlace() {
  const circle = document.querySelector('.circle-homealone');
  return () => {
    if (!circle) return 0;
    const centre = pageTop(circle) + circle.getBoundingClientRect().height / 2;
    return centre - window.innerHeight * 0.397;
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

// Finishes when the Home Alone circle is in place, over the same 700 design px as the other ribbons,
// so it starts about 700 design px of scrolling before that.
const bow3Distance = scaled(700);
const bow3End = homeAloneCircleInPlace();

initScrollSequence({
  canvasId: 'bow3Canvas',
  folder: 'bow3-frames',
  frameCount: 46,
  getScrollStart: () => bow3End() - bow3Distance(),
  scrollDistance: bow3Distance,
});
