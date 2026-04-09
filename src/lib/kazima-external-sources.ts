/**
 * kazima-external-sources.ts
 * ===========================
 * Multi-source retrieval for kazima-ai assistant.
 * Searches Kuwaiti heritage, history, and Islamic article repositories.
 *
 * Sources:
 *  1. Kuwait History Forum      â kuwait-history.net
 *  2. Al-Qabas Newspaper        â alqabas.com
 *  3. CRSK Research Center      â crsk.edu.kw
 *  4. Makhtutat Manuscripts     â makhtutat.com
 *  5. Memory of Kuwait (NLK)    â memoryofkuwait.nlk.gov.kw
 *  6. Kuwait Awqaf Ministry     â cms.awqaf.gov.kw
 *  7. Mugtama Magazine          â mugtama.com
 *  8. Al-Sharekh Archive        â archive.alsharekh.org
 *
 * Usage:
 *   import { retrieveFromExternalSources } from '@/lib/kazima-external-sources'
 *   const results = await retrieveFromExternalSources(query, { maxPerSource: 3 })
 *
 * Env vars (add to Vercel):
 *   TAVILY_API_KEY=tvly-xxxxxxxxxxxx   â Primary method (recommended)
 *   BRAVE_API_KEY=BSAxxxxxxxxxxxxxxxxx  â Fallback
 */

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export interface ExternalSource {
  title: string;
  content: string;
  url: string;
  relevanceScore: number;
  sourceName: string;
  sourceDomain: string;
}

interface FetchResult {
  sources: ExternalSource[];
  error?: string;
}

// âââ Kuwaiti Source Definitions âââââââââââââââââââââââââââââââââââââââââââââ

const KUWAITI_DOMAINS = [
  'kuwait-history.net',
  'alqabas.com',
  'crsk.edu.kw',
  'makhtutat.com',
  'memoryofkuwait.nlk.gov.kw',
  'awqaf.gov.kw',
  'mugtama.com',
  'archive.alsharekh.org',
];

const SOURCE_LABELS: Record<string, string> = {
  'kuwait-history.net':          'ÙÙØªØ¯Ù ØªØ§Ø±ÙØ® Ø§ÙÙÙÙØª',
  'alqabas.com':                 'Ø¬Ø±ÙØ¯Ø© Ø§ÙÙØ¨Ø³',
  'crsk.edu.kw':                 'ÙØ±ÙØ² Ø§ÙØ¨Ø­ÙØ« ÙØ§ÙØ¯Ø±Ø§Ø³Ø§Øª Ø§ÙÙÙÙØªÙØ©',
  'makhtutat.com':               'ÙÙÙØ¹ Ø§ÙÙØ®Ø·ÙØ·Ø§Øª',
  'memoryofkuwait.nlk.gov.kw':  'Ø°Ø§ÙØ±Ø© Ø§ÙÙÙÙØª - Ø§ÙÙÙØªØ¨Ø© Ø§ÙÙØ·ÙÙØ©',
  'awqaf.gov.kw':                'ÙØ±Ø§Ø±Ø© Ø§ÙØ£ÙÙØ§Ù ÙØ§ÙØ´Ø¨Ø§Ù Ø§ÙØ¥Ø³ÙØ§ÙÙØ©',
  'mugtama.com':                 'ÙØ¬ÙØ© Ø§ÙÙØ¬ØªÙØ¹',
  'archive.alsharekh.org':       'Ø£Ø±Ø´ÙÙ Ø§ÙØ´Ø§Ø±Ø®',
};

// âââ METHOD 1: Tavily API (Recommended) âââââââââââââââââââââââââââââââââââââ
// Tavily is purpose-built for RAG. It crawls, indexes, and returns clean
// text passages â no HTML parsing needed.
// Sign up free: https://tavily.com

async function retrieveViaTavily(
  query: string,
  maxResults: number
): Promise<FetchResult> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return { sources: [], error: 'TAVILY_API_KEY not set' };

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_domains: KUWAITI_DOMAINS,
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { sources: [], error: `Tavily HTTP ${res.status}` };

    const data = await res.json();

    const sources: ExternalSource[] = (data.results ?? []).map((r: any) => {
      const domain = extractDomain(r.url);
      return {
        title: r.title ?? '',
        content: r.content ?? '',
        url: r.url ?? '',
        relevanceScore: r.score ?? 0.6,
        sourceName: SOURCE_LABELS[domain] ?? domain,
        sourceDomain: domain,
      };
    });

    return { sources };
  } catch (err: any) {
    return { sources: [], error: err.message };
  }
}

// âââ METHOD 2: Brave Search API (Fallback) ââââââââââââââââââââââââââââââââââ
// Free tier: 2000 queries/month
// Sign up: https://brave.com/search/api/

async function retrieveViaBrave(
  query: string,
  maxResults: number
): Promise<FetchResult> {
  const apiKey = process.env.BRAVE_API_KEY;
  if (!apiKey) return { sources: [], error: 'BRAVE_API_KEY not set' };

  // Build site-restricted query: site:domain1 OR site:domain2 ...
  const siteFilter = KUWAITI_DOMAINS.map(d => `site:${d}`).join(' OR ');
  const fullQuery = `(${siteFilter}) ${query}`;

  try {
    const url = new URL('https://api.search.brave.com/res/v1/web/search');
    url.searchParams.set('q', fullQuery);
    url.searchParams.set('count', String(Math.min(maxResults, 20)));
    url.searchParams.set('search_lang', 'ar');

    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return { sources: [], error: `Brave HTTP ${res.status}` };

    const data = await res.json();

    const sources: ExternalSource[] = (data.web?.results ?? []).map((r: any) => {
      const domain = extractDomain(r.url);
      return {
        title: r.title ?? '',
        content: r.description ?? '',
        url: r.url ?? '',
        relevanceScore: 0.55,
        sourceName: SOURCE_LABELS[domain] ?? domain,
        sourceDomain: domain,
      };
    });

    return { sources };
  } catch (err: any) {
    return { sources: [], error: err.message };
  }
}

// âââ METHOD 3: Direct Site Search (No API key needed) âââââââââââââââââââââââ
// Searches sites that expose search via URL parameters.
// Returns basic metadata â no full text (avoids HTML parsing complexity).

interface DirectSearchConfig {
  name: string;
  domain: string;
  buildUrl: (query: string) => string;
  parseResults: (html: string, baseUrl: string) => ExternalSource[];
}

const DIRECT_SEARCH_SOURCES: DirectSearchConfig[] = [
  {
    name: 'ÙØ¬ÙØ© Ø§ÙÙØ¬ØªÙØ¹',
    domain: 'mugtama.com',
    buildUrl: (q) => `https://mugtama.com/search?search=${encodeURIComponent(q)}`,
    parseResults: (html, base) => parseGenericSearch(html, base, 'mugtama.com', 'ÙØ¬ÙØ© Ø§ÙÙØ¬ØªÙØ¹'),
  },
  {
    name: 'ÙÙØªØ¯Ù ØªØ§Ø±ÙØ® Ø§ÙÙÙÙØª',
    domain: 'kuwait-history.net',
    buildUrl: (q) =>
      `https://www.kuwait-history.net/vb/search.php?do=process&query=${encodeURIComponent(q)}&titleonly=0&forumchoice[]=81`,
    parseResults: (html, base) => parseGenericSearch(html, base, 'kuwait-history.net', 'ÙÙØªØ¯Ù ØªØ§Ø±ÙØ® Ø§ÙÙÙÙØª'),
  },
  {
    name: 'Ø£Ø±Ø´ÙÙ Ø§ÙØ´Ø§Ø±Ø®',
    domain: 'archive.alsharekh.org',
    buildUrl: (q) =>
      `https://archive.alsharekh.org/search?q=${encodeURIComponent(q)}`,
    parseResults: (html, base) => parseGenericSearch(html, base, 'archive.alsharekh.org', 'Ø£Ø±Ø´ÙÙ Ø§ÙØ´Ø§Ø±Ø®'),
  },
];

/**
 * Generic HTML link extractor â pulls <a href> + surrounding text.
 * Works for most Arabic news/forum sites without needing cheerio.
 */
function parseGenericSearch(
  html: string,
  baseUrl: string,
  domain: string,
  sourceName: string
): ExternalSource[] {
  const results: ExternalSource[] = [];

  // Extract <a href="...">title</a> patterns
  const linkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]{5,200}?)<\/a>/gi;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();

  while ((match = linkPattern.exec(html)) !== null && results.length < 5) {
    let href = match[1];
    const rawTitle = match[2].replace(/<[^>]+>/g, '').trim();

    if (!rawTitle || rawTitle.length < 5) continue;
    if (href.startsWith('#') || href.startsWith('javascript:')) continue;
    if (href.startsWith('/')) href = baseUrl + href;
    if (!href.startsWith('http')) continue;
    if (seen.has(href)) continue;

    // Skip navigation links (too short or generic)
    if (/^(Ø§ÙØ±Ø¦ÙØ³ÙØ©|ØªØ³Ø¬ÙÙ|Ø¯Ø®ÙÙ|Ø¨Ø­Ø«|Ø§ØªØµÙ|Ø¹Ù|home|login|search)$/i.test(rawTitle)) continue;

    seen.add(href);
    results.push({
      title: rawTitle,
      content: '', // No snippet available from HTML scrape
      url: href,
      relevanceScore: 0.5,
      sourceName,
      sourceDomain: domain,
    });
  }

  return results;
}

async function retrieveViaDirectSearch(
  query: string,
  maxPerSource: number
): Promise<FetchResult> {
  const allSources: ExternalSource[] = [];
  const errors: string[] = [];

  await Promise.allSettled(
    DIRECT_SEARCH_SOURCES.map(async (cfg) => {
      try {
        const searchUrl = cfg.buildUrl(query);
        const baseUrl = `https://www.${cfg.domain}`;

        const res = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KazimaBot/1.0)',
            'Accept-Language': 'ar,en;q=0.5',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (!res.ok) {
          errors.push(`${cfg.domain}: HTTP ${res.status}`);
          return;
        }

        const html = await res.text();
        const results = cfg.parseResults(html, baseUrl).slice(0, maxPerSource);
        allSources.push(...results);
      } catch (err: any) {
        errors.push(`${cfg.domain}: ${err.message}`);
      }
    })
  );

  return {
    sources: allSources,
    error: errors.length ? errors.join('; ') : undefined,
  };
}

// âââ Main Export ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface RetrievalOptions {
  maxPerSource?: number;  // Max results per source domain (default: 3)
  maxTotal?: number;      // Max total results returned (default: 15)
  method?: 'tavily' | 'brave' | 'direct' | 'auto'; // default: 'auto'
}

/**
 * Primary entry point.
 * Retrieves from Kuwaiti sources using the best available method.
 *
 * Priority: Tavily â Brave â Direct site scraping
 */
export async function retrieveFromExternalSources(
  query: string,
  options: RetrievalOptions = {}
): Promise<ExternalSource[]> {
  const {
    maxPerSource = 3,
    maxTotal = 15,
    method = 'auto',
  } = options;

  let result: FetchResult = { sources: [] };

  if (method === 'tavily' || (method === 'auto' && process.env.TAVILY_API_KEY)) {
    result = await retrieveViaTavily(query, maxTotal);
  } else if (method === 'brave' || (method === 'auto' && process.env.BRAVE_API_KEY)) {
    result = await retrieveViaBrave(query, maxTotal);
  } else {
    // Fallback: direct HTML scraping (no API key required)
    result = await retrieveViaDirectSearch(query, maxPerSource);
  }

  if (result.error) {
    console.warn('[kazima-external-sources] Warning:', result.error);
  }

  return result.sources.slice(0, maxTotal);
}

/**
 * Merge local DB results with external sources.
 * Local results are prioritized (higher weight).
 */
export function mergeAndRankSources<T extends { relevanceScore: number }>(
  localSources: T[],
  externalSources: ExternalSource[],
  maxTotal: number = 10
): Array<T | ExternalSource> {
  // Boost local sources slightly â they are curated
  const boostedLocal = localSources.map(s => ({ ...s, relevanceScore: s.relevanceScore * 1.2 }));

  const merged = [...boostedLocal, ...externalSources];
  merged.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return merged.slice(0, maxTotal);
}

// âââ Helper ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
