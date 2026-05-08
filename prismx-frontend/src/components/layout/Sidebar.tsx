import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingCart,
  Briefcase,
  BookOpen,
  BarChart2,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/market', icon: TrendingUp, label: 'Market' },
  { to: '/trading', icon: ShoppingCart, label: 'Trading' },
  { to: '/portfolio', icon: Briefcase, label: 'Portfolio' },
  { to: '/ledger', icon: BookOpen, label: 'Ledger' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <aside style={{
      width: '64px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 0',
      gap: '4px',
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        width: '36px',
        height: '36px',
        background: 'linear-gradient(135deg, #7C3AED, #00D4AA)',
        borderRadius: '10px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: '800',
        color: 'white',
      }}>P</div>

      {/* Nav items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', alignItems: 'center' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            style={({ isActive }) => ({
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isActive ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
              color: isActive ? '#A78BFA' : 'var(--text-muted)',
              transition: 'all 0.2s',
              textDecoration: 'none',
            })}
          >
            <Icon size={18} />
          </NavLink>
        ))}
      </nav>

      {/* Bottom actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        <button
          title="Settings"
          style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'transparent', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Settings size={18} />
        </button>
        <button
          title="Logout"
          onClick={logout}
          style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'transparent', color: 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}