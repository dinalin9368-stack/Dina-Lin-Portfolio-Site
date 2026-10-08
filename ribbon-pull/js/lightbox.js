// Click an image (flyer, photo) or a craft card to see it enlarged. Click outside, press Esc, or use the close button to go back.
const lightboxTargets = '.flyer, .photo-grid-inner img, .craft';

const lightbox = document.createElement('div');
lightbox.className = 'lightbox';
lightbox.setAttribute('role', 'dialog');
lightbox.setAttribute('aria-modal', 'true');
lightbox.setAttribute('aria-label', 'Enlarged view');
lightbox.innerHTML = `
  <button class="lightbox-close" type="button" aria-label="Close"><img src="assets/lightbox-close-button.svg" alt=""></button>
  <div class="lightbox-stage"></div>`;
document.body.appendChild(lightbox);

const lightboxStage = lightbox.querySelector('.lightbox-stage');
const lightboxClose = lightbox.querySelector('.lightbox-close');

let lightboxOpener = null;
let lightboxFit = null;

// sizes are in design px; the page is zoomed, so the window is converted by the page scale
const lightboxRoom = () => {
  const scale = window.pageScale || 1;
  return { width: (window.innerWidth * 0.9) / scale, height: (window.innerHeight * 0.85) / scale };
};

const layoutLightbox = () => {
  if (lightboxFit) lightboxFit();
};

const openLightbox = (source) => {
  lightboxStage.textContent = '';
  lightboxStage.style.width = '';
  lightboxStage.style.height = '';

  if (source.matches('img')) {
    const image = document.createElement('img');
    image.className = 'lightbox-image';
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    lightboxStage.appendChild(image);

    const ratio = (source.naturalWidth || 4) / (source.naturalHeight || 3);
    lightboxFit = () => {
      const room = lightboxRoom();
      const width = Math.min(room.width, room.height * ratio);
      image.style.width = `${width}px`;
      image.style.height = `${width / ratio}px`;
    };
  } else {
    // a craft card keeps its layout and is scaled up as a whole
    const card = source.cloneNode(true);
    card.removeAttribute('aria-hidden');
    card.removeAttribute('tabindex');
    card.removeAttribute('role');
    card.removeAttribute('aria-label');
    card.classList.add('lightbox-card');
    lightboxStage.appendChild(card);

    lightboxFit = () => {
      const room = lightboxRoom();
      const scale = Math.min(room.width / 594, room.height / 370, 1.8);
      card.style.transform = `scale(${scale})`;
      lightboxStage.style.width = `${594 * scale}px`;
      lightboxStage.style.height = `${370 * scale}px`;
    };
  }

  lightboxFit();
  lightboxOpener = source;
  lightbox.classList.add('open');
  lightboxClose.focus({ preventScroll: true });
};

const closeLightbox = () => {
  if (!lightbox.classList.contains('open')) return;
  lightbox.classList.remove('open');
  lightboxFit = null;
  if (lightboxOpener && lightboxOpener.isConnected) lightboxOpener.focus({ preventScroll: true });
  lightboxOpener = null;
};

document.addEventListener('click', (e) => {
  if (lightbox.contains(e.target)) return;
  const source = e.target.closest(lightboxTargets);
  if (source) openLightbox(source);
});

lightbox.addEventListener('click', (e) => {
  if (!lightboxStage.contains(e.target) || e.target === lightboxStage) closeLightbox();
});
lightboxClose.addEventListener('click', closeLightbox);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLightbox();
  } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches(lightboxTargets) && !lightbox.classList.contains('open')) {
    e.preventDefault();
    openLightbox(e.target);
  }
});

// the page behind stays put while the lightbox is open
['wheel', 'touchmove'].forEach((type) => {
  lightbox.addEventListener(type, (e) => { if (lightbox.classList.contains('open')) e.preventDefault(); }, { passive: false });
});

window.addEventListener('resize', layoutLightbox);
window.addEventListener('pagescale', layoutLightbox);

// the visible items can be reached and opened with the keyboard (the looping copies are for show)
document.querySelectorAll(lightboxTargets).forEach((item) => {
  if (item.closest('[aria-hidden="true"]')) return;
  const title = item.querySelector('.craft-title');
  item.setAttribute('tabindex', '0');
  item.setAttribute('role', 'button');
  item.setAttribute('aria-label', title ? `Enlarge ${title.textContent.replace(/\s+/g, ' ').trim()}` : `Enlarge ${item.alt || 'photo'}`);
});
