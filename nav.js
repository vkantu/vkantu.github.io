// Highlight active nav link
(function () {
  const links = document.querySelectorAll('.nav-links a');
  const current = window.location.pathname.split('/').pop() || 'index.html';

  links.forEach(a => {
    const href = a.getAttribute('href');
    if (href === current || (href === 'index.html' && (current === '' || current === 'index.html'))) {
      a.classList.add('active');
    }
  });
})();
