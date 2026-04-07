import React, { useState } from 'react';
import { Mic, Type, Sliders, CheckCircle2, Sparkles, Save } from 'lucide-react';

const TONE_OPTIONS = ['Professional', 'Casual', 'Bold', 'Inspirational', 'Humorous', 'Authoritative', 'Friendly', 'Edgy'];
const VOICE_PRESETS = [
  { name: 'Corporate SaaS', tone: 'Professional', desc: 'Clear, jargon-free, data-driven messaging' },
  { name: 'Startup DTC', tone: 'Bold', desc: 'Punchy, emoji-rich, conversational hooks' },
  { name: 'Personal Brand', tone: 'Friendly', desc: 'First-person storytelling, relatable tone' },
];

export default function BrandVoice() {
  const [activeTone, setActiveTone] = useState('Professional');
  const [preferred, setPreferred] = useState('innovative, scalable, ROI-driven, data-backed');
  const [avoid, setAvoid] = useState('cheap, basic, simple, easy');
  const [styleRules, setStyleRules] = useState('Always lead with a bold statement or statistic. Use active voice. Keep sentences under 20 words. End with a clear CTA.');
  const [sampleContent, setSampleContent] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleAnalyze = () => {
    if (!sampleContent.trim()) return;
    setAnalysisResult({
      detectedTone: 'Professional with Casual undertones',
      readability: 'Grade 8 — Accessible',
      avgSentenceLen: '14 words',
      topWords: ['growth', 'platform', 'teams', 'automate', 'scale'],
      suggestion: 'Your content leans slightly formal. Consider adding more conversational hooks for social media engagement.',
    });
  };

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div className="animate-fade-in" style={{ maxWidth: '780px' }}>
      <div className="page-header">
        <h1 className="page-title">Brand Voice</h1>
        <p className="page-subtitle">Define how your AI agents write — tone, vocabulary, and style rules.</p>
      </div>

      {/* Quick Preset Cards */}
      <div className="grid gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {VOICE_PRESETS.map(p => (
          <div
            key={p.name}
            className={`glass-panel cursor-pointer${activeTone === p.tone ? ' ring-active' : ''}`}
            style={{ padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => setActiveTone(p.tone)}
          >
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem' }}>{p.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{p.desc}</div>
            <span className="badge mt-3" style={{
              background: activeTone === p.tone ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
              color: activeTone === p.tone ? '#818cf8' : 'var(--text-muted)',
            }}>{p.tone}</span>
          </div>
        ))}
      </div>

      {/* Tone Selection */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Mic size={13} style={{ display: 'inline', marginRight: '0.4rem', position: 'relative', top: '1px' }} />
          Brand Tone
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {TONE_OPTIONS.map(t => (
            <button
              key={t}
              className={`tone-pill${activeTone === t ? ' active' : ''}`}
              onClick={() => setActiveTone(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Vocabulary */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Type size={13} style={{ display: 'inline', marginRight: '0.4rem', position: 'relative', top: '1px' }} />
          Vocabulary Rules
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div className="input-group">
            <label style={{ color: '#34d399' }}>✓ Preferred Words & Phrases</label>
            <input value={preferred} onChange={e => setPreferred(e.target.value)} placeholder="e.g., innovative, scalable, ROI-driven" />
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ color: '#f87171' }}>✗ Words to Avoid</label>
            <input value={avoid} onChange={e => setAvoid(e.target.value)} placeholder="e.g., cheap, basic, simple" />
          </div>
        </div>
      </div>

      {/* Style Rules */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Sliders size={13} style={{ display: 'inline', marginRight: '0.4rem', position: 'relative', top: '1px' }} />
          Style Rules
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <textarea
            value={styleRules}
            onChange={e => setStyleRules(e.target.value)}
            rows={4}
            placeholder="Describe how AI should write..."
            style={{ resize: 'vertical' }}
          />
        </div>
      </div>

      {/* Content Analyzer */}
      <div className="settings-section">
        <div className="settings-section-title">
          <Sparkles size={13} style={{ display: 'inline', marginRight: '0.4rem', position: 'relative', top: '1px' }} />
          Voice Analyzer — Paste Sample Content
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <textarea
            value={sampleContent}
            onChange={e => setSampleContent(e.target.value)}
            rows={4}
            placeholder="Paste an existing blog post, social caption, or email to analyze your current voice..."
            style={{ resize: 'vertical', marginBottom: '1rem' }}
          />
          <button className="btn-secondary" style={{ width: 'auto' }} onClick={handleAnalyze}>
            <Sparkles size={14} /> Analyze Voice
          </button>

          {analysisResult && (
            <div className="voice-analysis-result mt-4 animate-fade-in">
              <div className="voice-analysis-grid">
                {[
                  { label: 'Detected Tone', value: analysisResult.detectedTone },
                  { label: 'Readability', value: analysisResult.readability },
                  { label: 'Avg Sentence Length', value: analysisResult.avgSentenceLen },
                ].map(item => (
                  <div key={item.label} className="voice-stat">
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Top Words</div>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.topWords.map(w => (
                    <span key={w} className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>{w}</span>
                  ))}
                </div>
              </div>
              <div style={{
                marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 10,
                background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
                fontSize: '0.8rem', color: '#fbbf24', lineHeight: 1.6,
              }}>
                💡 {analysisResult.suggestion}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button className="btn-primary" style={{ width: 'auto', marginTop: '0.5rem' }} onClick={handleSave}>
        {saved ? <><CheckCircle2 size={16} /> Saved!</> : <><Save size={16} /> Save Brand Voice</>}
      </button>
    </div>
  );
}
