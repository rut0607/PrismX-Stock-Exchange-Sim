import { useAuth } from '../../hooks/useAuth';
import { formatCompact } from '../../utils/formatCurrency';
import { useState, useEffect } from 'react';
import { portfolioService } from '../../services/market.service';
import type { Wallet } from '../../types/index';

export default function Navbar({ title }: { title: string }) {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);

  useEffect(() => {
    portfolioService.getSummary().then((s) => setWallet(s.wallet)).catch(() => {});
  }, []);

  return (
    <header style={{
      height: '60px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <h1 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
        {title}
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {wallet && (
          <div style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Balance</span>
            <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--accent-green)' }}>
              {formatCompact(wallet.balance)}
            </span>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7C3AED, #00D4AA)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: '700',
            color: 'white',
          }}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {user?.email?.split('@')[0]}
          </span>
        </div>
      </div>
    </header>
  );
}