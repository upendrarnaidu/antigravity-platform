import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  ChevronRight, ChevronLeft, Rocket, Search,
  PenLine, Image, Globe, CheckCircle2, Loader2, Activity,
} from 'lucide-react';

const AGENTS = [
  { id: 'strategy',  name: 'Strategy Agent',  icon: Rocket,       color: '#818cf8', desc: 'Formulates campaign angles and goals' },
  { id: 'research',  name: 'Research Agent',   icon: Search,       color: '#34d399', desc: 'Discovers trending topics in your niche' },
  { id: 'content',   name: 'Content Agent',    icon: PenLine,      color: '#fbbf24', desc: 'Writes high-converting copy drafts' },
  { id: 'media',     name: 'Creative Agent',   icon: Image,        color: '#f472b6', desc: 'Generates AI image prompts (Midjourney/DALL·E)' },
  { id: 'platform',  name: 'Platform Agent',   icon: Globe,        color: '#60a5fa', desc: 'Formats posts for Twitter, LinkedIn, Instagram' },
];

const TONES = ['Professional', 'Casual', 'Humorous', 'Inspirational', 'Bold'];

const STEP_LABELS = ['Goals & Audience', 'Agent Config', 'Launch'];

function WizardSteps({ currentStep }) {
  return (
    <div className="wizard-steps">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const isDone = currentStep > step;
        const isActive = currentStep === step;
        return (
          <React.Fragment key={step}>
            <div className={`wizard-step${isActive ? ' active' : ''}${isDone ? ' done' : ''}`}>
              <div className="wizard-step-circle">
                {isDone ? <CheckCircle2 size={18} /> : step}
              </div>
              <div className="wizard-step-label">{label}</div>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`wizard-connector${isDone ? ' done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function CampaignWizard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState(null);
  const [isLaunching, setIsLaunching] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    niche: '',
    audience: '',
    goals: '',
    tone: 'Professional',
  });

  const [selectedAgents, setSelectedAgents] = useState(
    AGENTS.reduce((acc, a) => ({ ...acc, [a.id]: true }), {})
  );

  const toggleAgent = (id) => {
    // strategy is always required
    if (id === 'strategy') return;
    setSelectedAgents(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStep1Next = (e) => {
    e.preventDefault();
    setStep(2);
  };

  const handleLaunch = async () => {
    if (isLaunching) return;
    setIsLaunching(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create campaign');
      // Animate step 3
      setStep(3);
      setTimeout(() => navigate(`/campaign/${data.campaign_id}`), 2200);
    } catch (err) {
      setError(err.message);
      setIsLaunching(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">New Campaign</h1>
        <p className="page-subtitle">Configure your AI campaign in 3 steps.</p>
      </div>

      <WizardSteps currentStep={step} />

      {/* ── Step 1: Goals & Audience ── */}
      {step === 1 && (
        <div className="glass-panel animate-fade-in">
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Goals &amp; Audience</h3>
          <form onSubmit={handleStep1Next}>
            <div className="input-group">
              <label>Campaign Name</label>
              <input
                id="campaign-name"
                required
                placeholder="e.g. Q4 Holiday Launch"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="flex gap-4">
              <div className="input-group flex-1">
                <label>Niche / Industry</label>
                <input
                  id="campaign-niche"
                  required
                  placeholder="e.g. SaaS, Fitness"
                  value={formData.niche}
                  onChange={e => setFormData({ ...formData, niche: e.target.value })}
                />
              </div>
              <div className="input-group flex-1">
                <label>Target Audience</label>
                <input
                  id="campaign-audience"
                  required
                  placeholder="e.g. Tech Founders"
                  value={formData.audience}
                  onChange={e => setFormData({ ...formData, audience: e.target.value })}
                />
              </div>
            </div>
            <div className="input-group">
              <label>Brand Tone</label>
              <div className="flex flex-wrap gap-3">
                {TONES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData({ ...formData, tone: t })}
                    style={{
                      padding: '0.45rem 1rem',
                      borderRadius: '99px',
                      border: `1px solid ${formData.tone === t ? 'var(--primary)' : 'var(--glass-border)'}`,
                      background: formData.tone === t ? 'rgba(99,102,241,0.2)' : 'rgba(0,0,0,0.2)',
                      color: formData.tone === t ? 'var(--primary)' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="input-group">
              <label>Campaign Goals</label>
              <textarea
                id="campaign-goals"
                rows={3}
                required
                placeholder="What do you want to achieve? e.g. drive webinar signups, increase brand awareness..."
                value={formData.goals}
                onChange={e => setFormData({ ...formData, goals: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <button type="submit" id="step1-next" className="btn-primary" style={{ width: 'auto' }}>
                Next: Agent Config <ChevronRight size={16} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Step 2: Agent Config ── */}
      {step === 2 && (
        <div className="glass-panel animate-fade-in">
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>Agent Configuration</h3>
          <p className="text-muted mb-4" style={{ fontSize: '0.875rem' }}>
            Select which AI agents to activate. Strategy is always enabled.
          </p>
          <div className="agent-toggle-grid mb-6">
            {/* eslint-disable-next-line no-unused-vars */}
            {AGENTS.map(({ id, name, icon: Icon, color, desc }) => (
              <div
                key={id}
                className={`agent-toggle-card${selectedAgents[id] ? ' selected' : ''}`}
                onClick={() => toggleAgent(id)}
              >
                <div className="agent-toggle-card-icon" style={{ background: `${color}22` }}>
                  <Icon size={18} color={color} />
                </div>
                <div className="agent-toggle-name">{name}</div>
                <div className="agent-toggle-desc">{desc}</div>
                {id === 'strategy' && (
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Always on</span>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>
          )}

          <div className="flex justify-between">
            <button className="btn-secondary" onClick={() => setStep(1)}>
              <ChevronLeft size={16} /> Back
            </button>
            <button id="launch-agents-btn" className="btn-primary" style={{ width: 'auto' }} onClick={handleLaunch}>
              <Rocket size={16} /> Launch AI Agents
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Launching ── */}
      {step === 3 && (
        <div className="glass-panel animate-fade-in text-center" style={{ padding: '4rem 2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <Activity
              size={56}
              color="var(--primary)"
              style={{ margin: '0 auto', display: 'block' }}
              className="animate-pulse-glow"
            />
          </div>
          <h2 style={{ marginBottom: '0.75rem' }}>Agents Deployed!</h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Your AI pipeline is now running. Redirecting to your campaign...
          </p>
          <Loader2 size={20} style={{ margin: '1rem auto 0', display: 'block', color: 'var(--primary)' }} className="animate-spin" />
        </div>
      )}
    </div>
  );
}
