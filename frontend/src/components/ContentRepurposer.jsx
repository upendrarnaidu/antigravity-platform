import React, { useState } from 'react';
import { RefreshCw, FileText, Sparkles, Copy, Twitter, Linkedin, Instagram, ArrowRight, Loader2 } from 'lucide-react';

const PLATFORMS = [
  { id: 'twitter', name: 'Twitter / X', icon: Twitter, color: '#1d9bf0', maxLen: 280 },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0a66c2', maxLen: 3000 },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#e1306c', maxLen: 2200 },
];

const DEMO_RESULTS = {
  twitter: [
    '🚀 Stop wasting hours on content creation. Our AI agents generate multi-platform campaigns in minutes — not days.\n\nThe future of marketing is autonomous.\n\n#AIMarketing #ContentAutomation',
    '📊 The numbers don\'t lie:\n\n→ 5x faster content production\n→ 32% higher engagement\n→ 3 platforms, 1 brief\n\nThis is what happens when AI agents do your marketing.\n\n#MarTech #AI',
    '💡 What if your marketing team had 5 AI specialists working 24/7?\n\nStrategy. Research. Content. Creative. Publishing.\n\nThat\'s exactly what we built. Thread 🧵👇',
  ],
  linkedin: [
    'I used to spend 6 hours creating a single multi-platform campaign.\n\nNow it takes 6 minutes.\n\nHere\'s what changed: We built an AI orchestration engine with 5 specialized agents that work together — Strategy, Research, Content, Creative, and Platform Formatter.\n\nEach agent has a specific role. Each learns from past performance. Together, they produce campaigns that consistently outperform manually-created content.\n\nThe key insight? It\'s not about replacing marketers. It\'s about giving them superpowers.\n\n#AIMarketing #MarketingAutomation #ContentStrategy',
  ],
  instagram: [
    '✨ Meet your new marketing team — powered entirely by AI.\n\n5 specialized agents.\n3 platforms.\n1 brief.\nEndless possibilities.\n\nSwipe to see how it works →\n\n#AIMarketing #ContentCreation #MarketingAutomation #SaaS #StartupLife #DigitalMarketing #ContentStrategy',
  ],
};

function GeneratedPost({ content, platform }) {
  const [copied, setCopied] = useState(false);
  const Icon = PLATFORMS.find(p => p.id === platform)?.icon || FileText;
  const color = PLATFORMS.find(p => p.id === platform)?.color || '#818cf8';

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="repurpose-result-card animate-fade-in">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} color={color} />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>{platform}</span>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{content.length} chars</span>
        </div>
        <button className="btn-ghost" style={{ fontSize: '0.75rem' }} onClick={handleCopy}>
          <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: '#d1d5db', whiteSpace: 'pre-wrap' }}>
        {content}
      </div>
    </div>
  );
}

export default function ContentRepurposer() {
  const [inputText, setInputText] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [mode, setMode] = useState('text'); // 'text' or 'url'
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState(['twitter', 'linkedin', 'instagram']);

  const togglePlatform = (id) => {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const filtered = {};
      selectedPlatforms.forEach(p => { filtered[p] = DEMO_RESULTS[p] || []; });
      setResults(filtered);
      setGenerating(false);
    }, 2500);
  };

  const totalPosts = results ? Object.values(results).flat().length : 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Content Repurposer</h1>
        <p className="page-subtitle">Transform blog posts, articles, or any text into platform-optimized social content.</p>
      </div>

      {/* Input Mode Toggle */}
      <div className="glass-panel mb-6">
        <div className="platform-tab-bar mb-4">
          <button className={`platform-tab${mode === 'text' ? ' active' : ''}`} onClick={() => setMode('text')}>
            <FileText size={13} /> Paste Text
          </button>
          <button className={`platform-tab${mode === 'url' ? ' active' : ''}`} onClick={() => setMode('url')}>
            <ArrowRight size={13} /> From URL
          </button>
        </div>

        {mode === 'text' ? (
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            rows={8}
            placeholder="Paste your blog post, article, or long-form content here...&#10;&#10;The AI will extract key themes and generate platform-specific social posts, maintaining your brand voice."
            style={{ resize: 'vertical' }}
          />
        ) : (
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Blog / Article URL</label>
            <input
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              placeholder="https://yourblog.com/post/ai-marketing-trends-2026"
            />
          </div>
        )}
      </div>

      {/* Platform Selection */}
      <div className="glass-panel mb-6">
        <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          Generate For
        </div>
        <div className="flex gap-3">
          {PLATFORMS.map(p => {
            const Icon = p.icon;
            const active = selectedPlatforms.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                className={`platform-select-btn${active ? ' active' : ''}`}
                style={{
                  borderColor: active ? p.color : 'var(--glass-border)',
                  background: active ? `${p.color}15` : 'transparent',
                }}
              >
                <Icon size={16} color={active ? p.color : 'var(--text-muted)'} />
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Generate Button */}
      <button
        className="btn-primary mb-6"
        style={{ width: 'auto' }}
        onClick={handleGenerate}
        disabled={generating || (mode === 'text' ? !inputText.trim() : !inputUrl.trim())}
      >
        {generating
          ? <><Loader2 size={16} className="animate-spin" /> Generating {selectedPlatforms.length * 2} posts…</>
          : <><Sparkles size={16} /> Repurpose into {selectedPlatforms.length} Platforms</>
        }
      </button>

      {/* Results */}
      {results && (
        <div className="animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Generated Posts <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.875rem' }}>({totalPosts} posts)</span>
            </h2>
            <button className="btn-ghost" onClick={handleGenerate}>
              <RefreshCw size={14} /> Regenerate
            </button>
          </div>

          {Object.entries(results).map(([platform, posts]) => (
            <div key={platform} className="mb-6">
              <div className="flex items-center gap-2 mb-3" style={{ textTransform: 'capitalize' }}>
                {React.createElement(PLATFORMS.find(p => p.id === platform)?.icon || FileText, { size: 16, color: PLATFORMS.find(p => p.id === platform)?.color })}
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{platform}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>— {posts.length} variants</span>
              </div>
              {posts.map((content, i) => (
                <GeneratedPost key={i} content={content} platform={platform} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
