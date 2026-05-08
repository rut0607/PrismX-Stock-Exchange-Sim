import { apiClient } from './api';
import type { MarketPrice, OrderBookData, Trade, Order, PortfolioSummary, PlaceOrderInput, LedgerSummary } from '../types/index';

export const marketService = {
  async getAllPrices(): Promise<MarketPrice[]> {
    const { data } = await apiClient.get('/market');
    return data.data.prices;
  },

  async getPrice(symbol: string): Promise<MarketPrice> {
    const { data } = await apiClient.get(`/market/${symbol}`);
    return data.data;
  },

  async getOrderBook(symbol: string): Promise<OrderBookData> {
    const { data } = await apiClient.get(`/market/${symbol}/orderbook`);
    return data.data;
  },

  async getTradeTape(symbol?: string, limit = 50): Promise<Trade[]> {
    const params = new URLSearchParams();
    if (symbol) params.append('symbol', symbol);
    params.append('limit', limit.toString());
    const { data } = await apiClient.get(`/market/tape?${params}`);
    return data.data.trades;
  },
};

export const orderService = {
  async placeOrder(order: PlaceOrderInput): Promise<Order> {
    const { data } = await apiClient.post('/orders', order);
    return data.data;
  },

  async getOrders(status?: string): Promise<Order[]> {
    const params = status ? `?status=${status}` : '';
    const { data } = await apiClient.get(`/orders${params}`);
    return data.data.orders;
  },

  async cancelOrder(orderId: string): Promise<Order> {
    const { data } = await apiClient.delete(`/orders/${orderId}`);
    return data.data;
  },
};

export const portfolioService = {
  async getSummary(): Promise<PortfolioSummary> {
    const { data } = await apiClient.get('/portfolio');
    return data.data;
  },
};

export const ledgerService = {
  async getSummary(): Promise<LedgerSummary> {
    const { data } = await apiClient.get('/ledger/summary');
    return data.data;
  },
};