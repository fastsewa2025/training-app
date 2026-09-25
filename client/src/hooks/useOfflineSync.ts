/**
 * Offline-first sync hook
 * Stores last successful API response in AsyncStorage.
 * When offline, serves from cache with a staleness indicator.
 */
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 h

export function useOfflineSync<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFromCache = useCallback(async (): Promise<T | null> => {
    try {
      const raw = await AsyncStorage.getItem(`offline_${cacheKey}`);
      if (!raw) return null;
      const entry: CacheEntry<T> = JSON.parse(raw);
      const age = Date.now() - entry.cachedAt;
      setIsStale(age > MAX_AGE_MS);
      return entry.data;
    } catch {
      return null;
    }
  }, [cacheKey]);

  const saveToCache = useCallback(
    async (d: T) => {
      try {
        const entry: CacheEntry<T> = { data: d, cachedAt: Date.now() };
        await AsyncStorage.setItem(`offline_${cacheKey}`, JSON.stringify(entry));
      } catch {}
    },
    [cacheKey]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const netState = await NetInfo.fetch();
    const online = netState.isConnected && netState.isInternetReachable;
    setIsOffline(!online);

    if (!online) {
      // Serve from cache when offline
      const cached = await loadFromCache();
      if (cached) {
        setData(cached);
        setIsStale(true);
      } else {
        setError("No cached data available. Connect to the internet.");
      }
      setLoading(false);
      return;
    }

    try {
      const fresh = await fetchFn();
      setData(fresh);
      setIsStale(false);
      await saveToCache(fresh);
    } catch (e: any) {
      // Network error — fall back to cache
      const cached = await loadFromCache();
      if (cached) {
        setData(cached);
        setIsStale(true);
      } else {
        setError(e.message || "Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn, loadFromCache, saveToCache]);

  // `deps` is caller-supplied on purpose (like a query key) so the caller
  // controls exactly when a refetch happens. `load`'s identity changes
  // whenever fetchFn does, so including it here would refire on every
  // render instead of only when the caller's deps actually change.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    load();
  }, deps);
  /* eslint-enable react-hooks/exhaustive-deps */

  return { data, loading, isStale, isOffline, error, refetch: load };
}
