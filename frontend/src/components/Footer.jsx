import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.05)',
      padding: '2rem 1rem',
      marginTop: 'auto',
      background: '#0a0a14',
      color: 'var(--text-muted)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Zap size={18} color="#818cf8" />
          <span style={{ fontWeight: '500', color: '#fff' }}>Antigravity</span>
          <span style={{ fontSize: '0.85rem' }}>&copy; {new Date().getFullYear()}</span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.9rem' }}>
          <Link to="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}>Terms of Service</Link>
          <Link to="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}>Privacy Policy</Link>
          <Link to="/refund" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}>Refund Policy</Link>
          <Link to="/contact" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = 'var(--text-muted)'}>Contact Us</Link>
        </div>
      </div>
    </footer>
  );
}
