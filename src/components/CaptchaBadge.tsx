import { useEffect, useRef, useCallback } from 'react';

interface Props {
  onToken: (token: string | null) => void;
  action: 'login' | 'signup' | 'reset' | 'rsvp';
  resetKey: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

type Provider = 'turnstile' | 'hcaptcha';

function getProvider(): Provider {
  const raw = (import.meta.env.VITE_CAPTCHA_PROVIDER || 'turnstile') as string;
  return raw === 'hcaptcha' ? 'hcaptcha' : 'turnstile';
}

function getSiteKey(): string | undefined {
  return import.meta.env.VITE_CAPTCHA_SITE_KEY;
}

/**
 * CAPTCHA wrapper supporting Cloudflare Turnstile (default, usually invisible)
 * and hCaptcha (alternative), driven by VITE_CAPTCHA_PROVIDER.
 *
 * When VITE_CAPTCHA_SITE_KEY is unset the component no-ops: it renders nothing
 * and calls onToken(null) so callers omit captchaToken and Supabase accepts
 * the request (CAPTCHA must also be disabled at the project level in that window).
 */
export default function CaptchaBadge({ onToken, action, resetKey }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const loadedRef = useRef(false);

  const siteKey = getSiteKey();
  const provider = getProvider();

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current) return;

    if (provider === 'turnstile') {
      const ts = (window as any).turnstile as
        | { render: (el: HTMLElement, opts: Record<string, unknown>) => string; reset: (id: string) => void }
        | undefined;
      if (ts && containerRef.current) {
        widgetIdRef.current = ts.render(containerRef.current, {
          sitekey: siteKey,
          action,
          callback: (token: string) => onTokenRef.current(token),
          'error-callback': () => onTokenRef.current(null),
          'expired-callback': () => onTokenRef.current(null),
          theme: 'light',
        });
      }
    } else {
      // hCaptcha: the data attributes on the container handle rendering once
      // the script loads. The callback is set via the global function.
      widgetIdRef.current = 'hcaptcha-widget';
    }
  }, [siteKey, provider, action]);

  useEffect(() => {
    if (!siteKey) {
      onTokenRef.current(null);
      return;
    }

    const scriptSrc = provider === 'turnstile'
      ? 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      : 'https://js.hcaptcha.com/1/api.js';

    const existing = document.querySelector(`script[src="${scriptSrc}"]`);

    if (existing && loadedRef.current) {
      renderWidget();
      return;
    }

    const onScriptLoaded = () => {
      loadedRef.current = true;
      renderWidget();
    };

    if (existing) {
      onScriptLoaded();
    } else {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      script.defer = true;
      script.onload = onScriptLoaded;
      document.head.appendChild(script);
    }

    if (provider === 'hcaptcha') {
      (window as any).onCaptchaVerify = (token: string) => onTokenRef.current(token);
    }

    return () => {
      if (provider === 'hcaptcha') {
        delete (window as any).onCaptchaVerify;
      }
    };
  }, [siteKey, provider, action, renderWidget]);

  // Reset on new attempt (including failures)
  useEffect(() => {
    if (!siteKey || !resetKey || resetKey === 'initial') return;

    if (provider === 'turnstile') {
      const ts = (window as any).turnstile as
        | { reset: (id: string) => void } | undefined;
      if (ts && widgetIdRef.current) {
        onTokenRef.current(null);
        ts.reset(widgetIdRef.current);
      }
    } else {
      const hc = (window as any).hcaptcha as
        | { reset: (id?: string) => void } | undefined;
      if (hc) {
        onTokenRef.current(null);
        hc.reset(widgetIdRef.current || undefined);
      }
    }
  }, [resetKey, siteKey, provider]);

  if (!siteKey) return null;

  if (provider === 'turnstile') {
    return <div ref={containerRef} className="cf-turnstile" />;
  }

  return (
    <div
      ref={containerRef}
      className="h-captcha"
      data-sitekey={siteKey}
      data-callback="onCaptchaVerify"
      data-theme="light"
      data-size="normal"
    />
  );
}