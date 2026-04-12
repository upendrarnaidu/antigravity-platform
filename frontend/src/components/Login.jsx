import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Zap, KeyRound, ArrowLeft, ArrowRight, Loader2, Shield, Sparkles } from 'lucide-react';

export default function Login() {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const { login, PYTHON_API } = useAuth();
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${PYTHON_API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to send OTP');
      setStep('otp');
      setCountdown(60);
      // Focus first OTP input
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pasted = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...otpDigits];
      pasted.forEach((d, i) => { if (index + i < 6) newDigits[index + i] = d; });
      setOtpDigits(newDigits);
      const nextEmpty = newDigits.findIndex(d => !d);
      if (nextEmpty !== -1) otpRefs.current[nextEmpty]?.focus();
      else otpRefs.current[5]?.focus();
      return;
    }

    if (value && !/^\d$/.test(value)) return;
    
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    
    // Auto-advance
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError(null);
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${PYTHON_API}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Verification failed');
      
      login(data.token, data.user_id, data.email);
      // New users go to onboarding; returning users go to dashboard
      navigate(data.is_new_user ? '/onboarding' : '/', { replace: true });
    } catch (err) {
      setError(err.message);
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${PYTHON_API}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.error || 'Failed to resend');
      setCountdown(60);
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a14', position: 'relative', overflow: 'hidden' }}>
      {/* Animated background orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '-10%', width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)',
          animation: 'float-slow 20s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-5%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)',
          animation: 'float-slow 25s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 60%)',
          borderRadius: '50%', filter: 'blur(100px)',
        }} />
      </div>

      <div className="login-card animate-fade-in" style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px',
        background: 'linear-gradient(135deg, rgba(15,15,35,0.95) 0%, rgba(20,20,45,0.95) 100%)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: '20px', padding: '2.5rem',
        boxShadow: '0 0 80px rgba(99,102,241,0.08), 0 25px 50px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)',
      }}>
        
        {/* Back button on OTP step */}
        {step === 'otp' && (
          <button 
            onClick={() => { setStep('email'); setError(null); setOtpDigits(['','','','','','']); }}
            style={{
              position: 'absolute', top: '1.25rem', left: '1.25rem',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '6px 12px',
              color: 'var(--text-muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '0.8rem', transition: 'all 0.2s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <ArrowLeft size={12} /> Back
          </button>
        )}

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', justifyContent: 'center' }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 25px rgba(99,102,241,0.35)',
          }}>
            <Zap size={22} color="#fff" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, fontFamily: 'Outfit, sans-serif', lineHeight: 1, background: 'linear-gradient(to right, #e2e8f0, #ffffff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Marketing OS</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px', letterSpacing: '0.5px' }}>AUTOMATION PLATFORM</div>
          </div>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif', color: '#fff' }}>
            {step === 'email' ? 'Welcome' : 'Verify your email'}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {step === 'email'
              ? 'Sign in or create an account with your email'
              : <>We sent a 6-digit code to <strong style={{ color: '#818cf8' }}>{email}</strong></>
            }
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '1.25rem',
            color: '#f87171', fontSize: '0.85rem', textAlign: 'center',
            animation: 'shake 0.4s ease-in-out',
          }}>
            {error}
          </div>
        )}

        {/* Email Step */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 500 }}>
                <Mail size={13} /> Email address
              </label>
              <input
                id="email-input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={{
                  width: '100%', padding: '0.85rem 1rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12, color: '#fff',
                  fontSize: '0.95rem', outline: 'none',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            
            <button id="login-submit-btn" type="submit" disabled={loading} style={{
              width: '100%', padding: '0.85rem',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none', borderRadius: 12,
              color: '#fff', fontSize: '0.95rem', fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.3s',
              boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
              opacity: loading ? 0.7 : 1,
            }}
              onMouseOver={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 25px rgba(99,102,241,0.45)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.3)'; }}
            >
              {loading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Sending code...</>
              ) : (
                <>Continue <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '1.75rem' }}>
              {otpDigits.map((digit, i) => (
                <input
                  key={i}
                  ref={el => otpRefs.current[i] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onFocus={e => e.target.select()}
                  style={{
                    width: '50px', height: '58px',
                    textAlign: 'center', fontSize: '1.5rem', fontWeight: 700,
                    fontFamily: 'Outfit, monospace',
                    background: digit ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${digit ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: 12, color: '#fff', outline: 'none',
                    transition: 'all 0.2s',
                    caretColor: '#818cf8',
                  }}
                  onFocusCb={(e) => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                />
              ))}
            </div>
            
            <button id="verify-otp-btn" type="submit" disabled={loading || otpDigits.join('').length !== 6} style={{
              width: '100%', padding: '0.85rem',
              background: otpDigits.join('').length === 6 
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(255,255,255,0.05)',
              border: 'none', borderRadius: 12,
              color: otpDigits.join('').length === 6 ? '#fff' : '#475569',
              fontSize: '0.95rem', fontWeight: 600,
              cursor: loading || otpDigits.join('').length !== 6 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.3s',
              boxShadow: otpDigits.join('').length === 6 ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</>
              ) : (
                <><Shield size={16} /> Verify & Sign In</>
              )}
            </button>

            {/* Resend */}
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              {countdown > 0 ? (
                <span style={{ fontSize: '0.85rem', color: '#475569' }}>
                  Resend code in <strong style={{ color: '#818cf8' }}>{countdown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  style={{
                    background: 'none', border: 'none',
                    color: '#818cf8', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: 500,
                    textDecoration: 'underline', textUnderlineOffset: '3px',
                  }}
                >
                  Resend verification code
                </button>
              )}
            </div>
          </form>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          marginTop: '2rem', paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          color: '#475569', fontSize: '0.75rem',
        }}>
          <Sparkles size={11} />
          <span>Secured with end-to-end encryption</span>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.05); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
