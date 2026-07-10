export interface SearchQueryParams {
  query?: unknown;
  status?: unknown;
  closing_before?: unknown;
  closing_after?: unknown;
  created_after?: unknown;
  tags?: unknown;
}

/**
 * Builds the query string used to call the search-questions Edge Function
 * from the MCP Edge Function's search_questions tool.
 */
export function buildSearchQueryString(params: SearchQueryParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  if (params.query) searchParams.set('query', params.query as string);
  if (params.status) searchParams.set('status', params.status as string);
  if (params.closing_before) searchParams.set('closing_before', params.closing_before as string);
  if (params.closing_after) searchParams.set('closing_after', params.closing_after as string);
  if (params.created_after) searchParams.set('created_after', params.created_after as string);
  if (Array.isArray(params.tags)) {
    for (const tag of params.tags) searchParams.append('tags', tag as string);
  }
  return searchParams;
}
