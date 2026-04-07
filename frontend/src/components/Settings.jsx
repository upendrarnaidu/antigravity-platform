import React, { useState } from 'react';
import { CheckCircle2, Link2, KeyRound, Building2, Crown } from 'lucide-react';

const PLATFORMS = [
  { id: 'twitter',   name: 'Twitter / X',  emoji: '𝕏',  color: '#1d9bf0', desc: 'Post and schedule tweets' },
  { id: 'linkedin',  name: 'LinkedIn',     emoji: 'in', color: '#0a66c2', desc: 'Professional campaigns & articles' },
  { id: 'instagram', name: 'Instagram',    emoji: '📸', color: '#e1306c', desc: 'Visual posts and stories' },
];

function PlatformCard({ platform }) {
  const [connected, setConnected] = useState(false);
  return (
    <div className="platform-connect-card">
      <div className="platform-connect-info">
        <div
          className="platform-connect-icon"
          style={{ background: `${platform.color}22`, color: platform.color, fontWeight: 700, fontSize: '1rem' }}
        >
          {platform.emoji}
        </div>
        <div>
          <div className="platform-connect-name">{platform.name}</div>
          <div className={`platform-connect-status${connected ? ' connected' : ''}`}>
            {connected
              ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><CheckCircle2 size={12} /> Connected</span>
              : platform.desc
            }
          </div>
        </div>
      </div>
      <button
        className={connected ? 'btn-danger' : 'btn-secondary'}
        style={{ width: 'auto', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
        onClick={() => setConnected(v => !v)}
      >
        {connected ? 'Disconnect' : <><Link2 size={13} /> Connect</>}
      </button>
    </div>
  );
}

export default function Settings() {
  const email = localStorage.getItem('user_email') || 'user@example.com';
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [openaiKey, setOpenaiKey] = useState('');
  const [pineconeKey, setPineconeKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '720px' }}>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your workspace, integrations, and API keys.</p>
      </div>

      {/* Workspace */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Building2 size={13} style={{ display: 'inline', marginRight: '0.4rem', position: 'relative', top: '1px' }} />
          Workspace
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Current Plan</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Upgrade for higher quotas and priority processing</div>
            </div>
            <span className="badge badge-free">Free Tier</span>
          </div>
          <div className="divider" />
          <div className="input-group" style={{ marginBottom: '0' }}>
            <label>Workspace Name</label>
            <input
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              placeholder="My Workspace"
            />
          </div>
          <div className="input-group mt-4" style={{ marginBottom: '0' }}>
            <label>Account Email</label>
            <input value={email} disabled style={{ opacity: 0.6 }} />
          </div>
        </div>
      </div>

      {/* Platform Connections */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Link2 size={13} style={{ display: 'inline', marginRight: '0.4rem', position: 'relative', top: '1px' }} />
          Platform Connections
        </div>
        {PLATFORMS.map(p => <PlatformCard key={p.id} platform={p} />)}
      </div>

      {/* API Keys */}
      <div className="settings-section">
        <div className="settings-section-title">
          <KeyRound size={13} style={{ display: 'inline', marginRight: '0.4rem', position: 'relative', top: '1px' }} />
          API Integration Keys
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'rgba(34, 197, 94, 0.05)' }}>
          <p style={{ color: '#22c55e', fontSize: '0.9rem', marginBottom: '0' }}>
            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: '0.4rem', position: 'relative', top: '2px' }} />
            API Keys are securely managed and rotated by your administrative backend orchestrator. Individual users do not need to provide their own keys to chat with the Team.
          </p>
        </div>
      </div>

      {/* Upgrade Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.12))',
        border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
      }}>
        <div className="flex items-center gap-3">
          <Crown size={24} color="#c084fc" />
          <div>
            <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>Upgrade to Pro</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Unlock GPT-4o, priority agents, advanced analytics & team workspaces.</div>
          </div>
        </div>
        <button className="btn-primary" style={{ width: 'auto', flexShrink: 0 }}>
          Upgrade Plan
        </button>
      </div>
    </div>
  );
}
