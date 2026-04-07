import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, TrendingUp, Zap, Users } from 'lucide-react';

// Minimal SVG line chart (no external lib)
function LineChart({ data, color = '#6366f1' }) {
  const W = 600, H = 160, PAD = 20;
  if (!data || data.length < 2) return (
    <div style={{ height: H, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
      No data yet
    </div>
  );
  const max = Math.max(...data.map(d => d.value), 1);
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2));
  const ys = data.map(d => H - PAD - (d.value / max) * (H - PAD * 2));
  const polyline = xs.map((x, i) => `${x},${ys[i]}`).join(' ');
  const area = `${xs[0]},${H - PAD} ` + xs.map((x, i) => `${x},${ys[i]}`).join(' ') + ` ${xs[xs.length - 1]},${H - PAD}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#chartGrad)" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ strokeDasharray: 1000, strokeDashoffset: 0, animation: 'chartDraw 1.5s ease-out forwards' }}
      />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r="4" fill={color} />
      ))}
      {data.map((d, i) => (
        <text key={i} x={xs[i]} y={H - 2} textAnchor="middle" fill="#94a3b8" fontSize="11">{d.label}</text>
      ))}
    </svg>
  );
}

const AI_INSIGHTS = [
  { text: 'Campaigns with "Professional" tone receive 32% more engagement on LinkedIn.' },
  { text: 'SaaS audience posts perform best between 9–11 AM local time.' },
  { text: 'Campaigns with 3+ platform posts get 2x the reach of single-platform ones.' },
  { text: 'Strategy Agent confidence is highest when goals exceed 20 words.' },
];

export default function Analytics() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/v1/campaigns`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setCampaigns(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  // Build chart data from campaigns
  const chartData = campaigns.slice(-8).map((c, i) => ({
    label: `C${i + 1}`,
    value: c.status === 'live' ? 3 : c.status === 'completed' ? 2 : c.status === 'processing' ? 1 : 0,
  }));

  const liveCount = campaigns.filter(c => c.status === 'live').length;
  const completedCount = campaigns.filter(c => c.status === 'completed').length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Campaign performance and AI-generated insights.</p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        {[
          { label: 'Total Campaigns',   value: campaigns.length, icon: BarChart3,  color: '#818cf8' },
          { label: 'Published Live',     value: liveCount,        icon: TrendingUp, color: '#34d399' },
          { label: 'Drafts Ready',       value: completedCount,   icon: Zap,        color: '#fbbf24' },
          { label: 'AI Agents Used',     value: campaigns.length * 5, icon: Users,  color: '#f472b6' },
        // eslint-disable-next-line no-unused-vars
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="metric-card">
            <div className="metric-card-icon" style={{ background: `${color}22` }}>
              <Icon size={20} color={color} />
            </div>
            <div className="metric-value">{loading ? '—' : value}</div>
            <div className="metric-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Chart */}
        <div className="glass-panel">
          <div className="flex justify-between items-center mb-4">
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Campaign Activity</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 8 campaigns</span>
          </div>
          <div className="chart-container">
            {loading
              ? <div className="loading-skeleton" style={{ height: '100%', borderRadius: '12px' }} />
              : <LineChart data={chartData.length ? chartData : []} color="#6366f1" />
            }
          </div>
          <div className="flex gap-6 mt-4" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>■ 3 = Live &nbsp; ■ 2 = Completed &nbsp; ■ 1 = Processing</span>
          </div>
        </div>

        {/* AI Insights */}
        <div>
          <div className="ai-insights-card">
            <div className="ai-insights-header">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Zap size={18} color="#c4b5fd" />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>AI Insights</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Learning Agent Observations</div>
              </div>
            </div>
            {AI_INSIGHTS.map((ins, i) => (
              <div key={i} className="ai-insight-row">
                <div className="ai-insight-dot" />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{ins.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      {campaigns.length > 0 && (
        <div className="glass-panel mt-6">
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem' }}>All Campaigns</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
                {['Name', 'Niche', 'Audience', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1rem', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{c.niche}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>{c.target_audience}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
