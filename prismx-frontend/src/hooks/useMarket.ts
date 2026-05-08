import { useState, useEffect, useCallback } from 'react';
import type { MarketPrice } from '../types/index';
import { marketService } from '../services/market.service';

export function useMarket(refreshInterval = 15000) {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const data = await marketService.getAllPrices();
      setPrices(data);
      setError(null);
    } catch {
      setError('Failed to fetch market prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  return { prices, loading, error, refetch: fetchPrices };
}