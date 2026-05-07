export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
export const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export const SUPPORTED_SYMBOLS = [
  'TCS.NS', 'RELIANCE.NS', 'INFY.NS', 'HDFCBANK.NS',
  'WIPRO.NS', 'ICICIBANK.NS', 'BAJFINANCE.NS', 'SBIN.NS',
  'ADANIENT.NS', 'HINDUNILVR.NS',
];

export const SYMBOL_NAMES: Record<string, string> = {
  'TCS.NS': 'Tata Consultancy Services',
  'RELIANCE.NS': 'Reliance Industries',
  'INFY.NS': 'Infosys',
  'HDFCBANK.NS': 'HDFC Bank',
  'WIPRO.NS': 'Wipro',
  'ICICIBANK.NS': 'ICICI Bank',
  'BAJFINANCE.NS': 'Bajaj Finance',
  'SBIN.NS': 'State Bank of India',
  'ADANIENT.NS': 'Adani Enterprises',
  'HINDUNILVR.NS': 'Hindustan Unilever',
};