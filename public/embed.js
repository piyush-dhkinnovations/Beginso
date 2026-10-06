/*! Beginso embed script. One file serves every embed method (inline auto-height, popup, drawer).
 *  Vanilla, no dependencies. Safe to include more than once and for several forms on one page.
 *  Inline iframes are plain inline-styled elements; the popup/drawer UI lives in a Shadow DOM host, so nothing
 *  here can leak CSS into (or inherit CSS from) the host page. Protocol: see src/lib/embed/embedParams.ts. */
(function () {
  'use strict';
  if (window.__beginsoEmbed) {
    window.__beginsoEmbed.scan();
    return;
  }

  var script = document.currentScript;
  if (!script || !script.src) script = document.querySelector('script[src$="/embed.js"]');
  var ORIGIN;
  try {
    ORIGIN = new URL(script.src).origin; // the Beginso app origin: the only origin whose messages are trusted
  } catch (e) {
    return;
  }

  var MSG_HELLO = 'beginso:hello', MSG_HEIGHT = 'beginso:height', MSG_ESCAPE = 'beginso:escape';
  var MIN_H = 120, MAX_H = 20000;
  var SLUG = /^[A-Za-z0-9_-]{1,64}$/;
  var frames = []; // { iframe, auto, onHeight, got, tries }

  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function num(v, lo, hi, dflt) { var n = parseInt(v, 10); return isFinite(n) ? clamp(n, lo, hi) : dflt; }

  function formSrc(slug, params) {
    if (!SLUG.test(slug)) return null;
    params = String(params || '').replace(/^\?/, '');
    if (params.length > 4000 || /[^\x21-\x7E]/.test(params)) params = 'embed=1'; // already URL-encoded ASCII, or ignored
    return ORIGIN + '/f/' + slug + '?' + params;
  }

  function scheme() {
    try {
      var cs = getComputedStyle(document.documentElement).colorScheme || '';
      if (/\bdark\b/.test(cs) && !/\blight\b/.test(cs)) return 'dark';
      if (/\blight\b/.test(cs) && !/\bdark\b/.test(cs)) return 'light';
    } catch (e) {}
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function hello(f) {
    try {
      // targetOrigin is the app origin, never '*': a navigated-away iframe receives nothing.
      f.iframe.contentWindow.postMessage({ type: MSG_HELLO, scheme: scheme(), autoHeight: f.auto }, ORIGIN);
    } catch (e) {}
  }

  // The form may hydrate after the iframe's load event, so greet again until it answers with a height.
  function register(f) {
    frames.push(f);
    f.iframe.addEventListener('load', function () {
      hello(f);
      var t = setInterval(function () {
        if (f.got || ++f.tries > 20 || !f.iframe.isConnected) return clearInterval(t);
        hello(f);
      }, 500);
    });
  }

  window.addEventListener('message', function (e) {
    if (e.origin !== ORIGIN) return; // ignore every other origin
    var d = e.data;
    if (!d || typeof d !== 'object') return; // ignore malformed messages
    var f = null;
    for (var i = 0; i < frames.length; i++) if (frames[i].iframe.contentWindow === e.source) f = frames[i];
    if (!f) return;
    if (d.type === MSG_HEIGHT && typeof d.height === 'number' && isFinite(d.height)) {
      if (d.ack === true) f.got = true; // the form has our hello: stop greeting
      if (f.onHeight) f.onHeight(clamp(Math.ceil(d.height), MIN_H, MAX_H));
    } else if (d.type === MSG_ESCAPE && open && open.f === f) {
      close();
    }
  });

  function makeIframe(src, title) {
    var el = document.createElement('iframe');
    el.src = src;
    el.title = title || 'Form';
    el.setAttribute('loading', 'lazy');
    return el;
  }

  // ---- inline (auto-height) ------------------------------------------------------------------
  function scanInline() {
    frames = frames.filter(function (f) { return f.iframe.isConnected; });
    var hosts = document.querySelectorAll('[data-beginso-form]:not([data-beginso-ready])');
    for (var i = 0; i < hosts.length; i++) {
      var h = hosts[i];
      var src = formSrc(h.getAttribute('data-beginso-form'), h.getAttribute('data-beginso-params'));
      if (!src) continue; // bad slug: leave the plain-link fallback in place
      h.setAttribute('data-beginso-ready', '');
      var m = /^(\d{2,4})(px|%)$/.exec(h.getAttribute('data-beginso-width') || '');
      var w = m ? (m[2] === '%' ? clamp(+m[1], 10, 100) : clamp(+m[1], 200, 2000)) + m[2] : '100%';
      var iframe = makeIframe(src, h.getAttribute('data-beginso-title'));
      iframe.style.cssText = 'display:block;width:' + w + ';max-width:100%;height:600px;' +
        'border:' + (h.getAttribute('data-beginso-border') === '1' ? '1px solid #D0D5DD' : '0') + ';' +
        'border-radius:' + (h.getAttribute('data-beginso-rounded') === '0' ? '0' : '8px') + ';';
      h.textContent = '';
      h.appendChild(iframe);
      var f = { iframe: iframe, auto: true, got: false, tries: 0 };
      f.onHeight = function (frame) { return function (px) { frame.iframe.style.height = px + 'px'; }; }(f);
      register(f);
    }
  }

  // ---- popup / drawer (Shadow DOM) -------------------------------------------------------------
  var CSS =
    ':host{all:initial}*{box-sizing:border-box}' +
    '.scrim{position:fixed;inset:0;background:rgba(0,0,0,.6);opacity:0;transition:opacity .2s}' +
    '.panel{position:fixed;background:#fff;box-shadow:0 20px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;overflow:hidden;transition:transform .2s,opacity .2s}' +
    '.modal{top:50%;left:50%;max-width:calc(100vw - 32px);max-height:90vh;border-radius:12px;opacity:0;transform:translate(-50%,-48%)}' +
    '.drawer{top:0;bottom:0;max-width:100vw}.drawer.right{right:0;transform:translateX(100%)}.drawer.left{left:0;transform:translateX(-100%)}' +
    '.on .scrim{opacity:1}.on .modal{opacity:1;transform:translate(-50%,-50%)}.on .drawer{transform:none}' +
    'button{position:absolute;top:8px;right:8px;z-index:1;width:36px;height:36px;border:0;border-radius:50%;background:rgba(17,24,39,.75);color:#fff;font:20px/1 system-ui,sans-serif;cursor:pointer}' +
    '.left button{right:auto;left:8px}button:focus-visible{outline:3px solid #60A5FA;outline-offset:2px}' +
    'iframe{border:0;width:100%;flex:1;min-height:0;background:#fff}' +
    '@media (prefers-reduced-motion:reduce){.scrim,.panel{transition:none}}';

  var open = null;

  function openOverlay(trigger, kind) {
    if (open) return;
    var src = formSrc(trigger.getAttribute('data-beginso-' + kind), trigger.getAttribute('data-beginso-params'));
    if (!src) return;
    var popup = kind === 'popup';
    var width = popup ? num(trigger.getAttribute('data-beginso-width'), 320, 1200, 640) : num(trigger.getAttribute('data-beginso-width'), 280, 900, 480);
    var side = trigger.getAttribute('data-beginso-side') === 'left' ? 'left' : 'right';
    var title = trigger.getAttribute('data-beginso-title') || 'Form';

    var host = document.createElement('div');
    host.setAttribute('data-beginso-overlay', '');
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483000';
    var root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<style>' + CSS + '</style><div class="wrap"><div class="scrim"></div>' +
      '<div class="panel ' + (popup ? 'modal' : 'drawer ' + side) + '" role="dialog" aria-modal="true"><button type="button" aria-label="Close">×</button></div></div>';
    var wrap = root.querySelector('.wrap'), panel = root.querySelector('.panel'), closeBtn = root.querySelector('button');
    panel.setAttribute('aria-label', title);
    panel.style.width = width + 'px';
    var iframe = makeIframe(src, title);
    iframe.removeAttribute('loading'); // opened on purpose: load now
    panel.appendChild(iframe);
    if (popup) panel.style.height = 'min(90vh, 640px)';

    var f = { iframe: iframe, auto: false, got: false, tries: 0 };
    if (popup) f.onHeight = function (px) { panel.style.height = 'min(90vh, ' + px + 'px)'; };
    register(f);

    // Everything behind the overlay becomes inert: Tab/screen readers cannot reach the host page.
    var inerted = [];
    for (var c = document.body.firstElementChild; c; c = c.nextElementSibling) {
      if (!c.inert) { c.inert = true; inerted.push(c); }
    }
    var bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    var returnTo = document.activeElement;
    document.body.appendChild(host);

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab' && e.shiftKey && root.activeElement === closeBtn) { e.preventDefault(); iframe.focus(); }
      else if (e.key === 'Tab' && !e.shiftKey && root.activeElement === iframe) { e.preventDefault(); closeBtn.focus(); }
    }
    document.addEventListener('keydown', onKey, true); // composed events from inside the shadow tree reach here too
    root.querySelector('.scrim').addEventListener('click', close);
    closeBtn.addEventListener('click', close);

    open = {
      f: f,
      close: function () {
        document.removeEventListener('keydown', onKey, true);
        wrap.classList.remove('on');
        var done = function () {
          host.remove();
          frames = frames.filter(function (x) { return x !== f; });
          inerted.forEach(function (n) { n.inert = false; });
          document.body.style.overflow = bodyOverflow;
          var back = trigger.isConnected ? trigger : returnTo;
          if (back && back.focus) back.focus(); // focus returns to the trigger
        };
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) done(); else setTimeout(done, 200);
      },
    };
    requestAnimationFrame(function () { wrap.classList.add('on'); closeBtn.focus(); });
  }

  function close() {
    var o = open;
    open = null;
    if (o) o.close();
  }

  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest && e.target.closest('[data-beginso-popup],[data-beginso-drawer]');
    if (!t) return;
    e.preventDefault();
    openOverlay(t, t.hasAttribute('data-beginso-popup') ? 'popup' : 'drawer');
  });

  // Keep an auto-scheme form in step with the host page.
  if (window.matchMedia) {
    var mq = matchMedia('(prefers-color-scheme: dark)');
    var onScheme = function () { frames.forEach(hello); };
    if (mq.addEventListener) mq.addEventListener('change', onScheme);
  }

  window.__beginsoEmbed = { scan: scanInline };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scanInline);
  else scanInline();
  if (window.MutationObserver) new MutationObserver(scanInline).observe(document.documentElement, { childList: true, subtree: true });
})();
