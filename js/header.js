(function () {
  'use strict';

  /* ---- Resolve base path from this script's src ---- */
  var scripts = document.querySelectorAll('script[src*="header.js"]');
  var src = scripts.length ? scripts[scripts.length - 1].getAttribute('src') : '';
  var base = src.replace(/js\/header\.js.*$/, '');

  /* ---- Detect current page ---- */
  var path = window.location.pathname;
  var page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  var isHelpCentre = path.indexOf('support-help-centre') !== -1;
  var isHome = (path === '/' || page === 'index.html') && !isHelpCentre;

  /* ---- Build link list ---- */
  var links = [
    { label: 'Home',       href: isHome ? '#home'     : base + 'index.html',               page: 'index.html' },
    { label: 'Benefits',   href: base + 'benefits.html',                                     page: 'benefits.html' },
    { label: 'Process',    href: base + 'process.html',                                      page: 'process.html'  },
    { label: 'Pricing',    href: base + 'pricing.html',                                      page: 'pricing.html' },
    { label: 'FAQs',       href: base + 'faqs.html',                                         page: 'faqs.html' },
    { label: 'Evaluators', href: base + 'evaluators.html',                                   page: 'evaluators.html' },
    { label: 'Contact',    href: base + 'contact.html',                                      page: 'contact.html' },
    { label: 'About',      href: base + 'about.html',                                        page: 'about.html' },
    { label: 'Help Centre', href: base + 'support-help-centre/',                              page: null }
  ];

  /* ---- Build links HTML ---- */
  var linksHtml = '';
  for (var i = 0; i < links.length; i++) {
    var l = links[i];
    var active = '';
    if (l.page && l.page === page && !isHelpCentre && !isHome) active = ' is-active';
    if (isHelpCentre && l.label === 'Help Centre') active = ' is-active';
    linksHtml += '<a href="' + l.href + '" class="site-nav__link' + active + '">' + l.label + '</a>';
  }

  /* ---- Full nav HTML ---- */
  var html =
    '<header class="site-nav">' +
      '<div class="site-nav__inner">' +
        '<a class="site-nav__brand" href="' + (isHome ? '#home' : base + 'index.html') + '" aria-label="Max Analytics Home">' +
          '<img src="' + base + 'assets/maxlogo.png" alt="Max Analytics" class="site-nav__logo" />' +
        '</a>' +
        '<button class="site-nav__toggle" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav-drawer">' +
          '<span class="site-nav__hamburger">' +
            '<span class="site-nav__bar"></span>' +
            '<span class="site-nav__bar"></span>' +
            '<span class="site-nav__bar"></span>' +
          '</span>' +
        '</button>' +
        '<div class="site-nav__overlay"></div>' +
        '<div class="site-nav__drawer" id="site-nav-drawer" aria-hidden="true">' +
          '<nav class="site-nav__links" aria-label="Primary">' +
            linksHtml +
          '</nav>' +
          '<div class="site-nav__cta">' +
            '<a class="site-nav__btn site-nav__btn--outline" href="#" id="nav-request-demo">Request Demo</a>' +
            '<span class="site-nav__or">or</span>' +
            '<a class="site-nav__login" href="https://app.maxanalytics.ca">Login</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</header>';

  /* ---- Inject into DOM ---- */
  var el = document.getElementById('site-nav');
  if (el) {
    el.outerHTML = html;
  } else {
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  /* ---- Drawer toggle & event handlers ---- */
  document.addEventListener('DOMContentLoaded', function () {
    var toggle = document.querySelector('.site-nav__toggle');
    var drawer = document.getElementById('site-nav-drawer');
    var overlay = document.querySelector('.site-nav__overlay');

    function openDrawer() {
      toggle.classList.add('is-open');
      drawer.classList.add('is-open');
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      drawer.setAttribute('aria-hidden', 'false');
      document.body.classList.add('site-nav--drawer-open');
      var firstLink = drawer.querySelector('.site-nav__link');
      if (firstLink) firstLink.focus({ preventScroll: true });
    }

    function closeDrawer() {
      toggle.classList.remove('is-open');
      drawer.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      drawer.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('site-nav--drawer-open');
    }

    /* Hamburger click */
    if (toggle) {
      toggle.addEventListener('click', function () {
        var isOpen = toggle.classList.contains('is-open');
        if (isOpen) {
          closeDrawer();
        } else {
          openDrawer();
        }
      });
    }

    /* Close drawer when any nav link is clicked */
    var drawerLinks = document.querySelectorAll('.site-nav__drawer .site-nav__link');
    for (var i = 0; i < drawerLinks.length; i++) {
      drawerLinks[i].addEventListener('click', function () {
        closeDrawer();
      });
    }

    /* Close drawer when overlay is clicked */
    if (overlay) {
      overlay.addEventListener('click', function () {
        closeDrawer();
      });
    }

    /* Close drawer on Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle && toggle.classList.contains('is-open')) {
        closeDrawer();
        toggle.focus();
      }
    });

    /* ---- Scroll-spy for home page sections ---- */
    if (isHome) {
      var sectionMap = { home: 'Home' };
      var sectionIds = Object.keys(sectionMap);
      var navLinks = document.querySelectorAll('.site-nav__link');
      var visibleSections = {};

      function updateActiveLink() {
        // Find the lowest visible section by document order
        var activeLabel = null;
        for (var s = 0; s < sectionIds.length; s++) {
          if (visibleSections[sectionIds[s]]) {
            activeLabel = sectionMap[sectionIds[s]];
          }
        }
        // Default to Home if nothing is visible (e.g. at very top)
        if (!activeLabel) activeLabel = 'Home';
        for (var n = 0; n < navLinks.length; n++) {
          if (navLinks[n].textContent === activeLabel) {
            navLinks[n].classList.add('is-active');
          } else {
            navLinks[n].classList.remove('is-active');
          }
        }
      }

      var observer = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          visibleSections[entries[e].target.id] = entries[e].isIntersecting;
        }
        updateActiveLink();
      }, { threshold: 0.3, rootMargin: '-80px 0px 0px 0px' });

      for (var s = 0; s < sectionIds.length; s++) {
        var section = document.getElementById(sectionIds[s]);
        if (section) observer.observe(section);
      }

      // Set initial state — Home highlighted on load
      updateActiveLink();
    }

    /* Request Demo click handler */
    var demoBtn = document.getElementById('nav-request-demo');
    if (demoBtn) {
      demoBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closeDrawer();
        if (typeof zE !== 'undefined') {
          zE('webWidget', 'open');
        } else {
          window.location.href = base + 'contact.html';
        }
        if (typeof gtag !== 'undefined') {
          gtag('event', 'cta_click', {
            cta_type: 'request_demo',
            cta_location: 'navbar'
          });
        }
      });
    }
  });
})();
