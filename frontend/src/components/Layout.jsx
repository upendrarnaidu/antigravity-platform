import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CookieConsent from './CookieConsent';
import Footer from './Footer';
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  CalendarDays,
  RefreshCw,
  Film,
  Mic,
  CreditCard,
  MessageSquareShare,
  Link2,
  HelpCircle
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard',  icon: LayoutDashboard, path: '/' },
  { label: 'Campaigns',  icon: Megaphone,       path: '/campaigns' },
  { label: 'Calendar',   icon: CalendarDays,    path: '/calendar' },
  { label: 'Repurpose',  icon: RefreshCw,       path: '/repurpose' },
  { label: 'Video',      icon: Film,            path: '/video' },
  { label: 'Team Chat',  icon: MessageSquareShare, path: '/chat' },
  { label: 'Analytics',  icon: BarChart3,       path: '/analytics' },
  { label: 'Brand Voice', icon: Mic,            path: '/brand-voice' },
  { label: 'Integrations', icon: Link2,         path: '/integrations' },
  { label: 'Pricing',    icon: CreditCard,      path: '/pricing' },
  { label: 'Settings',   icon: Settings,        path: '/settings' },
];

export default function Layout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Derive email initials from stored email (if any)
  const email = localStorage.getItem('user_email') || 'user@example.com';
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="sidebar animate-fade-in-left">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Zap size={18} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div className="sidebar-logo-text">
              AI Marketing<br />
              <span className="sidebar-logo-sub">Automation OS</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Menu</div>
          {/* eslint-disable-next-line no-unused-vars */}
          {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
            const isActive = path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);
            return (
              <button
                key={path}
                className={`nav-link${isActive ? ' active' : ''}`}
                onClick={() => navigate(path)}
              >
                <Icon size={17} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={() => window.open('mailto:support@aimarketing.com')} style={{ marginBottom: '1rem', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)' }}>
            <HelpCircle size={14} />
            Send Feedback
          </button>
          <div className="sidebar-user" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
              <div className="sidebar-avatar">{initials}</div>
              <div className="sidebar-user-email" style={{ flex: 1, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', paddingRight: '0.5rem' }}>{email}</div>
            </div>
            <button 
              onClick={logout} 
              title="Sign Out"
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', overflowY: 'auto' }}>
        <div style={{ flex: 1 }}>{children}</div>
        <Footer />
      </main>
      <CookieConsent />
    </div>
  );
}
