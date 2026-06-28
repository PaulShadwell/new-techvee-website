// components.js — edit this ONE file to update nav & footer across every page

// ── Calendly booking link (change here if your scheduling URL changes) ──
const CALENDLY_URL = "https://calendly.com/paul-shadwell-techvee/30min";

// ── Privacy-friendly, cookieless analytics (self-hosted Umami) ──
const UMAMI_SRC = "https://analytics.swissqrbills.ch/script.js";
const UMAMI_WEBSITE_ID = "105601df-21ec-4bdc-81b8-6ffe4af4f689";
const CONSENT_KEY = "techvee-cookie-consent"; // values: "accepted" | "declined"

const NAV_HTML = `
<nav>
  <div class="nav-inner">
    <a href="index.html" class="nav-brand"><img src="Techvee-logo.png" alt="Techvee GmbH" class="nav-logo"></a>
    <button class="nav-toggle" id="nav-toggle" aria-label="Open menu" aria-expanded="false" aria-controls="main-nav-links">
      <span></span><span></span><span></span>
    </button>
    <ul class="nav-links" id="main-nav-links">
      <li><a href="techvee-services.html">Services</a></li>
      <li><a href="techvee-swiss-it-compliance.html">Swiss IT &amp; Compliance</a></li>
      <li><a href="techvee-ai-copilot.html">AI &amp; Copilot</a></li>
      <li><a href="techvee-hosting.html">Web Hosting</a></li>
      <li><a href="techvee-about.html">About Paul</a></li>
      <li><a href="techvee-blog.html">Blog</a></li>
    </ul>
    <a href="techvee-contact.html" class="nav-cta" data-calendly>Book a Free Call &rarr;</a>
  </div>
</nav>`;

const FOOTER_HTML = `
<footer>
  <div class="container">
    <div class="footer-inner">
      <div class="footer-brand">
        <img src="Techvee-logo.png" alt="Techvee GmbH" class="footer-logo">
        <span class="footer-tagline">IT &amp; AI Consultancy<br>for Swiss Businesses &amp; Expats</span>
      </div>
      <div class="footer-col">
        <h4>Services</h4>
        <a href="techvee-services.html">Ad-hoc Support</a>
        <a href="techvee-services.html">Monthly Retainer</a>
        <a href="techvee-services.html">Project Work</a>
        <a href="techvee-ai-copilot.html">AI &amp; Microsoft Copilot</a>
        <a href="techvee-hosting.html">Swiss Web Hosting</a>
        <a href="techvee-services.html">M365 Licensing (CSP)</a>
      </div>
      <div class="footer-col">
        <h4>Expertise</h4>
        <a href="techvee-swiss-it-compliance.html">Swiss IT Compliance</a>
        <a href="techvee-swiss-it-compliance.html">Microsoft 365 &amp; Azure</a>
        <a href="techvee-ai-copilot.html">AI &amp; Automation</a>
        <a href="techvee-swiss-it-compliance.html">Exoscale &amp; SafeSwissCloud</a>
        <a href="techvee-hosting.html">Web Hosting</a>
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <a href="techvee-about.html">About Paul</a>
        <a href="techvee-blog.html">Blog</a>
        <a href="techvee-contact.html">Contact</a>
        <p style="margin-top:8px;">Turbenthal, Canton Zurich</p>
        <a href="mailto:info@techvee.com">info@techvee.com</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>&copy; 2026 Techvee GmbH &middot; CHE-462.857.052 &middot; MWST registered &middot; Turbenthal, Switzerland</span>
      <span><a href="privacy.html">Privacy Policy</a> &middot; <a href="impressum.html">Impressum</a> &middot; <a href="#" data-cookie-settings>Cookie settings</a></span>
    </div>
  </div>
</footer>`;

document.addEventListener('DOMContentLoaded', function () {
  // Ensure the JS reveal gate is set even if the head snippet is missing.
  document.documentElement.classList.add('js');

  // ── Inject nav & footer ──
  const navSlot = document.getElementById('site-nav');
  if (navSlot) navSlot.outerHTML = NAV_HTML;
  const footerSlot = document.getElementById('site-footer');
  if (footerSlot) footerSlot.outerHTML = FOOTER_HTML;

  // ── Active link highlight ──
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('#main-nav-links a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });

  // ── Mobile hamburger toggle ──
  const nav = document.querySelector('nav');
  const toggle = document.getElementById('nav-toggle');
  if (nav && toggle) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    // Close the menu after tapping a link
    document.querySelectorAll('#main-nav-links a').forEach(a => {
      a.addEventListener('click', () => {
        nav.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ── Subtle shadow on nav when scrolled ──
  if (nav) {
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── Cookie consent + privacy-friendly analytics ──
  (function () {
    var loaded = false;
    function getConsent() {
      try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
    }
    function setConsent(v) {
      try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {}
    }
    function loadAnalytics() {
      if (loaded || document.querySelector('script[data-website-id="' + UMAMI_WEBSITE_ID + '"]')) return;
      loaded = true;
      var s = document.createElement('script');
      s.defer = true;
      s.src = UMAMI_SRC;
      s.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
      document.head.appendChild(s);
    }

    var banner;
    function buildBanner() {
      banner = document.createElement('div');
      banner.className = 'cookie-banner';
      banner.setAttribute('role', 'dialog');
      banner.setAttribute('aria-label', 'Cookie and analytics notice');
      banner.innerHTML =
        '<div class="cookie-inner">' +
          '<p class="cookie-text">Techvee uses <strong>privacy-friendly, cookieless analytics</strong>, self-hosted in Switzerland, to understand how this site is used. No tracking cookies, no data selling. See our <a href="privacy.html">Privacy Policy</a>.</p>' +
          '<div class="cookie-actions">' +
            '<button type="button" class="cookie-btn cookie-decline">Decline</button>' +
            '<button type="button" class="cookie-btn cookie-accept">Accept</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(banner);
      requestAnimationFrame(function () { banner.classList.add('show'); });
      banner.querySelector('.cookie-accept').addEventListener('click', function () {
        setConsent('accepted'); loadAnalytics(); hideBanner();
      });
      banner.querySelector('.cookie-decline').addEventListener('click', function () {
        setConsent('declined'); hideBanner();
      });
    }
    function hideBanner() {
      if (!banner) return;
      banner.classList.remove('show');
      setTimeout(function () { if (banner && banner.parentNode) banner.parentNode.removeChild(banner); banner = null; }, 300);
    }

    var consent = getConsent();
    if (consent === 'accepted') {
      loadAnalytics();
    } else if (consent !== 'declined') {
      buildBanner();
    }

    // "Cookie settings" link in the footer reopens the banner
    document.querySelectorAll('[data-cookie-settings]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        if (!banner) buildBanner();
      });
    });
  })();

  // ── Calendly popup booking ──
  // The contact page already embeds the calendar inline, so it loads its own
  // Calendly assets; everywhere else we load them here and bind [data-calendly].
  (function () {
    var triggers = document.querySelectorAll('[data-calendly]');
    if (!triggers.length) return;

    if (!document.querySelector('link[href*="calendly.com/assets/external/widget.css"]')) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://assets.calendly.com/assets/external/widget.css';
      document.head.appendChild(css);
    }
    if (!document.querySelector('script[src*="calendly.com/assets/external/widget.js"]')) {
      var js = document.createElement('script');
      js.src = 'https://assets.calendly.com/assets/external/widget.js';
      js.async = true;
      document.body.appendChild(js);
    }

    triggers.forEach(function (el) {
      el.addEventListener('click', function (e) {
        if (window.Calendly && typeof window.Calendly.initPopupWidget === 'function') {
          e.preventDefault();
          window.Calendly.initPopupWidget({ url: CALENDLY_URL + '?hide_gdpr_banner=1&primary_color=1dace8' });
        }
        // If the script hasn't loaded yet, the default link (contact page) is followed.
      });
    });
  })();

  // ── Scroll-reveal animations ──
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    const selector = [
      '.pain-card', '.svc-card', '.svc-block', '.blog-card', '.card',
      '.feat', '.partner-card', '.ai-feat', '.swiss-feat', '.hosting-tier',
      '.step', '.c-detail', '.sec-title', '.eyebrow', '.trust-item'
    ].join(',');

    const els = Array.from(document.querySelectorAll(selector))
      // Don't animate items already above the fold-line on load handled by observer anyway
      .filter(el => !el.closest('nav') && !el.closest('footer'));

    els.forEach(el => el.setAttribute('data-reveal', ''));

    // Stagger items that sit in the same grid row
    els.forEach(el => {
      const sibs = el.parentElement ? Array.from(el.parentElement.children).filter(c => c.hasAttribute('data-reveal')) : [];
      const idx = sibs.indexOf(el);
      if (idx > 0 && idx < 4) el.setAttribute('data-reveal-delay', String(Math.min(idx, 3)));
    });

    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          obs.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    const vh = window.innerHeight || document.documentElement.clientHeight;
    els.forEach(el => {
      // Anything already on-screen at load reveals instantly (no flash); the rest animate on scroll.
      if (el.getBoundingClientRect().top < vh * 0.92) {
        el.classList.add('is-visible');
      } else {
        io.observe(el);
      }
    });
  }
});
