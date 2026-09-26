const backToTop = document.getElementById('backToTop');

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    backToTop.classList.toggle('visible', entry.isIntersecting);
  });
}, { threshold: 0.2 });

observer.observe(backToTop);

backToTop.addEventListener('click', (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
