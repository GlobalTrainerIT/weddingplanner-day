const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
const GSC_TOKEN = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION as string | undefined;
const PINTEREST_VERIFY = import.meta.env.VITE_PINTEREST_DOMAIN_VERIFY as string | undefined;

let gaInitialized = false;

function ensureGA4() {
  if (gaInitialized || !GA_ID) return;
  gaInitialized = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false });
}

function pageview(url: string) {
  if (!GA_ID || !window.gtag) return;
  window.gtag('event', 'page_view', { page_path: url, page_location: `https://weddingplanner.day${url}` });
}

type TrackParams = Record<string, string | number | boolean | undefined>;

function track(event: string, params?: TrackParams) {
  if (!GA_ID || !window.gtag) return;
  window.gtag('event', event, params);
}

function injectGscToken() {
  if (!GSC_TOKEN) return;
  let el = document.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'google-site-verification');
    document.head.appendChild(el);
  }
  el.setAttribute('content', GSC_TOKEN);
}

function injectPinterestVerify() {
  if (!PINTEREST_VERIFY) return;
  let el = document.querySelector('meta[name="p:domain_verify"]') as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'p:domain_verify');
    document.head.appendChild(el);
  }
  el.setAttribute('content', PINTEREST_VERIFY);
}

export { ensureGA4, pageview, track, injectGscToken, injectPinterestVerify, GA_ID };
