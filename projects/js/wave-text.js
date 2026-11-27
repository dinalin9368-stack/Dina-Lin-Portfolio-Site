// Splits each [data-wave] word into letters. While the cursor is over the word, a wave follows it:
// the letters nearest the cursor lift, their neighbours dip a little, and everything settles when the cursor leaves.
const WAVE_HEIGHT = 14;   // design px: how far the letter under the cursor lifts
const WAVE_SPREAD = 30;   // design px: how wide the wave is

const lift = (distance) => {
  const u = distance / WAVE_SPREAD;
  return -WAVE_HEIGHT * (1 - u * u) * Math.exp(-(u * u) / 2);
};

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

document.querySelectorAll('[data-wave]').forEach((word) => {
  const text = word.textContent;
  word.setAttribute('aria-label', text);
  word.textContent = '';

  const letters = [...text].map((char) => {
    const letter = document.createElement('span');
    letter.className = 'wave-letter';
    letter.setAttribute('aria-hidden', 'true');
    letter.textContent = char;
    word.appendChild(letter);
    return letter;
  });

  const settle = () => letters.forEach((letter) => { letter.style.transform = ''; });

  word.addEventListener('pointermove', (e) => {
    if (reduceMotion.matches) return;
    const scale = window.pageScale || 1;
    letters.forEach((letter) => {
      const box = letter.getBoundingClientRect();
      const distance = (e.clientX - (box.left + box.width / 2)) / scale;
      letter.style.transform = `translateY(${lift(distance).toFixed(2)}px)`;
    });
  });

  word.addEventListener('pointerleave', settle);
  word.addEventListener('pointercancel', settle);
});
