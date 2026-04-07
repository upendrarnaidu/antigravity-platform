import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Rocket, CheckCircle2, Clock,
  Share2, Activity, Heart, Repeat2, MessageCircle,
  ThumbsUp, BarChart2, Image, Loader2, Wand2,
  Film, Mic, GitBranch, Volume2,
} from 'lucide-react';

function StatusBadge({ status, isProcessing, isPublishing }) {
  if (isProcessing) return <span className="badge badge-processing"><Loader2 size={10} className="animate-spin" /> AI Generating…</span>;
  if (isPublishing) return <span className="badge badge-publishing"><Clock size={10} /> Publishing…</span>;
  if (status === 'live') return <span className="badge badge-live"><CheckCircle2 size={10} /> Live</span>;
  if (status === 'completed') return <span className="badge badge-completed"><CheckCircle2 size={10} /> Generated</span>;
  return <span className="badge badge-draft">{status}</span>;
}

function TwitterPreview({ content, handle = 'YourBrand' }) {
  return (
    <div className="twitter-preview">
      <div className="twitter-preview-header">
        <div className="twitter-avatar" />
        <div>
          <div className="twitter-handle">{handle}</div>
          <div className="twitter-at">@{handle.toLowerCase().replace(/\s+/g, '')}</div>
        </div>
      </div>
      <div className="twitter-preview-body">{content}</div>
      <div className="twitter-preview-actions">
        <span className="twitter-action"><MessageCircle size={14} /> 12</span>
        <span className="twitter-action"><Repeat2 size={14} /> 48</span>
        <span className="twitter-action"><Heart size={14} /> 210</span>
        <span className="twitter-action"><BarChart2 size={14} /> 4.2K</span>
      </div>
    </div>
  );
}

function LinkedInPreview({ content }) {
  return (
    <div className="linkedin-preview">
      <div className="linkedin-preview-header">
        <div className="linkedin-avatar" />
        <div>
          <div className="linkedin-name">Your Brand Page</div>
          <div className="linkedin-sub">Company · 2,847 followers</div>
        </div>
      </div>
      <div className="linkedin-preview-body">{content}</div>
      <div className="linkedin-preview-actions">
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><ThumbsUp size={13} /> 142 Likes</span>
        <span>38 Comments</span>
        <span>19 Reposts</span>
      </div>
    </div>
  );
}

function InstagramPreview({ content }) {
  const caption = content?.slice(0, 200) + (content?.length > 200 ? '…' : '');
  return (
    <div className="instagram-preview">
      <div className="instagram-preview-header">
        <div className="instagram-avatar" />
        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>yourbrand</div>
      </div>
      <div className="instagram-image-placeholder">
        <div style={{ textAlign: 'center' }}>
          <Image size={32} style={{ margin: '0 auto 0.5rem', display: 'block', opacity: 0.4 }} />
          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>AI-generated image will appear here</span>
        </div>
      </div>
      <div className="instagram-preview-caption">
        <strong>yourbrand</strong> {caption}
      </div>
    </div>
  );
}

function PostCard({ post }) {
  let payload = {};
  try { payload = JSON.parse(post.content_text); } catch { payload = { content: post.content_text }; }

  const platform = (payload.platform || 'Social').toLowerCase();
  const content = payload.content || post.content_text;

  const [activeTab, setActiveTab] = useState(platform === 'twitter' ? 'twitter' : platform === 'linkedin' ? 'linkedin' : platform === 'instagram' ? 'instagram' : 'twitter');
  const [showRewrite, setShowRewrite] = useState(false);
  const [rewritePrompt, setRewritePrompt] = useState('');

  return (
    <div className="glass-panel animate-fade-in" style={{ borderLeft: `4px solid ${platform === 'twitter' ? '#1d9bf0' : platform === 'linkedin' ? '#0a66c2' : '#e1306c'}` }}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <span style={{ fontWeight: 700, fontSize: '0.9rem', textTransform: 'capitalize' }}>
            {payload.platform || 'Social'} Post
          </span>
          <span style={{
            fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '99px',
            background: post.status === 'published' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
            color: post.status === 'published' ? '#34d399' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', gap: '0.3rem',
          }}>
            {post.status === 'published' && <CheckCircle2 size={10} />}
            {post.status}
          </span>
        </div>
        <button
          className="btn-ghost"
          style={{ fontSize: '0.78rem' }}
          onClick={() => setShowRewrite(v => !v)}
        >
          <Wand2 size={14} /> {showRewrite ? 'Cancel' : 'Ask AI to Rewrite'}
        </button>
      </div>

      {/* Rewrite input */}
      {showRewrite && (
        <div className="flex gap-3 mb-4 animate-fade-in">
          <input
            placeholder='e.g. "Make it shorter and add emojis"'
            value={rewritePrompt}
            onChange={e => setRewritePrompt(e.target.value)}
            style={{ fontSize: '0.85rem' }}
          />
          <button className="btn-primary" style={{ width: 'auto', flexShrink: 0, padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Rewrite
          </button>
        </div>
      )}

      {/* Platform Tabs */}
      <div className="platform-tab-bar mb-4">
        {['twitter', 'linkedin', 'instagram'].map(tab => (
          <button
            key={tab}
            className={`platform-tab${activeTab === tab ? ' active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{ textTransform: 'capitalize' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Platform Preview */}
      {activeTab === 'twitter'   && <TwitterPreview content={content} />}
      {activeTab === 'linkedin'  && <LinkedInPreview content={content} />}
      {activeTab === 'instagram' && <InstagramPreview content={content} />}

      {/* Published URL */}
      {post.published_url && (
        <div className="flex items-center mt-4 pt-4" style={{ borderTop: '1px solid var(--glass-border)', gap: '0.75rem' }}>
          <Share2 size={14} color="var(--primary)" />
          <a href={post.published_url} target="_blank" rel="noreferrer"
            style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 500 }}>
            View Live Post →
          </a>
        </div>
      )}
    </div>
  );
}

export default function CampaignViewer() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  useEffect(() => {
    let interval;
    if (campaign && (campaign.status === 'processing' || campaign.status === 'publishing')) {
      interval = setInterval(fetchDetails, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [campaign?.status, fetchDetails]);

  const fetchDetails = React.useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/campaigns/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setCampaign(await res.json());
    } catch { console.error('Failed to fetch details'); }
    finally { setLoading(false); }
  }, [id, token]);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/campaigns/${id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchDetails();
    } catch { console.error('Failed to publish'); }
    finally { setPublishing(false); }
  };

  if (loading) return (
    <div className="animate-fade-in">
      <div className="loading-skeleton" style={{ height: '100px', marginBottom: '1.5rem' }} />
      <div className="loading-skeleton" style={{ height: '400px' }} />
    </div>
  );

  if (!campaign) return (
    <div className="text-center" style={{ paddingTop: '4rem' }}>
      <h3>Campaign not found</h3>
      <button className="btn-secondary mt-4" style={{ width: 'auto' }} onClick={() => navigate('/')}>Back to Dashboard</button>
    </div>
  );

  const isProcessing = campaign.status === 'processing' || campaign.status === 'draft';
  const isPublishing = campaign.status === 'publishing';

  // Separate media prompts vs posts
  const regularPosts = (campaign.posts || []).filter(p => {
    try { const pay = JSON.parse(p.content_text); return pay.platform !== 'media'; } catch { return true; }
  });

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <button className="btn-ghost mb-4" onClick={() => navigate('/')}>
        <ArrowLeft size={15} /> Back to Dashboard
      </button>

      {/* Campaign header */}
      <div className="glass-panel mb-6 flex justify-between items-center" style={{ padding: '1.5rem 2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontFamily: 'Outfit', fontWeight: 700, marginBottom: '0.25rem' }}>
            {campaign.name}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {campaign.niche} &nbsp;·&nbsp; {campaign.target_audience}
          </p>
        </div>
        <StatusBadge status={campaign.status} isProcessing={isProcessing} isPublishing={isPublishing} />
      </div>

      {/* Pipeline Button */}
      <div className="glass-panel mb-6" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(168,85,247,0.06))', border: '1px solid rgba(99,102,241,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <GitBranch size={18} color="#818cf8" />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Director Pipeline</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Launch the multi-modal content factory</div>
          </div>
        </div>
        <button className="btn-primary" style={{ width: 'auto', fontSize: '0.85rem' }} onClick={() => navigate(`/campaign/${id}/flow`)}>
          <Film size={14} /> Open Pipeline
        </button>
      </div>

      {/* Media Previews */}
      {(campaign.voiceover_url || campaign.thumbnail_url || campaign.video_url) && (
        <div className="glass-panel mb-6 animate-fade-in">
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎬 Generated Media
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {campaign.thumbnail_url && (
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(96,165,250,0.2)' }}>
                <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Image size={12} /> AI Thumbnail
                </div>
                <img src={campaign.thumbnail_url} alt="AI Thumbnail" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
              </div>
            )}
            {campaign.video_url && (
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(168,85,247,0.2)' }}>
                <div style={{ padding: '0.6rem 0.8rem', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Film size={12} /> AI Video
                </div>
                <video src={campaign.video_url} controls style={{ width: '100%', maxHeight: 220 }} preload="metadata" />
              </div>
            )}
            {campaign.voiceover_url && (
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '1rem', border: '1px solid rgba(244,114,182,0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                  <Volume2 size={12} /> AI Voiceover
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Mic size={24} color="#f472b6" />
                  <audio src={campaign.voiceover_url} controls style={{ flex: 1, height: 36 }} preload="metadata" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="glass-panel text-center animate-fade-in" style={{ padding: '5rem 2rem' }}>
          <Activity size={52} className="animate-pulse-glow" style={{ margin: '0 auto 1.5rem', display: 'block', color: 'var(--primary)' }} />
          <h3 style={{ marginBottom: '0.75rem' }}>The AI agents are working…</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Strategy → Research → Content → Platform Formatter → Creative Agent
          </p>
          <div className="flex justify-center gap-3 mt-6" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {['Strategy', 'Research', 'Content', 'Platform', 'Creative'].map((a, i) => (
              <span key={a} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Loader2 size={10} className="animate-spin" style={{ animationDelay: `${i * 0.2}s` }} /> {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Generated content */}
      {!isProcessing && regularPosts.length > 0 && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              Generated Content &nbsp;<span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.875rem' }}>({regularPosts.length} posts)</span>
            </h2>
            {campaign.status === 'completed' && (
              <button
                id="publish-btn"
                onClick={handlePublish}
                disabled={publishing}
                className="btn-primary"
                style={{ width: 'auto', background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                {publishing
                  ? <><Loader2 size={15} className="animate-spin" /> Publishing…</>
                  : <><Rocket size={15} /> Publish Live to Platforms</>
                }
              </button>
            )}
          </div>

          <div className="grid gap-6">
            {regularPosts.map(post => <PostCard key={post.id} post={post} />)}
          </div>
        </>
      )}

      {/* Empty state after completion */}
      {!isProcessing && regularPosts.length === 0 && (
        <div className="glass-panel text-center" style={{ padding: '4rem 2rem' }}>
          <Clock size={40} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--text-muted)' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Waiting for AI Output</h3>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Posts will appear here once the AI agents finish processing.
          </p>
        </div>
      )}
    </div>
  );
}
