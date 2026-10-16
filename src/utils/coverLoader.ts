import { IMAGE_PROXY_URL } from '../constants';

// In-memory cache for fast reuse across components
const coverCache = new Map<string, string>();

/**
 * Normalizes an Instagram post URL for caching and fetching.
 */
export function normalizePostUrl(url: string): string {
  if (!url) return '';
  return url.trim().replace(/&amp;/g, '&');
}

/**
 * Gets a cached base64 data URL if available.
 */
export function getCachedCover(url: string): string | null {
  const clean = normalizePostUrl(url);
  return coverCache.get(clean) || null;
}

/**
 * Sets a cached base64 data URL.
 */
export function setCachedCover(url: string, dataUrl: string): void {
  const clean = normalizePostUrl(url);
  if (clean && dataUrl) {
    coverCache.set(clean, dataUrl);
  }
}

/**
 * Fetches a single post cover as base64 data URL with retries and timeout.
 */
export async function fetchCoverBase64(
  url: string,
  retries = 2,
  timeoutMs = 8000
): Promise<string | null> {
  const cleanUrl = normalizePostUrl(url);
  if (!cleanUrl) return null;

  if (coverCache.has(cleanUrl)) {
    return coverCache.get(cleanUrl)!;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(
        `${IMAGE_PROXY_URL}?url=${encodeURIComponent(cleanUrl)}`,
        {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal
        }
      );
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const rawText = await response.text();
      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch (e) {
        throw new Error('Response is not JSON');
      }

      if (!json.type?.startsWith('image/') || !json.data) {
        throw new Error('Invalid image response format');
      }

      const dataUrl = `data:${json.type};base64,${json.data}`;

      // Pre-decode image to ensure canvas rasterization is immediate
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = dataUrl;
        if (img.decode) {
          img.decode().then(resolve).catch(resolve);
        } else {
          setTimeout(resolve, 500);
        }
      });

      coverCache.set(cleanUrl, dataUrl);
      return dataUrl;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      } else {
        console.warn(`Cover unavailable for ${cleanUrl.substring(0, 80)}:`, err);
      }
    }
  }

  return null;
}

/**
 * Preloads all covers for a list of URLs with progress callback.
 * Runs concurrently with batching to avoid overwhelming network.
 */
export async function preloadAllCovers(
  urls: string[],
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, string>> {
  const uniqueUrls = Array.from(new Set(urls.map(normalizePostUrl))).filter(Boolean);
  const total = uniqueUrls.length;
  let completed = 0;

  const results = new Map<string, string>();
  if (total === 0) return results;

  onProgress?.(0, total);

  // Concurrency limit of 3
  const CONCURRENCY = 3;
  const queue = [...uniqueUrls];

  const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, async () => {
    while (queue.length > 0) {
      const url = queue.shift()!;
      try {
        const dataUrl = await fetchCoverBase64(url, 2, 8000);
        if (dataUrl) {
          results.set(url, dataUrl);
        }
      } catch (e) {
        // ignore individual failure, placeholder will be used
      } finally {
        completed++;
        onProgress?.(completed, total);
      }
    }
  });

  await Promise.all(workers);
  return results;
}
