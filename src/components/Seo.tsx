import { useEffect } from 'react';
import { getSeoForPath, SITE_URL_EXPORT, DEFAULT_OG, faqJsonLd } from '../lib/seo';
import { pageview, injectPinterestVerify } from '../lib/analytics';

interface SeoProps {
  pathname: string;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(id: string, data: object | object[]) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

export default function Seo({ pathname }: SeoProps) {
  useEffect(() => {
    const seo = getSeoForPath(pathname);

    const title = seo?.title ?? 'Vow — Wedding Planning App';
    const description = seo?.description ?? 'Plan your entire wedding in one beautiful place.';
    const canonical = `${SITE_URL_EXPORT}${seo?.canonical ?? pathname}`;
    const ogImage = seo?.ogImage ? `${SITE_URL_EXPORT}${seo.ogImage}` : `${SITE_URL_EXPORT}${DEFAULT_OG}`;
    const ogType = seo?.ogType ?? 'website';

    document.title = title;
    setMeta('name', 'description', description);

    if (seo?.noindex) {
      setMeta('name', 'robots', 'noindex, nofollow');
    } else {
      const robotsEl = document.querySelector('meta[name="robots"]');
      if (robotsEl) robotsEl.remove();
    }

    setLink('canonical', canonical);

    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', ogImage);
    setMeta('property', 'og:type', ogType);
    setMeta('property', 'og:site_name', 'Vow Wedding Planner');

    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', ogImage);

    removeJsonLd('seo-jsonld-1');
    removeJsonLd('seo-jsonld-2');
    removeJsonLd('seo-jsonld-faq');

    if (seo?.jsonLd) {
      const blocks = Array.isArray(seo.jsonLd) ? seo.jsonLd : [seo.jsonLd];
      blocks.forEach((block, i) => {
        setJsonLd(`seo-jsonld-${i + 1}`, block);
      });
    }

    if (pathname === '/') {
      setJsonLd('seo-jsonld-faq', faqJsonLd);
    }

    injectPinterestVerify();
    pageview(pathname);
  }, [pathname]);

  return null;
}
