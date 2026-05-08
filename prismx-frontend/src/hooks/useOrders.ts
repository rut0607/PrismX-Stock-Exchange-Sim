import { useState, useEffect, useCallback } from 'react';
import type { Order } from '../types/index';
import { orderService } from '../services/market.service';

export function useOrders(status?: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderService.getOrders(status);
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const cancel = async (orderId: string) => {
    await orderService.cancelOrder(orderId);
    await fetchOrders();
  };

  return { orders, loading, refetch: fetchOrders, cancel };
}