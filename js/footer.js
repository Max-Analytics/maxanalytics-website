(function () {
  'use strict';
  var scripts = document.querySelectorAll('script[src*="footer.js"]');
  var src = scripts.length ? scripts[scripts.length - 1].getAttribute('src') : '';
  var base = src.replace(/js\/footer\.js.*$/, '');

  var isDark = !!document.querySelector('link[href*="redesign.css"], link[href*="insights-landing.css"]');
  var logo = isDark ? 'logo-colour-white.webp' : 'logo-colour.webp';

  // Footer links come from the crawler copy that partials/site-footer.html puts in #site-footer.
  var el = document.getElementById('site-footer');
  var anchors = el ? el.querySelectorAll('a') : [];
  var linksHtml = '';
  for (var i = 0; i < anchors.length; i++) {
    linksHtml += (i ? ' | ' : '') + '<a href="' + anchors[i].getAttribute('href') + '">' +
      anchors[i].textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</a>';
  }

  var html =
    '<footer class="site-footer' + (isDark ? ' site-footer--dark' : '') + '">' +
      '<div class="site-footer__inner">' +
        '<img src="' + base + 'images/' + logo + '" class="site-footer__logo" alt="Max Evaluations & Analytics">' +
        (linksHtml ? '<p class="site-footer__links">' + linksHtml + '</p>' : '') +
        '<p>&copy; ' + new Date().getFullYear() + ' Max Evaluations &amp; Analytics | ' +
          '<a href="' + base + 'privacy.html">Privacy Policy</a> | ' +
          '<a href="' + base + 'terms.html">Terms of Service</a></p>' +
      '</div>' +
    '</footer>';

  if (el) { el.outerHTML = html; }
  else { document.body.insertAdjacentHTML('beforeend', html); }
})();
