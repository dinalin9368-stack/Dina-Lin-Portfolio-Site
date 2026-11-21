// Scales the 1440px design to the window width so every position keeps its proportions.
// data-mode="page" scales the whole page; data-mode="nav" scales only the nav (for the full-window opening page).
(function () {
  var DESIGN_WIDTH = 1440;
  var root = document.documentElement;
  var navOnly = document.currentScript && document.currentScript.dataset.mode === 'nav';
  root.classList.add(navOnly ? 'scale-nav' : 'scale-page');

  function apply() {
    var scale = (root.clientWidth || window.innerWidth) / DESIGN_WIDTH;
    window.pageScale = scale;
    root.style.setProperty('--page-scale', scale);
    window.dispatchEvent(new Event('pagescale'));
  }

  apply();
  window.addEventListener('resize', apply);
  // Fonts/images can still be settling when apply() first runs (this script is
  // synchronous, in <head>, before layout) -- re-run once everything has
  // actually loaded so fixed-position elements (e.g. the resume download
  // ribbon) don't end up a few px off from where they settle on repeat visits.
  window.addEventListener('load', apply);
})();
