(function () {
  'use strict';
  var scripts = document.querySelectorAll('script[src*="footer.js"]');
  var src = scripts.length ? scripts[scripts.length - 1].getAttribute('src') : '';
  var base = src.replace(/js\/footer\.js.*$/, '');

  var isDark = !!document.querySelector('link[href*="redesign.css"]');
  var logo = isDark ? 'logo-colour-white.png' : 'logo-colour.png';

  var html =
    '<footer class="site-footer' + (isDark ? ' site-footer--dark' : '') + '">' +
      '<div class="site-footer__inner">' +
        '<img src="' + base + 'images/' + logo + '" class="site-footer__logo" alt="Max Evaluations & Analytics">' +
        '<p>&copy; ' + new Date().getFullYear() + ' Max Evaluations &amp; Analytics | ' +
          '<a href="' + base + 'privacy.html">Privacy Policy</a> | ' +
          '<a href="' + base + 'terms.html">Terms of Service</a></p>' +
      '</div>' +
    '</footer>';

  var el = document.getElementById('site-footer');
  if (el) { el.outerHTML = html; }
  else { document.body.insertAdjacentHTML('beforeend', html); }
})();
