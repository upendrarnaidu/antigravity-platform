import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, KeyRound, Loader2, ArrowRight, X, ShieldCheck } from 'lucide-react';

export default function AuthModal({ onClose, onSuccess }) {
  const { PYTHON_API, login } = useAuth();
  
  const [step, setStep] = useState(1); // 1: Email, 2: OTP
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const inputRef = useRef(null);

  // Focus input automatically on step change
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [step]);

  // Auto-submit OTP when 6 digits are entered
  useEffect(() => {
    if (step === 2 && otp.length === 6) {
      handleVerifyOtp();
    }
  }, [otp, step]);

  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${PYTHON_API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to send OTP.');
      }

      setSuccessMsg(`Code sent to ${email}`);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      setError('OTP must be 6 digits.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${PYTHON_API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Invalid or expired OTP.');
      }

      // Success
      login(data.token, data.user_id, data.email);
      if (data.is_new_user) {
        // New user needs onboarding — redirect
        window.location.href = '/onboarding';
        return;
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
      setOtp(''); // clear OTP on fail
      if (inputRef.current) inputRef.current.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      
      <div onClick={e => e.stopPropagation()} style={{
        background: 'linear-gradient(135deg, rgba(15,15,35,0.98), rgba(20,10,40,0.98))',
        border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 24, padding: '2.5rem 2rem', width: 400, maxWidth: '90vw',
        boxShadow: '0 30px 60px rgba(0,0,0,0.6)', position: 'relative'
      }}>
        
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
          padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 1.25rem',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.15)'
          }}>
            <ShieldCheck size={28} color="#818cf8" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontFamily: 'Outfit, sans-serif', color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
            {step === 1 ? 'Welcome to Antigravity' : 'Enter Verification Code'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
            {step === 1 
              ? 'Sign in securely with a magic code.' 
              : successMsg || `Enter the 6-digit code sent to your email.`}
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#ef4444', padding: '0.75rem', borderRadius: 12, fontSize: '0.8rem',
            marginBottom: '1rem', textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex' }}>
                <Mail size={18} />
              </div>
              <input
                ref={inputRef}
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: '1rem 1rem 1rem 3rem', color: '#f8fafc', fontSize: '0.95rem',
                  outline: 'none', transition: 'border-color 0.2s', fontFamily: 'Inter, sans-serif',
                }}
              />
            </div>
            
            <button type="submit" disabled={loading || !email} style={{
              width: '100%', padding: '1rem',
              background: loading || !email ? 'rgba(99,102,241,0.5)' : 'linear-gradient(135deg, #6366f1, #a855f7)',
              border: 'none', borderRadius: 14, color: '#fff',
              fontWeight: 700, fontSize: '0.95rem', cursor: loading || !email ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: loading || !email ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
              transition: 'all 0.2s'
            }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              {loading ? 'Sending Code...' : 'Send Magic Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#64748b', display: 'flex' }}>
                <KeyRound size={18} />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder="123456"
                value={otp}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                  setOtp(val);
                }}
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                style={{
                  width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: '1rem 1rem 1rem 3rem', color: '#f8fafc', fontSize: '1.2rem',
                  outline: 'none', transition: 'border-color 0.2s', fontFamily: 'monospace',
                  letterSpacing: '0.2em', fontWeight: 700, textAlign: 'center'
                }}
              />
            </div>
            
            <button type="submit" disabled={loading || otp.length !== 6} style={{
              width: '100%', padding: '1rem',
              background: loading || otp.length !== 6 ? 'rgba(16,185,129,0.5)' : 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none', borderRadius: 14, color: '#fff',
              fontWeight: 700, fontSize: '0.95rem', cursor: loading || otp.length !== 6 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              boxShadow: loading || otp.length !== 6 ? 'none' : '0 4px 20px rgba(16,185,129,0.4)',
              transition: 'all 0.2s'
            }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setStep(1)} disabled={loading} style={{
                background: 'none', border: 'none', color: '#818cf8', fontSize: '0.8rem',
                cursor: 'pointer', textDecoration: 'underline'
              }}>
                Use a different email
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
