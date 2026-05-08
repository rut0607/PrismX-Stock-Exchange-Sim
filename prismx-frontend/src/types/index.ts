export type User = {
  id: string;
  email: string;
  created_at: string;
}

export type Wallet = {
  id: string;
  user_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export type Portfolio = {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  average_buy_price: number;
  created_at: string;
  updated_at: string;
}

export type Order = {
  id: string;
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  status: 'OPEN' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED';
  price: number;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  created_at: string;
  updated_at: string;
}

export type Trade = {
  id: string;
  symbol: string;
  buy_order_id: string;
  sell_order_id: string;
  buyer_id: string;
  seller_id: string;
  price: number;
  quantity: number;
  total_value: number;
  executed_at: string;
}

export type MarketPrice = {
  symbol: string;
  price: number;
  previousClose: number | null;
  changePercent: number | null;
  fetchedAt: string;
}

export type OrderBookLevel = {
  price: number;
  quantity: number;
}

export type OrderBookData = {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number | null;
  depth: { bids: number; asks: number };
}

export type LedgerEntry = {
  id: string;
  user_id: string;
  trade_id: string;
  entry_type: 'DEBIT' | 'CREDIT';
  dimension: 'CASH' | 'SECURITIES';
  symbol: string | null;
  amount: number;
  balance_after: number | null;
  created_at: string;
}

export type LedgerSummary = {
  totalDebits: number;
  totalCredits: number;
  netCashFlow: number;
  totalTradesRecorded: number;
  entries: LedgerEntry[];
}

export type PortfolioSummary = {
  wallet: Wallet;
  holdings: Portfolio[];
  total_invested: number;
}

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
}

export type PlaceOrderInput = {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  price: number;
  quantity: number;
}