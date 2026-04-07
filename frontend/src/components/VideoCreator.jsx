import React, { useState } from 'react';
import { Film, Wand2, Play, Pause, Layout, Clock, Sparkles, Plus, Trash2, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';

const VIDEO_STYLES = [
  { id: 'cinematic', name: 'Cinematic', desc: 'High-end, dramatic visuals with slow transitions', emoji: '🎬' },
  { id: 'minimal', name: 'Minimal', desc: 'Clean, modern with bold typography', emoji: '✨' },
  { id: 'product-demo', name: 'Product Demo', desc: 'Screen recordings with voiceover narration', emoji: '💻' },
  { id: 'testimonial', name: 'Testimonial', desc: 'Customer quotes with branded overlays', emoji: '💬' },
  { id: 'explainer', name: 'Explainer', desc: 'Animated graphics with step-by-step flow', emoji: '📊' },
  { id: 'social-short', name: 'Social Short', desc: 'Fast-paced 15-30s vertical for Reels/TikTok', emoji: '📱' },
];

const ASPECT_RATIOS = [
  { id: '16:9', label: '16:9', desc: 'YouTube / LinkedIn' },
  { id: '9:16', label: '9:16', desc: 'Reels / TikTok / Stories' },
  { id: '1:1', label: '1:1', desc: 'Instagram Feed' },
  { id: '4:5', label: '4:5', desc: 'Instagram Portrait' },
];

const DEMO_SCENES = [
  { scene_number: 1, narration: 'Meet the future of marketing automation.', visual_prompt: 'Sleek dark dashboard with glowing AI nodes connecting', duration: 4 },
  { scene_number: 2, narration: 'Five specialized AI agents — working together, 24/7.', visual_prompt: 'Five colorful agent avatars orbiting a central brain icon', duration: 5 },
  { scene_number: 3, narration: 'From strategy to publishing — fully autonomous.', visual_prompt: 'Workflow pipeline animation: brief → research → content → publish', duration: 5 },
  { scene_number: 4, narration: 'Generate multi-platform campaigns in minutes, not days.', visual_prompt: 'Split screen showing Twitter, LinkedIn, Instagram posts appearing simultaneously', duration: 4 },
  { scene_number: 5, narration: 'Start building smarter campaigns today.', visual_prompt: 'CTA screen with logo, gradient background, "Get Started" button pulse', duration: 3 },
];

function SceneCard({ scene, index, onUpdate, onDelete }) {
  return (
    <div className="scene-card animate-fade-in">
      <div className="scene-card-header">
        <div className="scene-number">Scene {scene.scene_number}</div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <Clock size={10} /> {scene.duration}s
          </span>
          <button className="btn-ghost" style={{ padding: '0.25rem' }} onClick={() => onDelete(index)}>
            <Trash2 size={12} color="#f87171" />
          </button>
        </div>
      </div>
      <div className="input-group" style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.7rem' }}>Narration / Voiceover</label>
        <input
          value={scene.narration}
          onChange={e => onUpdate(index, 'narration', e.target.value)}
          placeholder="What the narrator says..."
        />
      </div>
      <div className="input-group" style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.7rem' }}>Visual Description</label>
        <input
          value={scene.visual_prompt}
          onChange={e => onUpdate(index, 'visual_prompt', e.target.value)}
          placeholder="Describe what the viewer sees..."
        />
      </div>
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label style={{ fontSize: '0.7rem' }}>Duration (seconds)</label>
        <input
          type="number"
          value={scene.duration}
          onChange={e => onUpdate(index, 'duration', parseInt(e.target.value) || 1)}
          min={1}
          max={30}
          style={{ width: '80px' }}
        />
      </div>
    </div>
  );
}

export default function VideoCreator() {
  const [title, setTitle] = useState('AI Marketing Platform — Product Video');
  const [style, setStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [scenes, setScenes] = useState(DEMO_SCENES);
  const [generating, setGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  const updateScene = (index, field, value) => {
    setScenes(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const deleteScene = (index) => {
    setScenes(prev => prev.filter((_, i) => i !== index));
  };

  const addScene = () => {
    setScenes(prev => [...prev, {
      scene_number: prev.length + 1,
      narration: '',
      visual_prompt: '',
      duration: 4,
    }]);
  };

  const generateFromBrief = () => {
    setScenes(DEMO_SCENES);
  };

  const handleGenerate = () => {
    setGenerating(true);
    setGenerationStep(0);
    const steps = ['Analyzing storyboard...', 'Generating scene visuals...', 'Composing transitions...', 'Rendering video...', 'Finalizing export...'];
    steps.forEach((_, i) => {
      setTimeout(() => setGenerationStep(i + 1), (i + 1) * 2000);
    });
    setTimeout(() => {
      setGenerating(false);
      setCompleted(true);
    }, steps.length * 2000 + 500);
  };

  const GENERATION_STEPS = ['Analyzing storyboard', 'Generating scene visuals', 'Composing transitions', 'Rendering video', 'Finalizing export'];

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Video Creator</h1>
          <p className="page-subtitle">AI-powered video generation from storyboard to export.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}>
            <Clock size={10} /> {totalDuration}s total
          </span>
          <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
            {scenes.length} scenes
          </span>
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 320px' }}>
        {/* Main Editor */}
        <div>
          {/* Title */}
          <div className="glass-panel mb-4" style={{ padding: '1.25rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Video Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Product Video" />
            </div>
          </div>

          {/* Storyboard */}
          <div className="flex justify-between items-center mb-3">
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Storyboard</h3>
            <div className="flex gap-2">
              <button className="btn-ghost" style={{ fontSize: '0.78rem' }} onClick={generateFromBrief}>
                <Wand2 size={13} /> Auto-generate from Brief
              </button>
              <button className="btn-secondary" style={{ width: 'auto', fontSize: '0.78rem', padding: '0.4rem 0.8rem' }} onClick={addScene}>
                <Plus size={13} /> Add Scene
              </button>
            </div>
          </div>

          <div className="storyboard-timeline mb-4">
            {scenes.map((scene, i) => (
              <SceneCard key={i} scene={scene} index={i} onUpdate={updateScene} onDelete={deleteScene} />
            ))}
          </div>

          {/* Generate Button */}
          {!completed ? (
            <button
              className="btn-primary"
              style={{ width: 'auto', background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
              onClick={handleGenerate}
              disabled={generating || scenes.length === 0}
            >
              {generating
                ? <><Loader2 size={16} className="animate-spin" /> Generating Video…</>
                : <><Film size={16} /> Generate Video</>
              }
            </button>
          ) : (
            <div className="glass-panel animate-fade-in" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(16,185,129,0.2)' }}>
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle2 size={24} color="#34d399" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem' }}>Video Generated Successfully!</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{totalDuration}s • {aspectRatio} • {style}</div>
                </div>
              </div>

              {/* Video Preview Mockup */}
              <div className="video-preview-container">
                <div className="video-preview-mockup" style={{ aspectRatio: aspectRatio.replace(':', '/') }}>
                  <Film size={48} style={{ opacity: 0.3 }} />
                  <div style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.5rem' }}>Video preview</div>
                  <button className="video-play-btn">
                    <Play size={24} fill="#fff" />
                  </button>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <button className="btn-primary" style={{ width: 'auto' }}>
                  Download MP4
                </button>
                <button className="btn-secondary" style={{ width: 'auto' }}>
                  Share to Platforms
                </button>
                <button className="btn-ghost" onClick={() => setCompleted(false)}>
                  Edit Storyboard
                </button>
              </div>
            </div>
          )}

          {/* Generation Progress */}
          {generating && (
            <div className="glass-panel mt-4 animate-fade-in">
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '1rem' }}>Generation Progress</div>
              {GENERATION_STEPS.map((step, i) => (
                <div key={i} className="flex items-center gap-3 mb-2" style={{ fontSize: '0.8rem' }}>
                  {generationStep > i
                    ? <CheckCircle2 size={14} color="#34d399" />
                    : generationStep === i
                      ? <Loader2 size={14} className="animate-spin" color="#818cf8" />
                      : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }} />
                  }
                  <span style={{ color: generationStep >= i ? '#e2e8f0' : 'var(--text-muted)' }}>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar — Settings */}
        <div>
          {/* Style Selection */}
          <div className="glass-panel mb-4">
            <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Video Style
            </div>
            <div className="video-style-grid">
              {VIDEO_STYLES.map(s => (
                <button
                  key={s.id}
                  className={`video-style-card${style === s.id ? ' active' : ''}`}
                  onClick={() => setStyle(s.id)}
                >
                  <span className="video-style-emoji">{s.emoji}</span>
                  <div className="video-style-name">{s.name}</div>
                  <div className="video-style-desc">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="glass-panel mb-4">
            <div style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Aspect Ratio
            </div>
            <div className="aspect-ratio-grid">
              {ASPECT_RATIOS.map(ar => (
                <button
                  key={ar.id}
                  className={`aspect-ratio-btn${aspectRatio === ar.id ? ' active' : ''}`}
                  onClick={() => setAspectRatio(ar.id)}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ar.label}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{ar.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Prompt */}
          <div className="glass-panel" style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(99,102,241,0.08))',
            border: '1px solid rgba(168,85,247,0.2)',
          }}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} color="#c4b5fd" />
              <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>AI Director Tips</span>
            </div>
            <ul style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.7, paddingLeft: '1rem' }}>
              <li>Keep scenes under 6 seconds for social</li>
              <li>Start with a hook — first 3 seconds matter most</li>
              <li>Use contrasting visuals between scenes</li>
              <li>End with a clear CTA and logo</li>
              <li>9:16 vertical performs 2x better on Reels</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
