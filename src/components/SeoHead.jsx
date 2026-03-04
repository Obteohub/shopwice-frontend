import { useMemo } from 'react';
import Head from 'next/head';
import { getDefaultOgImage, getSiteName, getSiteUrl, stripTrackingParams } from '@/utils/seo';
import { decodeHtmlEntities } from '@/utils/text';

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'fbclid',
  'msclkid',
  'dclid',
  'yclid',
  '_ga',
]);

const toStringValue = (value) => (typeof value === 'string' ? value.trim() : '');

const toOrigin = (value) => {
  const normalized = toStringValue(value);
  if (!normalized) return '';

  try {
    return new URL(normalized).origin;
  } catch {
    return '';
  }
};

const getFrontendSiteOrigin = () => toOrigin(getSiteUrl());
const isLocalHostname = (value) => ['localhost', '127.0.0.1', '0.0.0.0'].includes(String(value || '').toLowerCase());

const getWpOrigin = () => {
  const wpBase = toStringValue(process.env.NEXT_PUBLIC_WP_API_URL);
  if (!wpBase) return '';

  try {
    return new URL(wpBase).origin;
  } catch {
    return '';
  }
};

const makeAbsoluteUrl = (value) => {
  const raw = toStringValue(value);
  if (!raw) return '';

  const siteUrl = getSiteUrl();

  try {
    if (/^https?:\/\//i.test(raw)) {
      return new URL(raw).toString();
    }

    if (!siteUrl) return raw;

    const base = siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`;
    return new URL(raw.startsWith('/') ? raw.slice(1) : raw, base).toString();
  } catch {
    return raw;
  }
};

export const normalizeCanonicalToFrontend = (canonicalValue) => {
  const absoluteCandidate = makeAbsoluteUrl(canonicalValue);
  if (!absoluteCandidate) return '';

  const frontendOrigin = getFrontendSiteOrigin();
  const wpOrigin = getWpOrigin();

  try {
    const parsed = new URL(absoluteCandidate);
    const frontendUrl = frontendOrigin ? new URL(frontendOrigin) : null;

    if (process.env.NODE_ENV !== 'production' && isLocalHostname(parsed.hostname)) {
      parsed.hash = '';
      const keys = Array.from(parsed.searchParams.keys());
      for (const key of keys) {
        if (TRACKING_PARAMS.has(key.toLowerCase())) {
          parsed.searchParams.delete(key);
        }
      }
      return stripTrackingParams(parsed.toString());
    }

    if (frontendUrl) {
      if (wpOrigin && parsed.origin === wpOrigin) {
        parsed.protocol = frontendUrl.protocol;
        parsed.hostname = frontendUrl.hostname;
        parsed.port = frontendUrl.port;
      } else if (parsed.origin !== frontendOrigin) {
        parsed.protocol = frontendUrl.protocol;
        parsed.hostname = frontendUrl.hostname;
        parsed.port = frontendUrl.port;
      }
    }

    parsed.hash = '';
    const keys = Array.from(parsed.searchParams.keys());
    for (const key of keys) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }

    return stripTrackingParams(parsed.toString());
  } catch {
    return stripTrackingParams(absoluteCandidate);
  }
};

const normalizeRobots = (value) => {
  const robots = toStringValue(value);
  return robots || '';
};

const normalizeMetaValue = (value) => {
  const normalized = toStringValue(value);
  return decodeHtmlEntities(normalized || '');
};

const readSchemaTypes = (schema) => {
  if (!schema || typeof schema !== 'object') return [];

  const collected = [];
  const typeValue = schema['@type'];
  if (Array.isArray(typeValue)) {
    collected.push(...typeValue.map((entry) => toStringValue(entry)).filter(Boolean));
  }
  if (typeof typeValue === 'string') {
    const normalizedType = toStringValue(typeValue);
    if (normalizedType) collected.push(normalizedType);
  }

  const graphNodes = Array.isArray(schema['@graph']) ? schema['@graph'] : [];
  for (const node of graphNodes) {
    if (!node || typeof node !== 'object') continue;
    const nodeType = node['@type'];
    if (typeof nodeType === 'string') {
      const normalizedNodeType = toStringValue(nodeType);
      if (normalizedNodeType) collected.push(normalizedNodeType);
    } else if (Array.isArray(nodeType)) {
      collected.push(...nodeType.map((entry) => toStringValue(entry)).filter(Boolean));
    }
  }

  return Array.from(new Set(collected));
};

export const dedupeJsonLdSchemas = (schemas) => {
  const list = Array.isArray(schemas) ? schemas : [];
  const seenTypes = new Set();
  const output = [];

  for (const schema of list) {
    if (!schema || typeof schema !== 'object') continue;

    const schemaTypes = readSchemaTypes(schema);
    if (!schemaTypes.length) {
      output.push(schema);
      continue;
    }

    const hasDuplicate = schemaTypes.some((type) => seenTypes.has(type));
    if (hasDuplicate) continue;

    schemaTypes.forEach((type) => seenTypes.add(type));
    output.push(schema);
  }

  return output;
};

export const buildSeoHeadModel = (seoData) => {
  const data = seoData && typeof seoData === 'object' ? seoData : {};

  const title = normalizeMetaValue(data.title);
  const description = normalizeMetaValue(data.metaDescription);
  const robots = normalizeRobots(data.robots);
  const siteName = normalizeMetaValue(getSiteName());

  const canonicalCandidate =
    normalizeMetaValue(data.canonical) ||
    normalizeMetaValue(data.ogUrl) ||
    normalizeMetaValue(data.url) ||
    normalizeMetaValue(data.fallbackCanonical);

  const canonical = normalizeCanonicalToFrontend(canonicalCandidate);
  const nextUrl = normalizeCanonicalToFrontend(normalizeMetaValue(data.next));
  const prevUrl = normalizeCanonicalToFrontend(normalizeMetaValue(data.prev));

  const ogImage =
    normalizeMetaValue(data.ogImage) ||
    normalizeMetaValue(getDefaultOgImage());

  if (process.env.NODE_ENV !== 'production') {
    if (title && title !== siteName && (title.length > 70 || title.length < 30)) {
      console.warn(`[SEO] Title length warning (${title.length}): ${title}`);
    }

    if (description && (description.length > 160 || description.length < 50)) {
      console.warn(`[SEO] Meta description length warning (${description.length})`);
    }

    const isPaginated = Boolean(data.isPaginated);
    if (!isPaginated && robots.toLowerCase().includes('noindex')) {
      console.warn('[SEO] Non-paginated page contains noindex robots directive.');
    }
  }

  const metaMap = new Map();

  const addMeta = (key, attributes) => {
    if (!key || metaMap.has(key)) return;
    const contentValue = normalizeMetaValue(attributes.content);
    if (!contentValue) return;
    metaMap.set(key, {
      ...attributes,
      content: contentValue,
    });
  };

  addMeta('name:description', { name: 'description', content: description });

  if (robots) {
    addMeta('name:robots', { name: 'robots', content: robots });
  }

  addMeta('property:og:title', {
    property: 'og:title',
    content: normalizeMetaValue(data.ogTitle) || title,
  });
  addMeta('property:og:description', {
    property: 'og:description',
    content: normalizeMetaValue(data.ogDescription) || description,
  });
  addMeta('property:og:image', {
    property: 'og:image',
    content: ogImage,
  });
  addMeta('property:og:url', {
    property: 'og:url',
    content: normalizeCanonicalToFrontend(normalizeMetaValue(data.ogUrl) || canonical),
  });
  addMeta('property:og:type', {
    property: 'og:type',
    content: normalizeMetaValue(data.ogType),
  });

  addMeta('name:twitter:card', {
    name: 'twitter:card',
    content: normalizeMetaValue(data.twitterCard),
  });
  addMeta('name:twitter:title', {
    name: 'twitter:title',
    content: normalizeMetaValue(data.twitterTitle) || normalizeMetaValue(data.ogTitle) || title,
  });
  addMeta('name:twitter:description', {
    name: 'twitter:description',
    content:
      normalizeMetaValue(data.twitterDescription) ||
      normalizeMetaValue(data.ogDescription) ||
      description,
  });
  addMeta('name:twitter:image', {
    name: 'twitter:image',
    content: normalizeMetaValue(data.twitterImage) || ogImage,
  });

  const linkMap = new Map();

  const addLink = (key, rel, href) => {
    const normalizedHref = normalizeMetaValue(href);
    if (!key || !rel || !normalizedHref || linkMap.has(key)) return;
    linkMap.set(key, { rel, href: normalizedHref });
  };

  addLink('link:canonical', 'canonical', canonical);
  addLink('link:prev', 'prev', prevUrl);
  addLink('link:next', 'next', nextUrl);

  const jsonLd = dedupeJsonLdSchemas(Array.isArray(data.jsonLd) ? data.jsonLd : []);

  return {
    title,
    metaTags: Array.from(metaMap.values()),
    linkTags: Array.from(linkMap.values()),
    jsonLd,
  };
};

/**
 * SEO head renderer.
 * Developer note: Keep exactly one <h1> per page (product/category name only).
 */
const SeoHead = ({ seoData }) => {
  const model = useMemo(() => buildSeoHeadModel(seoData), [seoData]);

  return (
    <Head>
      {model.title ? <title key="seo-title">{model.title}</title> : null}

      {model.metaTags.map((metaTag) => {
        const key = metaTag.name
          ? `meta-name-${metaTag.name}`
          : `meta-property-${metaTag.property}`;
        return <meta key={key} {...metaTag} />;
      })}

      {model.linkTags.map((linkTag) => (
        <link key={`link-${linkTag.rel}`} rel={linkTag.rel} href={linkTag.href} />
      ))}

      {model.jsonLd.map((schema, index) => (
        <script
          key={`jsonld-${readSchemaTypes(schema).join('-') || index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Head>
  );
};

export default SeoHead;

