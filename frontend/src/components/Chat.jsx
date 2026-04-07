import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Send, Bot, User, AlignLeft, Menu, Loader2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

export default function Chat() {
  const { token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  const [tokenBalance, setTokenBalance] = useState('...');
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadSessions();
    loadBalance();
  }, []);

  useEffect(() => {
    if (currentSessionId) loadMessages(currentSessionId);
    else setMessages([]);
  }, [currentSessionId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const loadSessions = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSessions(await res.json());
    } catch (e) { console.error('Failed to load sessions'); }
  };

  const loadBalance = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTokenBalance(data.token_balance || 0);
      }
    } catch (e) { }
  };

  const loadMessages = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/chat/sessions/${id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMessages(await res.json());
      }
    } catch (e) { console.error('Failed to load messages'); }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const msgText = inputMsg;
    setInputMsg('');
    setMessages(prev => [...prev, { role: 'user', content: msgText }]);
    setIsTyping(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: msgText, sessionId: currentSessionId })
      });

      if (!response.ok) {
        const errData = await response.json();
        setIsTyping(false);
        setMessages(prev => [...prev, { role: 'assistant', content: `**Error:** ${errData.error}` }]);
        return;
      }

      // Read SSE Stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '');
            try {
              const payload = JSON.parse(dataStr);
              if (payload.type === 'session_id') {
                if (!currentSessionId) {
                  setCurrentSessionId(payload.sessionId);
                  loadSessions();
                }
              } else if (payload.type === 'chunk') {
                assistantMessage += payload.content;
                setMessages(prev => {
                  const copy = [...prev];
                  copy[copy.length - 1].content = assistantMessage;
                  return copy;
                });
              } else if (payload.type === 'done') {
                setIsTyping(false);
                loadBalance(); // update tokens visually
              }
            } catch (err) {}
          }
        }
      }
    } catch (e) {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex" style={{ height: 'calc(100vh - 120px)', gap: '1rem' }}>
      {/* Side Panel */}
      <div className="glass-panel" style={{ width: '260px', display: 'flex', flexDirection: 'column' }}>
        <button className="btn-primary mb-4" onClick={() => setCurrentSessionId(null)}>
          + New Team Chat
        </button>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>RECENT SESSIONS</div>
          {sessions.map(s => (
            <div 
              key={s.id}
              onClick={() => setCurrentSessionId(s.id)}
              style={{
                padding: '0.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                background: currentSessionId === s.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                marginBottom: '0.2rem',
                fontSize: '0.9rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {s.title}
            </div>
          ))}
        </div>
        
        {/* Token Balance */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', marginTop: '1rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Total Tokens</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
            {tokenBalance.toLocaleString()} <span style={{fontSize:'0.8rem', fontWeight:'normal'}}>available</span>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bot size={20} color="var(--primary)" />
          <strong>AI Marketing Orchestrator</strong>
          <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} /> Supervisor Active
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Bot size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
              <h3>How can the Marketing Team help you today?</h3>
              <p style={{ maxWidth: 400, margin: '0 auto', fontSize: '0.9rem' }}>
                Chat with the Supervisor to write strategy, design visuals, or code complete automation scripts.
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', 
                  background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {m.role === 'user' ? <User size={16} color="#fff" /> : <Bot size={16} color="var(--primary)" />}
                </div>
                <div 
                  className="chat-bubble-markdown"
                  style={{
                    background: m.role === 'user' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                    padding: '1rem',
                    borderRadius: '12px',
                    maxWidth: '80%',
                    whiteSpace: 'pre-wrap',
                    color: m.role === 'user' ? '#fff' : 'var(--text)',
                    overflowX: 'auto'
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(m.content)) }}
                />
              </div>
            ))
          )}
          {isTyping && (
             <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={16} className="animate-spin" color="var(--primary)" />
                </div>
                <div style={{ background: 'transparent', padding: '0.5rem', color: 'var(--text-muted)' }}>
                  Manager is orchestrating task...
                </div>
             </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form onSubmit={sendMessage} style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="input-group" style={{ margin: 0, position: 'relative' }}>
            <input 
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              placeholder="Ask the team to write a campaign, analyze trends, or code an email template..."
              style={{ paddingRight: '3rem', borderRadius: '99px', background: 'rgba(0,0,0,0.2)' }}
              disabled={isTyping}
            />
            <button 
              type="submit" 
              disabled={isTyping || !inputMsg.trim()}
              style={{
                position: 'absolute', right: '4px', top: '4px', bottom: '4px', 
                background: 'var(--primary)', color: '#fff', border: 'none', 
                borderRadius: '99px', width: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}>
              <Send size={16} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
