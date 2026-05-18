'use client';

import { useState, useEffect } from 'react';

export interface MetaMap {
  [key: string]: string | null;
}

/**
 * useMeta — React hook to fetch a single post meta value from the API.
 * Used by theme templates to avoid hardcoding field names.
 *
 * @param postId  The post UUID
 * @param key     The meta_key to retrieve
 */
export function useMeta(postId: string | null | undefined, key: string) {
  const [value, setValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!postId || !key) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/posts/${encodeURIComponent(postId)}/meta/${encodeURIComponent(key)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load meta: ${r.status}`);
        return r.json();
      })
      .then((data: { value: string | null }) => {
        if (!cancelled) setValue(data.value);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId, key]);

  return { value, loading, error };
}

/**
 * useAllMeta — React hook to fetch all meta for a post.
 * Returns a map of { key: value } pairs.
 *
 * @param postId  The post UUID
 */
export function useAllMeta(postId: string | null | undefined) {
  const [meta, setMeta] = useState<MetaMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!postId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/posts/${encodeURIComponent(postId)}/meta`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load meta: ${r.status}`);
        return r.json();
      })
      .then((data: { meta: MetaMap }) => {
        if (!cancelled) setMeta(data.meta);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId]);

  return { meta, loading, error };
}
