const emptyValue = null;

// Cache the dynamic import at module level so it is only resolved once per server process.
let _nodeHtmlParserPromise = null;
const getNodeHtmlParser = () => {
  if (!_nodeHtmlParserPromise) {
    _nodeHtmlParserPromise = import('node-html-parser').catch(() => null);
  }
  return _nodeHtmlParserPromise;
};

export const createEmptySeoData = () => ({
  title: emptyValue,
  metaDescription: emptyValue,
  canonical: emptyValue,
  robots: emptyValue,
  ogTitle: emptyValue,
  ogDescription: emptyValue,
  ogImage: emptyValue,
  ogUrl: emptyValue,
  ogType: emptyValue,
  twitterCard: emptyValue,
  twitterTitle: emptyValue,
  twitterDescription: emptyValue,
  twitterImage: emptyValue,
  prev: emptyValue,
  next: emptyValue,
  jsonLd: [],
});

const normalizeString = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const parseJsonLdContent = (rawValue) => {
  const raw = normalizeString(rawValue);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => item && typeof item === 'object');
    }
    if (parsed && typeof parsed === 'object') {
      return [parsed];
    }
    return [];
  } catch {
    return [];
  }
};

const extractFromBrowserDom = (documentRoot) => {
  const seoData = createEmptySeoData();

  seoData.title = normalizeString(documentRoot.querySelector('title')?.textContent || null);
  seoData.metaDescription = normalizeString(
    documentRoot.querySelector('meta[name="description"]')?.getAttribute('content') || null,
  );
  seoData.canonical = normalizeString(
    documentRoot.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
  );
  seoData.robots = normalizeString(
    documentRoot.querySelector('meta[name="robots"]')?.getAttribute('content') || null,
  );
  seoData.ogTitle = normalizeString(
    documentRoot.querySelector('meta[property="og:title"]')?.getAttribute('content') || null,
  );
  seoData.ogDescription = normalizeString(
    documentRoot.querySelector('meta[property="og:description"]')?.getAttribute('content') || null,
  );
  seoData.ogImage = normalizeString(
    documentRoot.querySelector('meta[property="og:image"]')?.getAttribute('content') || null,
  );
  seoData.ogUrl = normalizeString(
    documentRoot.querySelector('meta[property="og:url"]')?.getAttribute('content') || null,
  );
  seoData.ogType = normalizeString(
    documentRoot.querySelector('meta[property="og:type"]')?.getAttribute('content') || null,
  );
  seoData.twitterCard = normalizeString(
    documentRoot.querySelector('meta[name="twitter:card"]')?.getAttribute('content') || null,
  );
  seoData.twitterTitle = normalizeString(
    documentRoot.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || null,
  );
  seoData.twitterDescription = normalizeString(
    documentRoot.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || null,
  );
  seoData.twitterImage = normalizeString(
    documentRoot.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || null,
  );
  seoData.prev = normalizeString(
    documentRoot.querySelector('link[rel="prev"]')?.getAttribute('href') || null,
  );
  seoData.next = normalizeString(
    documentRoot.querySelector('link[rel="next"]')?.getAttribute('href') || null,
  );

  const jsonLdNodes = Array.from(documentRoot.querySelectorAll('script[type="application/ld+json"]'));
  for (const node of jsonLdNodes) {
    const parsedObjects = parseJsonLdContent(node.textContent || '');
    seoData.jsonLd.push(...parsedObjects);
  }

  return seoData;
};

const extractFromNodeParser = (root) => {
  const seoData = createEmptySeoData();

  seoData.title = normalizeString(root.querySelector('title')?.text || null);
  seoData.metaDescription = normalizeString(
    root.querySelector('meta[name="description"]')?.getAttribute('content') || null,
  );
  seoData.canonical = normalizeString(
    root.querySelector('link[rel="canonical"]')?.getAttribute('href') || null,
  );
  seoData.robots = normalizeString(
    root.querySelector('meta[name="robots"]')?.getAttribute('content') || null,
  );
  seoData.ogTitle = normalizeString(
    root.querySelector('meta[property="og:title"]')?.getAttribute('content') || null,
  );
  seoData.ogDescription = normalizeString(
    root.querySelector('meta[property="og:description"]')?.getAttribute('content') || null,
  );
  seoData.ogImage = normalizeString(
    root.querySelector('meta[property="og:image"]')?.getAttribute('content') || null,
  );
  seoData.ogUrl = normalizeString(
    root.querySelector('meta[property="og:url"]')?.getAttribute('content') || null,
  );
  seoData.ogType = normalizeString(
    root.querySelector('meta[property="og:type"]')?.getAttribute('content') || null,
  );
  seoData.twitterCard = normalizeString(
    root.querySelector('meta[name="twitter:card"]')?.getAttribute('content') || null,
  );
  seoData.twitterTitle = normalizeString(
    root.querySelector('meta[name="twitter:title"]')?.getAttribute('content') || null,
  );
  seoData.twitterDescription = normalizeString(
    root.querySelector('meta[name="twitter:description"]')?.getAttribute('content') || null,
  );
  seoData.twitterImage = normalizeString(
    root.querySelector('meta[name="twitter:image"]')?.getAttribute('content') || null,
  );
  seoData.prev = normalizeString(
    root.querySelector('link[rel="prev"]')?.getAttribute('href') || null,
  );
  seoData.next = normalizeString(
    root.querySelector('link[rel="next"]')?.getAttribute('href') || null,
  );

  const jsonLdNodes = root.querySelectorAll('script[type="application/ld+json"]') || [];
  for (const node of jsonLdNodes) {
    const parsedObjects = parseJsonLdContent(node.innerHTML || node.text || '');
    seoData.jsonLd.push(...parsedObjects);
  }

  return seoData;
};

/**
 * Parses raw RankMath head HTML into a structured SEO object.
 * @param {string | null | undefined} headHtml
 * @returns {Promise<ReturnType<typeof createEmptySeoData>>}
 */
export async function parseSeoHead(headHtml) {
  const rawHead = normalizeString(headHtml);
  if (!rawHead) return createEmptySeoData();

  if (typeof window !== 'undefined' && typeof window.DOMParser !== 'undefined') {
    try {
      const parser = new window.DOMParser();
      const doc = parser.parseFromString(rawHead, 'text/html');
      return extractFromBrowserDom(doc);
    } catch {
      return createEmptySeoData();
    }
  }

  try {
    const nodeHtmlParser = await getNodeHtmlParser();
    if (!nodeHtmlParser) return createEmptySeoData();
    const root = nodeHtmlParser.parse(rawHead, {
      script: true,
      style: false,
      lowerCaseTagName: true,
      comment: false,
    });

    return extractFromNodeParser(root);
  } catch {
    return createEmptySeoData();
  }
}
