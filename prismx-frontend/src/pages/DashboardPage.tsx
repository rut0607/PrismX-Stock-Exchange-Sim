import { useState, useEffect } from 'react';
import { Briefcase } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { portfolioService, marketService } from '../services/market.service';
import type { PortfolioSummary, Trade, MarketPrice } from '../types/index';
import { formatCurrency, formatCompact, formatPercent } from '../utils/formatCurrency';
import { timeAgo } from '../utils/formatDate';
import { useWebSocket } from '../hooks/useWebSocket';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveTrades, setLiveTrades] = useState<Trade[]>([]);

  useEffect(() => {
    Promise.all([
      portfolioService.getSummary(),
      marketService.getTradeTape(undefined, 10),
      marketService.getAllPrices(),
    ]).then(([p, t, pr]) => {
      setPortfolio(p);
      setTrades(t);
      setPrices(pr);
    }).finally(() => setLoading(false));
  }, []);

  // Real-time trade feed
  useWebSocket('trades.*', (data) => {
    setLiveTrades((prev) => [data as Trade, ...prev].slice(0, 20));
  });

  if (loading) return (
    <PageWrapper title="Dashboard">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading dashboard...</div>
      </div>
    </PageWrapper>
  );

  const totalValue = portfolio
    ? portfolio.wallet.balance + portfolio.total_invested
    : 0;

  const pnl = portfolio
    ? portfolio.wallet.balance - (1000000 - portfolio.total_invested)
    : 0;

  // Build chart data from holdings
  const chartData = portfolio?.holdings.map((h, i) => ({
    name: h.symbol.replace('.NS', ''),
    value: h.quantity * (prices.find(p => p.symbol === h.symbol)?.price ?? h.average_buy_price),
  })) ?? [];

  return (
    <PageWrapper title="Dashboard">
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          {
            label: 'Total Balance',
            value: formatCompact(portfolio?.wallet.balance ?? 0),
            sub: 'Available cash',
            icon: DollarSign,
            color: 'var(--accent-green)',
          },
          {
            label: 'Invested Value',
            value: formatCompact(portfolio?.total_invested ?? 0),
            sub: `${portfolio?.holdings.length ?? 0} positions`,
            icon: Briefcase,
            color: '#A78BFA',
          },
          {
            label: 'Total Trades',
            value: trades.length.toString(),
            sub: 'All time',
            icon: Activity,
            color: 'var(--accent-yellow)',
          },
          {
            label: 'P&L',
            value: formatCompact(Math.abs(pnl)),
            sub: pnl >= 0 ? 'Profit' : 'Loss',
            icon: pnl >= 0 ? TrendingUp : TrendingDown,
            color: pnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
          },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {label}
              </span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={color} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>{value}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px' }}>
        {/* Left: Holdings chart + Market prices */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Portfolio chart */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Portfolio Allocation</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Current holdings by market value
                </p>
              </div>
              <span className="badge-purple">{portfolio?.holdings.length ?? 0} stocks</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: number) => [formatCurrency(val), 'Value']}
                  />
                  <Area type="monotone" dataKey="value" stroke="#7C3AED" strokeWidth={2} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No holdings yet — place your first trade
              </div>
            )}
          </div>

          {/* Market prices */}
          <div className="card">
            <h2 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Market Prices</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {prices.slice(0, 6).map((p) => (
                <div key={p.symbol} className="card-raised" style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {p.symbol.replace('.NS', '')}
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px' }}>
                        {formatCurrency(p.price)}
                      </div>
                    </div>
                    <span className={p.changePercent !== null && p.changePercent >= 0 ? 'badge-green' : 'badge-red'}>
                      {p.changePercent !== null ? formatPercent(p.changePercent) : '—'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live trade tape */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '600' }}>Live Trade Tape</h2>
            <span className="badge-green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-green)', display: 'inline-block' }} />
              Live
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[...liveTrades, ...trades].slice(0, 20).map((trade, i) => (
              <div key={trade.id ?? i} style={{
                padding: '10px 12px',
                background: 'var(--bg-raised)',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                border: i === 0 && liveTrades.length > 0 ? '1px solid rgba(0,212,170,0.2)' : '1px solid transparent',
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '700' }}>
                    {trade.symbol?.replace('.NS', '') ?? trade.symbol}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {trade.quantity} shares
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-green)' }}>
                    {formatCurrency(trade.price)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {timeAgo(trade.executed_at)}
                  </div>
                </div>
              </div>
            ))}
            {trades.length === 0 && liveTrades.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '40px' }}>
                No trades yet
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}