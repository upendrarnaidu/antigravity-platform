import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Facebook, Instagram, Linkedin, Twitter, MessageCircle, Video, CheckCircle2, Link2, Unlink, Loader2 } from 'lucide-react';

const PLATFORMS = [
  { id: 'Facebook', name: 'Facebook Page', icon: Facebook, color: '#1877F2', desc: 'Publish posts and track page engagement automatically.' },
  { id: 'WhatsApp', name: 'WhatsApp Business', icon: MessageCircle, color: '#25D366', desc: 'Broadcast messages and automated conversational marketing.' },
  { id: 'Instagram', name: 'Instagram Creator/Business', icon: Instagram, color: '#E1306C', desc: 'Auto-publish Reels, Stories, and highly aesthetic feed content.' },
  { id: 'LinkedIn', name: 'LinkedIn Company', icon: Linkedin, color: '#0A66C2', desc: 'Professional thought-leadership and B2B B2C posting pipelines.' },
  { id: 'Twitter', name: 'X (Twitter)', icon: Twitter, color: '#1DA1F2', desc: 'High-frequency thread generation and analytical sentiment tracking.' },
  { id: 'TikTok', name: 'TikTok', icon: Video, color: '#ff0050', desc: 'Direct webhook posting for generated short-form video content.' }
];

export default function Integrations() {
  const { token } = useAuth();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [modalPlatform, setModalPlatform] = useState(null);
  const [formData, setFormData] = useState({ account_id: '', access_token: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/social-accounts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setConnections(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = (platformId) => {
    return connections.find(c => c.platform === platformId);
  };

  const handleConnectClick = (platformId) => {
    setModalPlatform(platformId);
    setFormData({ account_id: '', access_token: '' });
    setError(null);
  };

  const handleSaveConnection = async (e) => {
    e.preventDefault();
    if (!formData.account_id || !formData.access_token) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/social-accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          platform: modalPlatform,
          account_id: formData.account_id,
          access_token: formData.access_token,
          account_name: `${modalPlatform} Account (${formData.account_id.substring(0,6)})`
        })
      });
      
      if (!res.ok) throw new Error('Failed to connect account.');
      
      await fetchConnections();
      setModalPlatform(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (id) => {
    if (!confirm('Are you sure you want to disconnect this platform? Automations will fail.')) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/v1/social-accounts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchConnections();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Social Integrations</h1>
          <p className="page-subtitle">Connect your platforms to enable autonomous multi-channel publishing.</p>
        </div>
      </div>

      <div className="grid grid-3 gap-6">
        {PLATFORMS.map(p => {
          const IconObj = p.icon;
          const connectedMeta = isConnected(p.id);

          return (
            <div key={p.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '10px', 
                    background: `${p.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    <IconObj size={20} color={p.color} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{p.name}</h3>
                </div>
                {connectedMeta ? (
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(34,197,94,0.1)', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Active
                  </span>
                ) : null}
              </div>
              
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5, flex: 1 }}>
                {p.desc}
              </p>
              
              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {connectedMeta ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ID: {connectedMeta.account_id}
                    </div>
                    <button 
                      onClick={() => handleDisconnect(connectedMeta.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                      <Unlink size={14} /> Disconnect
                    </button>
                  </div>
                ) : (
                  <button 
                    className="btn-primary" 
                    style={{ width: '100%', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => handleConnectClick(p.id)}
                  >
                    <Link2 size={16} /> Connect {p.id}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connection Modal */}
      {modalPlatform && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-scale-in" style={{ padding: '2rem', width: '100%', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Connect {modalPlatform}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Due to pending API review status, please manually provide your long-lived Access Token and Account ID (e.g., WABA ID for WhatsApp, or Page ID for Facebook).
            </p>

            {error && <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

            <form onSubmit={handleSaveConnection}>
              <div className="input-group">
                <label>Account ID / Node ID</label>
                <input 
                  type="text" 
                  placeholder={`e.g. 1029384756_${modalPlatform.toLowerCase()}`}
                  value={formData.account_id}
                  onChange={e => setFormData({...formData, account_id: e.target.value})}
                  required 
                />
              </div>
              <div className="input-group">
                <label>Permanent Access Token</label>
                <input 
                  type="password" 
                  placeholder="EAAI...xZCQ..."
                  value={formData.access_token}
                  onChange={e => setFormData({...formData, access_token: e.target.value})}
                  required 
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setModalPlatform(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Connect Platform'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
