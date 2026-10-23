import { directusUrl, directusAdminToken } from '../config.ts';

// Directus API Request Forwarder with retry, backoff and rate-limit/pressure resilience
export async function directusFetch(path: string, options: RequestInit = {}, retries = 2): Promise<any> {
  if (!directusUrl) {
    throw new Error('DIRECTUS_URL_NOT_CONFIGURED');
  }

  const cleanUrl = directusUrl.replace(/\/$/, '');
  const url = `${cleanUrl}${path.startsWith('/') ? path : '/' + path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (directusAdminToken) {
    headers['Authorization'] = `Bearer ${directusAdminToken}`;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        let parsedMessage = errorText;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson.errors && Array.isArray(errJson.errors) && errJson.errors[0]?.message) {
            parsedMessage = errJson.errors[0].message;
          }
        } catch {}

        const isPressureOrRateLimit =
          res.status === 503 ||
          res.status === 429 ||
          res.status === 502 ||
          res.status === 504 ||
          parsedMessage.includes('Under pressure') ||
          parsedMessage.includes('unavailable') ||
          parsedMessage.includes('rate limit');

        if (isPressureOrRateLimit && attempt < retries) {
          const backoffMs = 500 * Math.pow(2, attempt) + Math.random() * 200;
          console.warn(
            `Directus under pressure (${res.status}: ${parsedMessage}). Retrying in ${Math.round(
              backoffMs
            )}ms (Attempt ${attempt + 1}/${retries})...`
          );
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }

        throw new Error(parsedMessage);
      }

      if (res.status === 204) {
        return { success: true };
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }

      const text = await res.text();
      return { data: text, text };
    } catch (err: any) {
      if (
        attempt < retries &&
        (err.name === 'AbortError' ||
          err.message?.includes('fetch failed') ||
          err.message?.includes('Under pressure') ||
          err.code === 'ECONNRESET' ||
          err.code === 'ETIMEDOUT')
      ) {
        const backoffMs = 400 * Math.pow(2, attempt) + Math.random() * 200;
        await new Promise((r) => setTimeout(r, backoffMs));
        continue;
      }
      throw err;
    }
  }
}

// Fast & Safe Paginated Directus fetcher
export async function directusFetchAllPages(
  basePath: string,
  options: RequestInit = {},
  maxTotal = 50000
): Promise<{ data: any[]; meta?: any }> {
  const PAGE_SIZE = 500;
  const [pathOnly, queryString] = basePath.split('?');
  const params = new URLSearchParams(queryString || '');
  params.set('limit', String(PAGE_SIZE));
  if (!params.has('page')) params.set('page', '1');
  if (!params.has('meta')) params.set('meta', '*');

  const page1Url = `${pathOnly}?${params.toString()}`;
  const page1Res = await directusFetch(page1Url, options).catch(() => null);

  if (!page1Res || !Array.isArray(page1Res.data)) {
    return { data: page1Res?.data || [], meta: page1Res?.meta };
  }

  const allItems = [...page1Res.data];
  const totalCount =
    page1Res.meta?.filter_count ?? page1Res.meta?.total_count ?? page1Res.data.length;

  const targetCount = Math.min(totalCount, maxTotal);
  if (targetCount > page1Res.data.length && page1Res.data.length > 0) {
    const totalPages = Math.ceil(targetCount / PAGE_SIZE);
    const pagePromises = [];
    for (let p = 2; p <= totalPages; p++) {
      const pParams = new URLSearchParams(queryString || '');
      pParams.set('limit', String(PAGE_SIZE));
      pParams.set('page', String(p));
      if (!pParams.has('meta')) pParams.set('meta', '*');
      const pUrl = `${pathOnly}?${pParams.toString()}`;
      pagePromises.push(directusFetch(pUrl, options, 2).catch(() => null));
    }

    const pagesRes = await Promise.all(pagePromises);
    for (const res of pagesRes) {
      if (res && Array.isArray(res.data)) {
        allItems.push(...res.data);
      }
    }
  }

  return {
    data: allItems,
    meta: {
      total_count: totalCount || allItems.length,
      filter_count: totalCount || allItems.length,
    },
  };
}

// Helper chunker for Directus bulk requests
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Resilient Batch Inserter with Micro-Chunk Fallback and Automatic Rate-Limit Pacing
export async function directusSafeBatchInsert(
  collection: string,
  items: any[],
  chunkSize = 50
): Promise<any[]> {
  if (!items || items.length === 0) return [];
  const inserted: any[] = [];
  const chunks = chunkArray(items, chunkSize);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 15));

    try {
      const res = await directusFetch(
        `/items/${collection}`,
        {
          method: 'POST',
          body: JSON.stringify(chunk),
        },
        3
      );

      if (res && Array.isArray(res.data)) {
        inserted.push(...res.data);
      } else if (res && res.data) {
        inserted.push(res.data);
      }
    } catch (err: any) {
      console.warn(
        `Chunk insert failed for ${collection} (size ${chunk.length}): ${err.message}. Retrying in sub-chunks...`
      );
      const subChunks = chunkArray(chunk, 10);
      for (const sub of subChunks) {
        try {
          const subRes = await directusFetch(
            `/items/${collection}`,
            {
              method: 'POST',
              body: JSON.stringify(sub),
            },
            2
          );
          if (subRes && Array.isArray(subRes.data)) {
            inserted.push(...subRes.data);
          } else if (subRes && subRes.data) {
            inserted.push(subRes.data);
          }
        } catch (subErr: any) {
          console.warn(
            `Sub-chunk failed for ${collection}, falling back to single item inserts: ${subErr.message}`
          );
          for (const item of sub) {
            try {
              await new Promise((r) => setTimeout(r, 10));
              const singleRes = await directusFetch(
                `/items/${collection}`,
                {
                  method: 'POST',
                  body: JSON.stringify(item),
                },
                1
              );
              if (singleRes && singleRes.data) {
                inserted.push(singleRes.data);
              }
            } catch (singleErr: any) {
              console.error(`Failed to insert single item into ${collection}:`, singleErr.message);
            }
          }
        }
      }
    }
  }

  return inserted;
}

// Resilient Batch Patcher with Concurrency Control & Delay
export async function directusSafeBatchPatch(
  collection: string,
  patchMap: Map<string, any>,
  chunkSize = 20
) {
  if (patchMap.size === 0) return;
  const items = Array.from(patchMap.values());
  const chunks = chunkArray(items, chunkSize);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 100));

    await Promise.all(
      chunk.map(async (c: any) => {
        try {
          await directusFetch(
            `/items/${collection}/${c.id}`,
            {
              method: 'PATCH',
              body: JSON.stringify(c),
            },
            4
          );
        } catch (err: any) {
          console.warn(`Failed to patch item ${c.id} in ${collection}:`, err.message);
        }
      })
    );
  }
}

// Optimized chunked fetch from Directus to prevent artificial data truncation
export async function fetchAllDirectusItems(
  pathWithoutLimitAndPage: string,
  pageSize = 500,
  maxTotal = 100000,
  concurrency = 3
): Promise<any[]> {
  if (!directusUrl || !directusAdminToken) return [];
  const separator = pathWithoutLimitAndPage.includes('?') ? '&' : '?';
  const metaPath = `${pathWithoutLimitAndPage}${separator}limit=1&meta=*`;
  const metaRes = await directusFetch(metaPath, {}, 1).catch(() => null);
  if (!metaRes || !metaRes.meta) {
    return [];
  }
  const totalCount = metaRes.meta.total_count ?? metaRes.meta.filter_count;
  if (typeof totalCount !== 'number' || totalCount <= 0) return [];

  const targetTotal = Math.min(totalCount, maxTotal);
  const totalPages = Math.ceil(targetTotal / pageSize);
  const allItems: any[] = [];

  for (let i = 1; i <= totalPages; i += concurrency) {
    const pagePromises = [];
    for (let p = i; p < i + concurrency && p <= totalPages; p++) {
      const pagePath = `${pathWithoutLimitAndPage}${separator}limit=${pageSize}&page=${p}`;
      pagePromises.push(directusFetch(pagePath, {}, 1).catch(() => null));
    }
    const pageResults = await Promise.all(pagePromises);
    for (const res of pageResults) {
      if (res && Array.isArray(res.data)) {
        allItems.push(...res.data);
      }
    }
  }
  return allItems;
}
