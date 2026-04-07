import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Megaphone, Activity, ArrowRight,
  CheckCircle2, Clock, Loader2, TrendingUp, FileText,
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    draft:      'badge-draft',
    processing: 'badge-processing',
    completed:  'badge-completed',
    live:       'badge-live',
    publishing: 'badge-publishing',
  };
  return (
    <span className={`badge ${map[status] || 'badge-draft'}`}>
      {status === 'processing' && <Loader2 size={10} className="animate-spin" />}
      {status === 'live'       && <CheckCircle2 size={10} />}
      {status}
    </span>
  );
}

// Deterministic fake activity log from campaigns
function buildActivityLog(campaigns) {
  const events = [];
  campaigns.slice(0, 5).forEach(c => {
    if (c.status === 'completed' || c.status === 'live') {
      events.push({ color: '#34d399', text: `AI finished generating "${c.name}"`, time: 'Recently' });
    }
    if (c.status === 'processing') {
      events.push({ color: '#fbbf24', text: `Agents working on "${c.name}"…`, time: 'In progress' });
    }
    if (c.status === 'live') {
      events.push({ color: '#818cf8', text: `Posts from "${c.name}" are published live`, time: 'Live' });
    }
  });
  if (events.length === 0) {
    events.push({ color: '#94a3b8', text: 'No agent activity yet. Create your first campaign!', time: 'Now' });
  }
  return events;
}

export default function Dashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = React.useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/campaigns`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setCampaigns(await res.json());
    } catch { console.error('Failed to fetch campaigns'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const totalCampaigns = campaigns.length;
  const processingCount = campaigns.filter(c => c.status === 'processing').length;
  const liveCount = campaigns.filter(c => c.status === 'live').length;

  const activityLog = buildActivityLog(campaigns);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your AI agents are standing by.</p>
        </div>
        <button
          id="new-campaign-btn"
          className="btn-primary"
          style={{ width: 'auto' }}
          onClick={() => navigate('/campaigns/new')}
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-4 gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-card-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Megaphone size={20} color="#818cf8" />
          </div>
          <div className="metric-value">{loading ? '—' : totalCampaigns}</div>
          <div className="metric-label">Total Campaigns</div>
          <div className="metric-delta" style={{ color: '#818cf8' }}>
            <TrendingUp size={12} /> All time
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-icon" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Loader2 size={20} color="#fbbf24" />
          </div>
          <div className="metric-value">{loading ? '—' : processingCount}</div>
          <div className="metric-label">Processing Now</div>
          <div className="metric-delta" style={{ color: '#fbbf24' }}>
            <Activity size={12} /> AI Agents Active
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <CheckCircle2 size={20} color="#34d399" />
          </div>
          <div className="metric-value">{loading ? '—' : liveCount}</div>
          <div className="metric-label">Live on Platforms</div>
          <div className="metric-delta" style={{ color: '#34d399' }}>
            <TrendingUp size={12} /> Published
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-icon" style={{ background: 'rgba(168,85,247,0.15)' }}>
            <FileText size={20} color="#c084fc" />
          </div>
          <div className="metric-value">{loading ? '—' : campaigns.filter(c => c.status === 'completed').length}</div>
          <div className="metric-label">Ready to Publish</div>
          <div className="metric-delta" style={{ color: '#c084fc' }}>
            <Clock size={12} /> Awaiting approval
          </div>
        </div>
      </div>

      {/* Main Grid: Campaigns + Activity Feed */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 340px' }}>

        {/* Campaign List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Your Campaigns</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalCampaigns} total</span>
          </div>

          {loading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map(i => <div key={i} className="loading-skeleton" style={{ height: '120px' }} />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
              <Megaphone size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)', display: 'block' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>No campaigns yet</h3>
              <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>Create your first AI-powered campaign to get started.</p>
              <button className="btn-primary" style={{ width: 'auto' }} onClick={() => navigate('/campaigns/new')}>
                <Plus size={16} /> Create Campaign
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {campaigns.map(c => (
                <div
                  key={c.id}
                  className="glass-panel animate-fade-in"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', cursor: 'pointer' }}
                  onClick={() => navigate(`/campaign/${c.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Megaphone size={20} color="#818cf8" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.2rem' }}>{c.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.niche} · {c.target_audience}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={c.status} />
                    <ArrowRight size={16} color="var(--text-muted)" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Agent Activity</h2>
            <Activity size={16} color="var(--text-muted)" />
          </div>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div className="activity-log">
              {activityLog.map((item, i) => (
                <div key={i} className="activity-item">
                  <div className="activity-dot" style={{ background: item.color }} />
                  <div>
                    <div className="activity-text">{item.text}</div>
                    <div className="activity-time">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
