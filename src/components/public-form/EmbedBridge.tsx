'use client';

import { useEffect } from 'react';
import { EMBED_MSG, clampHeight, knownEmbedderOrigin, parseEmbedOptions, parseHello } from '@/lib/embed/embedParams';
import { useSetHostScheme } from './FormThemeScope';

// The form's half of the embed protocol (the other half is public/embed.js). Mounted once in app/f/layout.tsx, so
// the form, its success page and the unavailable card all report their height.
//
// Security: height/escape messages are posted ONLY to a known embedder origin, never '*'. That origin is the
// browser-supplied ancestorOrigins/referrer, or, when neither is available, the origin of a `beginso:hello` sent by
// the parent window (event.origin cannot be forged). Until one is known nothing is sent. Incoming messages must come
// from window.parent and be a well-formed hello.
export function EmbedBridge() {
  const setHostScheme = useSetHostScheme();

  useEffect(() => {
    if (window.parent === window || !parseEmbedOptions(window.location.search).embed) return;
    const root = document.querySelector<HTMLElement>('[data-form-theme]');
    if (!root) return;

    let target = knownEmbedderOrigin((window.location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins, document.referrer);
    let last = -1;
    let acked = false; // the embedder's hello has been received (tells the script to stop greeting)
    let frame = 0;

    const send = (force = false) => {
      if (!target) return;
      const height = clampHeight(root.getBoundingClientRect().height);
      if (height === null || (!force && height === last)) return;
      last = height;
      window.parent.postMessage({ type: EMBED_MSG.height, height, ack: acked }, target);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => send());
    };

    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || e.origin === 'null') return;
      const hello = parseHello(e.data);
      if (!hello) return; // malformed or someone else's message
      acked = true;
      target = e.origin; // handshake: reply to the sender's origin only
      if (hello.scheme) setHostScheme(hello.scheme);
      // Only an embedder that resizes us (the script's inline mode) wants the inner scrollbar gone.
      document.documentElement.style.overflow = hello.autoHeight ? 'hidden' : '';
      send(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && target) window.parent.postMessage({ type: EMBED_MSG.escape }, target);
    };

    const resize = new ResizeObserver(schedule); // layout changes: page change, conditional field, validation error
    resize.observe(root);
    const mutate = new MutationObserver(schedule); // any DOM change, even one that does not move the box yet
    mutate.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKey);
    send(true); // on mount

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutate.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [setHostScheme]);

  return null;
}
