import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Brain, PenLine, Palette, Mic, ImageIcon, Film,
  Package, Loader2, Check, X, SkipForward, ArrowLeft,
  Play, Pause, Volume2, Maximize2, Clock, Sparkles,
  Coins, Settings2, ChevronDown, CreditCard, AlertTriangle,
  Zap, Lock, Crown, Wallet,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════
// CREDIT PRICING (must match backend credit_system.py)
// ═══════════════════════════════════════════════════════════
const CREDIT_COSTS = {
  text: { strategist: 1, copywriter: 1, visual_director: 1 },
  voice: { google: 2, elevenlabs: 5 },
  image: { google: 2, replicate: 4 },
  video: { google: 5, replicate: 10 },
};

function calculateCost(prefs) {
  const textCost = Object.values(CREDIT_COSTS.text).reduce((a, b) => a + b, 0);
  return textCost
    + (CREDIT_COSTS.voice[prefs.voice_provider] || 2)
    + (CREDIT_COSTS.image[prefs.image_provider] || 2)
    + (CREDIT_COSTS.video[prefs.video_provider] || 5);
}

// ═══════════════════════════════════════════════════════════
// AGENT NODE DEFINITIONS
// ═══════════════════════════════════════════════════════════
const AGENT_DEFS = {
  Strategist:     { label: 'Strategist',      icon: Brain,     color: '#818cf8', group: 'text' },
  Copywriter:     { label: 'Copywriter',      icon: PenLine,   color: '#34d399', group: 'text' },
  VisualDirector: { label: 'Visual Director', icon: Palette,   color: '#fbbf24', group: 'text' },
  VoiceEngine:    { label: 'Voice Engine',    icon: Mic,       color: '#f472b6', group: 'media' },
  ImageRenderer:  { label: 'Image Renderer',  icon: ImageIcon, color: '#60a5fa', group: 'media' },
  VideoEngine:    { label: 'Video Engine',    icon: Film,      color: '#a78bfa', group: 'media' },
  Result:         { label: 'Output Canvas',   icon: Package,   color: '#10b981', group: 'output' },
};

// ═══════════════════════════════════════════════════════════
// CUSTOM NODE: Agent Processor
// ═══════════════════════════════════════════════════════════
function AgentNode({ data }) {
  const def = AGENT_DEFS[data.agentKey] || {};
  const Icon = def.icon || Brain;
  const status = data.status || 'idle';
  const preview = data.outputPreview || '';

  const dynamicBorder = status === 'running' ? def.color
    : status === 'done' ? '#10b981'
    : status === 'error' ? '#ef4444'
    : status === 'skipped' ? '#64748b'
    : 'var(--color-border)';

  const glowShadow = status === 'running'
    ? `0 0 20px ${def.color}44, 0 0 40px ${def.color}22`
    : status === 'done'
    ? '0 0 15px rgba(16,185,129,0.2)'
    : 'none';

  return (
    <div 
      className="bg-surface border border-border dark:backdrop-blur-md rounded-sm p-4 min-w-[220px] transition-all"
      style={{
        boxShadow: glowShadow,
        borderColor: status !== 'idle' ? dynamicBorder : 'var(--color-border)',
        animation: status === 'running' ? 'pulseGlow 2s ease-in-out infinite' : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: dynamicBorder, width: 8, height: 8, border: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: `${def.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={def.color} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: 'Outfit, sans-serif', color: '#f8fafc' }}>
            {def.label}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {status === 'idle' && <><Clock size={10} /> Waiting</>}
            {status === 'running' && <><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>}
            {status === 'done' && <><Check size={10} color="#10b981" /> Complete</>}
            {status === 'error' && <><X size={10} color="#ef4444" /> Failed</>}
            {status === 'skipped' && <><SkipForward size={10} /> Skipped</>}
          </div>
        </div>
      </div>
      {(status === 'running' || status === 'done') && (
        <div style={{ height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: `linear-gradient(90deg, ${def.color}, ${def.color}88)`,
            width: `${data.progress || 0}%`,
            transition: 'width 0.5s ease-out',
          }} />
        </div>
      )}
      {preview && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#94a3b8', lineHeight: 1.4, maxHeight: '3em', overflow: 'hidden' }}>
          {preview.slice(0, 100)}...
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: borderColor, width: 10, height: 10, border: '2px solid #0a0a14' }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// CUSTOM NODE: Result Output (Media Player)
// ═══════════════════════════════════════════════════════════
function ResultNode({ data }) {
  const status = data.status || 'idle';
  const { voiceover_url, thumbnail_url, video_url } = data;
  const hasMedia = voiceover_url || thumbnail_url || video_url;
  const borderColor = status === 'done' ? '#10b981' : status === 'running' ? '#a855f7' : 'rgba(255,255,255,0.08)';

  return (
    <div style={{
      background: 'rgba(8,8,24,0.95)', backdropFilter: 'blur(20px)',
      border: `2px solid ${borderColor}`, borderRadius: 20, padding: '1.5rem',
      minWidth: 380, maxWidth: 440,
      boxShadow: status === 'done' ? '0 0 30px rgba(16,185,129,0.15), 0 20px 50px rgba(0,0,0,0.4)' : '0 10px 40px rgba(0,0,0,0.3)',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <Handle type="target" position={Position.Top} style={{ background: borderColor, width: 12, height: 12, border: '2px solid #0a0a14' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(99,102,241,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={22} color="#10b981" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'Outfit, sans-serif', color: '#f8fafc' }}>Output Canvas</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {!hasMedia && status !== 'done' && <><Sparkles size={10} /> Awaiting media...</>}
            {hasMedia && <><Check size={10} color="#10b981" /> Media ready</>}
          </div>
        </div>
      </div>
      {thumbnail_url && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🖼️ Generated Thumbnail</div>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(96,165,250,0.3)', boxShadow: '0 0 15px rgba(96,165,250,0.1)' }}>
            <img src={thumbnail_url} alt="AI Generated Thumbnail" style={{ width: '100%', height: 'auto', display: 'block', maxHeight: 200, objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        </div>
      )}
      {video_url && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎬 Generated Video</div>
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(168,85,247,0.3)', background: '#000' }}>
            <video src={video_url} controls style={{ width: '100%', display: 'block', borderRadius: 10, maxHeight: 220 }} preload="metadata" />
          </div>
        </div>
      )}
      {voiceover_url && (
        <div>
          <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>🎙️ AI Voiceover</div>
          <div style={{ background: 'rgba(244,114,182,0.06)', border: '1px solid rgba(244,114,182,0.2)', borderRadius: 12, padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Volume2 size={18} color="#f472b6" />
            <audio src={voiceover_url} controls style={{ flex: 1, height: 32 }} preload="metadata" />
          </div>
        </div>
      )}
      {!hasMedia && status !== 'done' && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#475569', fontSize: '0.85rem' }}>
          <Package size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.3 }} />
          Media outputs will appear here once the pipeline completes.
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PAYWALL MODAL — Razorpay Checkout
// ═══════════════════════════════════════════════════════════
function PaywallModal({ onClose, deficit, onTopUp, PYTHON_API, token }) {
  const [loading, setLoading] = useState(false);

  const packs = [
    { credits: 50, price: 99, label: 'Starter Pack', badge: '' },
    { credits: 200, price: 299, label: 'Pro Pack', badge: 'POPULAR' },
    { credits: 1000, price: 999, label: 'Enterprise Pack', badge: 'BEST VALUE' },
  ];

  const handlePurchase = async (pack) => {
    setLoading(true);
    try {
      // Step 1: Create Razorpay order with plan_id
      const orderRes = await fetch(`${PYTHON_API}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ plan_id: `credits_${pack.credits}`, currency: 'INR' }),
      });
      if (!orderRes.ok) throw new Error('Failed to create order');
      const order = await orderRes.json();

      if (window.Razorpay) {
        // Step 2: Open Razorpay checkout
        const razorpay = new window.Razorpay({
          key: order.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID || '',
          amount: order.amount,
          currency: order.currency,
          name: 'AI Marketing OS',
          description: `${pack.credits} Credits — ${pack.label}`,
          order_id: order.order_id,
          handler: async (paymentResponse) => {
            // Step 3: Verify payment signature (belt-and-suspenders)
            try {
              await fetch(`${PYTHON_API}/api/payments/verify-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                  razorpay_order_id: paymentResponse.razorpay_order_id,
                  razorpay_payment_id: paymentResponse.razorpay_payment_id,
                  razorpay_signature: paymentResponse.razorpay_signature,
                }),
              });
            } catch (verifyErr) {
              console.warn('Verify-payment call failed (webhook will still process):', verifyErr);
            }

            // Step 4: Poll payment status until webhook credits the wallet
            let pollAttempts = 0;
            const pollInterval = setInterval(async () => {
              pollAttempts++;
              try {
                const statusRes = await fetch(`${PYTHON_API}/api/payments/status/${paymentResponse.razorpay_order_id}`, {
                  headers: { 'Authorization': `Bearer ${token}` },
                });
                if (statusRes.ok) {
                  const statusData = await statusRes.json();
                  if (statusData.status === 'captured') {
                    clearInterval(pollInterval);
                    // Refresh credit balance
                    const creditsRes = await fetch(`${PYTHON_API}/api/workflow/credits`, {
                      headers: { 'Authorization': `Bearer ${token}` },
                    });
                    if (creditsRes.ok) {
                      const creditsData = await creditsRes.json();
                      onTopUp(creditsData.credits);
                    }
                    onClose();
                    return;
                  }
                }
              } catch (pollErr) {
                console.warn('Poll error:', pollErr);
              }
              if (pollAttempts >= 30) { // 30 seconds timeout
                clearInterval(pollInterval);
                // Fallback: just refresh credits
                try {
                  const creditsRes = await fetch(`${PYTHON_API}/api/workflow/credits`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                  });
                  if (creditsRes.ok) {
                    const creditsData = await creditsRes.json();
                    onTopUp(creditsData.credits);
                  }
                } catch (_) {}
                onClose();
              }
            }, 1000);
          },
          theme: { color: '#6366f1' },
        });
        razorpay.open();
      } else {
        // Development fallback: no Razorpay SDK loaded
        console.warn('Razorpay SDK not loaded — cannot process payment');
      }
    } catch (err) {
      console.error('Payment error:', err);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(135deg, rgba(15,15,35,0.98), rgba(20,10,40,0.98))',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 24, padding: '2rem', width: 440, maxWidth: '90vw',
        boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Coins size={28} color="#fbbf24" />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontFamily: 'Outfit, sans-serif', color: '#f8fafc', marginBottom: '0.4rem' }}>
            Credits Required
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
            You need <span style={{ color: '#fbbf24', fontWeight: 700 }}>{deficit}</span> more credits to run this pipeline.
          </p>
        </div>

        {/* Credit Packs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {packs.map(pack => (
            <button key={pack.credits} onClick={() => handlePurchase(pack)} disabled={loading} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '1rem 1.25rem', cursor: 'pointer',
              transition: 'all 0.2s', position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Wallet size={18} color="#818cf8" />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f8fafc' }}>{pack.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    <Coins size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {pack.credits} credits
                  </div>
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#10b981' }}>₹{pack.price}</div>
              {pack.badge && (
                <div style={{
                  position: 'absolute', top: -8, right: 12,
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  color: '#fff', fontSize: '0.6rem', fontWeight: 700,
                  padding: '2px 8px', borderRadius: 8, letterSpacing: '0.03em',
                }}>
                  {pack.badge}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Pro Sub option */}
        <button onClick={() => handlePurchase({ credits: 500, price: 499 })} disabled={loading} style={{
          width: '100%', padding: '0.9rem',
          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
          border: 'none', borderRadius: 14, color: '#fff',
          fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
        }}>
          <Crown size={16} /> Upgrade to Pro — 500 credits/mo @ ₹499
        </button>

        <button onClick={onClose} style={{
          width: '100%', marginTop: '0.75rem', padding: '0.6rem',
          background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, color: '#64748b', fontSize: '0.8rem', cursor: 'pointer',
        }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PROVIDER SELECTOR COMPONENT
// ═══════════════════════════════════════════════════════════
function ProviderSelect({ label, icon: Icon, value, onChange, options }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{
        fontSize: '0.72rem', color: '#64748b', fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem',
      }}>
        <Icon size={11} /> {label}
      </label>
      <div style={{ display: 'flex', gap: '0.35rem' }}>
        {options.map(opt => (
          <button key={opt.value} onClick={() => onChange(opt.value)} style={{
            flex: 1, padding: '0.4rem 0.5rem', borderRadius: 10,
            border: `1px solid ${value === opt.value ? opt.color : 'rgba(255,255,255,0.08)'}`,
            background: value === opt.value ? `${opt.color}15` : 'transparent',
            color: value === opt.value ? opt.color : '#64748b',
            fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '2px',
          }}>
            <span>{opt.label}</span>
            <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>
              {opt.cost} credits {opt.isPremium ? '★' : ''}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// NODE & EDGE LAYOUT
// ═══════════════════════════════════════════════════════════
const NODE_TYPES = { agentNode: AgentNode, resultNode: ResultNode };

const INITIAL_NODES = [
  { id: 'Strategist',     type: 'agentNode',  position: { x: 300, y: 0   }, data: { agentKey: 'Strategist', status: 'idle', progress: 0 } },
  { id: 'Copywriter',     type: 'agentNode',  position: { x: 300, y: 140 }, data: { agentKey: 'Copywriter', status: 'idle', progress: 0 } },
  { id: 'VisualDirector', type: 'agentNode',  position: { x: 300, y: 280 }, data: { agentKey: 'VisualDirector', status: 'idle', progress: 0 } },
  { id: 'VoiceEngine',    type: 'agentNode',  position: { x: 40,  y: 450 }, data: { agentKey: 'VoiceEngine', status: 'idle', progress: 0 } },
  { id: 'ImageRenderer',  type: 'agentNode',  position: { x: 300, y: 450 }, data: { agentKey: 'ImageRenderer', status: 'idle', progress: 0 } },
  { id: 'VideoEngine',    type: 'agentNode',  position: { x: 560, y: 450 }, data: { agentKey: 'VideoEngine', status: 'idle', progress: 0 } },
  { id: 'Result',         type: 'resultNode', position: { x: 210, y: 620 }, data: { status: 'idle', voiceover_url: '', thumbnail_url: '', video_url: '' } },
];

const INITIAL_EDGES = [
  { id: 'e-strat-copy', source: 'Strategist', target: 'Copywriter', animated: false, style: { stroke: '#818cf8', strokeWidth: 2 } },
  { id: 'e-copy-vis',   source: 'Copywriter', target: 'VisualDirector', animated: false, style: { stroke: '#34d399', strokeWidth: 2 } },
  { id: 'e-vis-voice',  source: 'VisualDirector', target: 'VoiceEngine',   animated: false, style: { stroke: '#fbbf24', strokeWidth: 2 } },
  { id: 'e-vis-image',  source: 'VisualDirector', target: 'ImageRenderer', animated: false, style: { stroke: '#fbbf24', strokeWidth: 2 } },
  { id: 'e-vis-video',  source: 'VisualDirector', target: 'VideoEngine',   animated: false, style: { stroke: '#fbbf24', strokeWidth: 2 } },
  { id: 'e-voice-res',  source: 'VoiceEngine',   target: 'Result', animated: false, style: { stroke: '#f472b6', strokeWidth: 2 } },
  { id: 'e-image-res',  source: 'ImageRenderer', target: 'Result', animated: false, style: { stroke: '#60a5fa', strokeWidth: 2 } },
  { id: 'e-video-res',  source: 'VideoEngine',   target: 'Result', animated: false, style: { stroke: '#a78bfa', strokeWidth: 2 } },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function CampaignFlow() {
  const { id: campaignId } = useParams();
  const { token, PYTHON_API, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [pipelineStatus, setPipelineStatus] = useState('idle');
  const [videoDuration, setVideoDuration] = useState(5);
  const [showLaunch, setShowLaunch] = useState(!campaignId || campaignId === 'new');
  const [showPaywall, setShowPaywall] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [paywallDeficit, setPaywallDeficit] = useState(0);
  const [userCredits, setUserCredits] = useState(null);

  // Provider preferences
  const [preferences, setPreferences] = useState({
    voice_provider: 'google',
    image_provider: 'google',
    video_provider: 'google',
  });

  const estimatedCost = useMemo(() => calculateCost(preferences), [preferences]);

  const [formData, setFormData] = useState({
    campaign_name: '', niche: '', audience: '', tone: 'Professional', goals: '',
  });

  const nodeTypes = useMemo(() => NODE_TYPES, []);

  // ── Fetch user credits on mount ────────────────────────
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await fetch(`${PYTHON_API}/api/workflow/credits`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setUserCredits(data.credits);
          } else {
            const text = await res.text();
            console.warn('Credits endpoint returned non-JSON:', text.slice(0, 100));
          }
        } else {
          console.warn(`Credits fetch failed: ${res.status}`);
        }
      } catch (err) {
        console.error('Failed to fetch credits (Network or JSON error):', err);
      }
    };
    if (token && PYTHON_API) fetchCredits();
  }, [token, PYTHON_API]);

  const updateNodeData = useCallback((nodeId, updates) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n));
  }, [setNodes]);

  const animateEdgesToNode = useCallback((targetId, animated) => {
    setEdges((eds) => eds.map((e) => e.target === targetId ? { ...e, animated } : e));
  }, [setEdges]);

  // ── Handle credit balance update (called after webhook confirms payment) ──
  const handleTopUp = useCallback((newBalance) => {
    setUserCredits(newBalance);
  }, []);

  // ── Handle SSE stream from backend ─────────────────────
  const startPipeline = useCallback(async () => {
    setPipelineStatus('running');
    setShowLaunch(false);

    INITIAL_NODES.forEach(n => {
      updateNodeData(n.id, { status: 'idle', progress: 0, outputPreview: '', voiceover_url: '', thumbnail_url: '', video_url: '' });
    });

    try {
      const response = await fetch(`${PYTHON_API}/api/workflow/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          video_duration: videoDuration,
          preferences,
        }),
      });

      // ── Credit Gate: handle 402 ────────────────────────
      if (response.status === 402) {
        const contentType = response.headers.get("content-type");
        let detail = "Insufficient credits for this operation.";
        if (contentType && contentType.includes("application/json")) {
          const err = await response.json();
          detail = err.detail || err;
        } else {
          const text = await response.text();
          console.warn('402 response was not JSON:', text.slice(0, 200));
        }
        
        setPaywallDeficit(detail?.deficit || estimatedCost);
        setShowPaywall(true);
        setPipelineStatus('idle');
        setShowLaunch(true);
        return;
      }

      if (!response.ok) {
        throw new Error(`Pipeline failed: ${response.status}`);
      }

      // Deduct local credit display
      setUserCredits(prev => prev !== null ? prev - estimatedCost : null);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6));
            const agentId = event.agent;

            if (agentId === 'Pipeline') {
              updateNodeData('Result', {
                status: 'done',
                voiceover_url: event.voiceover_url || '',
                thumbnail_url: event.thumbnail_url || '',
                video_url: event.video_url || '',
              });
              setPipelineStatus('complete');
              continue;
            }

            if (AGENT_DEFS[agentId]) {
              updateNodeData(agentId, {
                status: event.status,
                progress: event.progress,
                outputPreview: event.output_preview || '',
              });

              if (event.status === 'running') {
                animateEdgesToNode(agentId, true);
              } else if (event.status === 'done' || event.status === 'error' || event.status === 'skipped') {
                animateEdgesToNode(agentId, false);
                if (event.url) {
                  const urlField = agentId === 'VoiceEngine' ? 'voiceover_url'
                    : agentId === 'ImageRenderer' ? 'thumbnail_url'
                    : agentId === 'VideoEngine' ? 'video_url' : null;
                  if (urlField) updateNodeData('Result', { [urlField]: event.url });
                }
              }
            }
          } catch (parseErr) { /* skip */ }
        }
      }
    } catch (err) {
      console.error('Pipeline error:', err);
      setPipelineStatus('error');
    }
  }, [token, PYTHON_API, formData, videoDuration, preferences, estimatedCost, updateNodeData, animateEdgesToNode]);

  // ── Load existing campaign status ──────────────────────
  useEffect(() => {
    if (!campaignId || campaignId === 'new') return;
    const loadStatus = async () => {
      try {
        const res = await fetch(`${PYTHON_API}/api/workflow/${campaignId}/status`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!res.ok) return;
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await res.text();
          console.warn('Status endpoint returned non-JSON:', text.slice(0, 100));
          return;
        }

        const data = await res.json();
        if (data.voiceover_url || data.thumbnail_url || data.video_url) {
          updateNodeData('Result', {
            status: 'done', voiceover_url: data.voiceover_url || '',
            thumbnail_url: data.thumbnail_url || '', video_url: data.video_url || '',
          });
          Object.keys(AGENT_DEFS).forEach(key => {
            if (key !== 'Result') updateNodeData(key, { status: 'done', progress: 100 });
          });
          setPipelineStatus('complete');
        }
      } catch (err) { console.error('Failed to load campaign:', err); }
    };
    loadStatus();
  }, [campaignId, token, PYTHON_API, updateNodeData]);

  const canAfford = userCredits === null || userCredits >= estimatedCost;

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative', background: '#06060f' }}>
      {/* ── Top bar ───────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 1.5rem',
        background: 'linear-gradient(to bottom, rgba(6,6,15,0.95), transparent)',
        backdropFilter: 'blur(8px)',
      }}>
        <button onClick={() => navigate(-1)} style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '0.5rem 1rem', color: '#94a3b8',
          cursor: 'pointer', fontSize: '0.85rem',
        }}>
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Credit Wallet Badge */}
          {userCredits !== null && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 10, padding: '0.35rem 0.75rem',
            }}>
              <Coins size={13} color="#fbbf24" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24' }}>{userCredits}</span>
              <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>credits</span>
            </div>
          )}

          {/* Pipeline Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
              Director Pipeline
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: pipelineStatus === 'running' ? '#fbbf24' : pipelineStatus === 'complete' ? '#10b981' : pipelineStatus === 'error' ? '#ef4444' : '#475569',
              boxShadow: pipelineStatus === 'running' ? '0 0 8px #fbbf24' : 'none',
              animation: pipelineStatus === 'running' ? 'pulse 2s ease-in-out infinite' : 'none',
            }} />
          </div>
        </div>

        {/* Launch Button with Cost Badge & Disclaimer */}
        {showLaunch && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {/* Cost Badge */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                background: canAfford ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${canAfford ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                borderRadius: 8, padding: '0.3rem 0.6rem',
              }}>
                <Zap size={11} color={canAfford ? '#10b981' : '#ef4444'} />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: canAfford ? '#10b981' : '#ef4444' }}>
                  {estimatedCost}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>credits</span>
              </div>

              <button onClick={() => {
                if (!isAuthenticated) {
                  setShowAuthModal(true);
                  return;
                }
                startPipeline();
              }} disabled={pipelineStatus === 'running' || !formData.niche} style={{
                background: canAfford ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'linear-gradient(135deg, #475569, #334155)',
                border: 'none', borderRadius: 10, padding: '0.5rem 1.25rem',
                color: '#fff', fontWeight: 600, fontSize: '0.85rem',
                cursor: pipelineStatus === 'running' ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                opacity: pipelineStatus === 'running' || !formData.niche ? 0.5 : 1,
                boxShadow: canAfford ? '0 4px 15px rgba(99,102,241,0.3)' : 'none',
              }}>
                {pipelineStatus === 'running' ? (
                  <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running...</>
                ) : !canAfford ? (
                  <><Lock size={14} /> Top Up Credits</>
                ) : (
                  <><Sparkles size={14} /> Launch Pipeline</>
                )}
              </button>
            </div>
            <div style={{ fontSize: '0.6rem', color: '#64748b', fontFamily: 'monospace', opacity: 0.8, letterSpacing: '-0.02em' }}>
              Antigravity AI can make mistakes. Please review all campaigns and media for accuracy and compliance before publishing.
            </div>
          </div>
        )}
      </div>

      {/* ── Launch Sidebar — Campaign Config + Model Settings ── */}
      {showLaunch && pipelineStatus === 'idle' && (
        <div style={{
          position: 'absolute', top: 64, right: 16, zIndex: 10,
          width: 340, background: 'rgba(10,10,28,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 16, padding: '1.5rem',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
        }}>
          <h3 style={{ fontSize: '1rem', fontFamily: 'Outfit, sans-serif', marginBottom: '1.25rem', color: '#f8fafc' }}>
            🎬 Campaign Config
          </h3>

          {[
            { key: 'campaign_name', label: 'Campaign Name', placeholder: 'Q4 Holiday Launch' },
            { key: 'niche', label: 'Niche / Industry', placeholder: 'SaaS, Fitness, etc.' },
            { key: 'audience', label: 'Target Audience', placeholder: 'Tech Founders' },
            { key: 'goals', label: 'Campaign Goals', placeholder: 'Drive signups, brand awareness...', textarea: true },
          ].map(({ key, label, placeholder, textarea }) => (
            <div key={key} style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>
                {label}
              </label>
              {textarea ? (
                <textarea rows={2} placeholder={placeholder} value={formData[key]}
                  onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '0.6rem 0.8rem', color: '#f8fafc', fontSize: '0.85rem',
                    outline: 'none', resize: 'vertical', fontFamily: 'Inter, sans-serif',
                  }}
                />
              ) : (
                <input placeholder={placeholder} value={formData[key]}
                  onChange={e => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                  style={{
                    width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10, padding: '0.6rem 0.8rem', color: '#f8fafc', fontSize: '0.85rem', outline: 'none',
                  }}
                />
              )}
            </div>
          ))}

          {/* Tone selector */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Brand Tone</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {['Professional', 'Casual', 'Bold', 'Inspirational'].map(t => (
                <button key={t} onClick={() => setFormData(prev => ({ ...prev, tone: t }))} style={{
                  padding: '0.3rem 0.7rem', borderRadius: 20,
                  border: `1px solid ${formData.tone === t ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                  background: formData.tone === t ? 'rgba(99,102,241,0.15)' : 'transparent',
                  color: formData.tone === t ? '#818cf8' : '#64748b',
                  fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer',
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', margin: '1rem 0' }} />

          {/* ── MODEL SETTINGS ──────────────────────────────── */}
          <h4 style={{
            fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', color: '#f8fafc',
            display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem',
          }}>
            <Settings2 size={14} color="#818cf8" /> Model Settings
          </h4>

          <ProviderSelect
            label="Voice Provider"
            icon={Mic}
            value={preferences.voice_provider}
            onChange={v => setPreferences(p => ({ ...p, voice_provider: v }))}
            options={[
              { value: 'google', label: 'Google TTS', cost: 2, color: '#10b981' },
              { value: 'elevenlabs', label: 'ElevenLabs', cost: 5, color: '#f472b6', isPremium: true },
            ]}
          />

          <ProviderSelect
            label="Image Provider"
            icon={ImageIcon}
            value={preferences.image_provider}
            onChange={v => setPreferences(p => ({ ...p, image_provider: v }))}
            options={[
              { value: 'google', label: 'Imagen 3', cost: 2, color: '#10b981' },
              { value: 'replicate', label: 'Flux-Schnell', cost: 4, color: '#60a5fa', isPremium: true },
            ]}
          />

          <ProviderSelect
            label="Video Provider"
            icon={Film}
            value={preferences.video_provider}
            onChange={v => setPreferences(p => ({ ...p, video_provider: v }))}
            options={[
              { value: 'google', label: 'Veo', cost: 5, color: '#10b981' },
              { value: 'replicate', label: 'Luma Ray', cost: 10, color: '#a78bfa', isPremium: true },
            ]}
          />

          {/* Video Duration Slider */}
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span>Video Duration</span>
              <span style={{ color: '#a78bfa' }}>{videoDuration}s</span>
            </label>
            <input type="range" min={5} max={30} step={5} value={videoDuration}
              onChange={e => setVideoDuration(Number(e.target.value))}
              style={{
                width: '100%', height: 4, appearance: 'none',
                background: `linear-gradient(90deg, #a78bfa ${((videoDuration - 5) / 25) * 100}%, rgba(255,255,255,0.08) ${((videoDuration - 5) / 25) * 100}%)`,
                borderRadius: 4, outline: 'none', cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#475569', marginTop: '0.2rem' }}>
              <span>5s</span><span>30s</span>
            </div>
          </div>

          {/* Cost Summary */}
          <div style={{
            background: canAfford ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${canAfford ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
            borderRadius: 12, padding: '0.75rem 1rem', marginTop: '0.5rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Pipeline Cost</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Coins size={14} color={canAfford ? '#10b981' : '#ef4444'} />
              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: canAfford ? '#10b981' : '#ef4444' }}>
                {estimatedCost}
              </span>
              {!canAfford && (
                <span style={{ fontSize: '0.65rem', color: '#ef4444', marginLeft: '0.3rem' }}>
                  ({Math.abs((userCredits || 0) - estimatedCost)} short)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Paywall Modal ────────────────────────────────── */}
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          deficit={paywallDeficit}
          onTopUp={handleTopUp}
          PYTHON_API={PYTHON_API}
          token={token}
        />
      )}

      {/* ── Auth Modal ───────────────────────────────────── */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            // User can now launch pipeline
            startPipeline();
          }}
        />
      )}

      {/* ── React Flow Canvas ────────────────────────────── */}
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3} maxZoom={1.5}
        defaultEdgeOptions={{ type: 'smoothstep', style: { strokeWidth: 2, stroke: 'rgba(255,255,255,0.1)' } }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="rgba(99,102,241,0.05)" gap={20} size={1} />
        <Controls style={{ background: 'rgba(10,10,28,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }} />
        <MiniMap
          maskColor="rgba(6,6,15,0.85)"
          nodeColor={(n) => AGENT_DEFS[n.data?.agentKey]?.color || '#10b981'}
          style={{ background: 'rgba(10,10,28,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
        />
      </ReactFlow>

      {/* ── Global CSS ───────────────────────────────────── */}
      <style>{`
        @keyframes pulseGlow { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.3); } }
        .react-flow__node { transition: transform 0.3s ease !important; }
        .react-flow__edge-path { transition: stroke 0.3s ease; }
        .react-flow__controls button { background: rgba(10,10,28,0.9) !important; color: #94a3b8 !important; border: 1px solid rgba(255,255,255,0.08) !important; }
        .react-flow__controls button:hover { background: rgba(99,102,241,0.15) !important; color: #818cf8 !important; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px; background: #a78bfa;
          border-radius: 50%; cursor: pointer; border: 2px solid #0a0a14;
          box-shadow: 0 0 8px rgba(168,85,247,0.4);
        }
        audio::-webkit-media-controls-panel { background: rgba(10,10,28,0.8); }
        video::-webkit-media-controls-panel { background: rgba(10,10,28,0.8); }
      `}</style>
    </div>
  );
}
