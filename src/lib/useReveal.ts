import { useEffect, useRef, useState } from 'react';

/**
 * Scroll-reveal primitive.
 *
 * Design constraints this hook is built around:
 *
 * 1. It fails OPEN. Content is only ever hidden while this hook is alive and
 *    confident it can reveal it again. If IntersectionObserver is missing, if
 *    the user prefers reduced motion, or if the observer simply never fires,
 *    the element ends up visible. A reveal animation must never be able to
 *    permanently hide real content — this app is a client-rendered SPA, so
 *    anything stuck at opacity:0 is just gone.
 * 2. It reveals once. Re-animating on scroll-back is a hallmark of cheap
 *    template motion and gets irritating on a long page.
 * 3. It only ever drives opacity + transform, so every reveal stays on the
 *    compositor and off the main thread.
 */

const REVEAL_FAILSAFE_MS = 1500;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);

  // Start revealed when we already know we will never animate. This avoids a
  // hidden first paint for reduced-motion users and unsupported browsers.
  const [revealed, setRevealed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (prefersReducedMotion()) return true;
    if (!('IntersectionObserver' in window)) return true;
    return false;
  });

  useEffect(() => {
    if (revealed) return;
    const el = ref.current;
    if (!el) {
      // Nothing to observe — don't leave the caller hidden.
      setRevealed(true);
      return;
    }

    const reveal = () => setRevealed(true);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
            observer.disconnect();
            break;
          }
        }
      },
      {
        // Trigger a little before the element reaches the fold so the motion
        // reads as "already arriving" rather than "started once I got there".
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    observer.observe(el);

    // Failsafe: if the observer never reports (detached subtree, an ancestor
    // that never becomes scrollable, a browser quirk), show the content anyway.
    const failsafe = window.setTimeout(reveal, REVEAL_FAILSAFE_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(failsafe);
    };
  }, [revealed]);

  return { ref, revealed };
}

export { prefersReducedMotion };
