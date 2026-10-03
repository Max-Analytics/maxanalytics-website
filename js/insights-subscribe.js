/* insights-subscribe.js — enhances the sign-up form on insights/subscribe/.
   The form posts to Customer.io's hosted Forms endpoint (site ID and form ID live in its action),
   which creates or updates the person and redirects to insights/subscribe/thanks/. A honeypot field
   and a minimum fill time turn away simple bots. Setup notes: README.md, "Insights sign-up". */
(function () {
  'use strict';

  // A person can't load the page, fill in the form and press Subscribe faster than this; a script can.
  var MIN_FILL_MS = 1500;

  var form = document.getElementById('insights-subscribe');
  if (!form) return;

  var loadedAt = Date.now();
  var honeypot = form.elements.company_website;
  var submit = form.querySelector('.sub__btn');
  var error = form.querySelector('.sub__error');
  var successUrl = new URL('thanks/', window.location.href).href;

  // Return to the thank-you page on whichever host served the form (production, preview or local).
  var action = new URL(form.getAttribute('action'));
  action.searchParams.set('success_url', successUrl);
  form.setAttribute('action', action.href);

  function track(name, params) {
    if (typeof gtag !== 'undefined') gtag('event', name, params);
  }

  form.addEventListener('submit', function (e) {
    if (!action.searchParams.get('site_id')) {
      e.preventDefault();
      console.error('Insights sign-up: the form action has no Customer.io site_id, so it cannot submit.');
      error.hidden = false;
      return;
    }
    // A bot gets the thank-you page without anything reaching Customer.io.
    if (honeypot.value || Date.now() - loadedAt < MIN_FILL_MS) {
      e.preventDefault();
      console.warn('Insights sign-up: submission looked automated, so it was not sent.');
      window.location.href = successUrl;
      return;
    }
    // Disabled, the empty honeypot stays out of the submission instead of landing on every profile.
    honeypot.disabled = true;
    // Customer.io takes one string per field, so the ticked boxes travel as one comma-separated attribute.
    var ticked = Array.prototype.filter.call(form.querySelectorAll('.check input'), function (box) {
      return box.checked;
    }).map(function (box) { return box.value; });
    form.elements.hockey_relationship.value = ticked.join(', ');
    submit.disabled = true;
    track('sign_up', { method: 'insights_subscribe' });
  });

  // Coming back via the browser's Back button restores the page from cache with the button still disabled.
  window.addEventListener('pageshow', function () {
    submit.disabled = false;
    honeypot.disabled = false;
  });
})();
