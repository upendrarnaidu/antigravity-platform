import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Building2, Target, ArrowRight, ArrowLeft, Loader2,
  Sparkles, CheckCircle2, Phone, Globe, Briefcase, Users,
  Zap, Check
} from 'lucide-react';

// ── Option Data ─────────────────────────────────────────────
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-1,000', '1,001-5,000', '5,000+'];

const INDUSTRIES = [
  'Technology', 'E-Commerce', 'Healthcare', 'Finance & Banking',
  'Education', 'Real Estate', 'Media & Entertainment', 'Travel & Hospitality',
  'Food & Beverage', 'Retail', 'Manufacturing', 'Professional Services',
  'Non-Profit', 'Government', 'Automotive', 'Fashion & Apparel', 'Other'
];

const USE_CASES = [
  'Social Media Marketing', 'Email Marketing', 'Content Creation',
  'Video Marketing', 'SEO & Blog', 'Paid Advertising',
  'Brand Management', 'Analytics & Reporting', 'Influencer Marketing',
  'Product Launches'
];

const MARKETING_BUDGETS = [
  'Under $1,000', '$1,000 - $5,000', '$5,000 - $25,000',
  '$25,000 - $100,000', '$100,000+'
];

const CURRENT_TOOLS = [
  'HubSpot', 'Mailchimp', 'Hootsuite', 'Buffer', 'Canva',
  'Salesforce', 'Google Ads', 'Meta Ads', 'SEMrush', 'Ahrefs',
  'Sprout Social', 'Later', 'Adobe Creative Suite', 'Figma', 'None'
];

const REFERRAL_SOURCES = [
  'Google Search', 'Social Media', 'Friend / Colleague',
  'Blog / Article', 'Conference / Event', 'YouTube', 'Podcast',
  'Product Hunt', 'Other'
];

const TEAM_SIZES = ['Just me', '2-5', '6-15', '16-50', '50+'];

// ── Styles ──────────────────────────────────────────────────
const inputStyle = {
  width: '100%', padding: '0.8rem 1rem',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12, color: '#f8fafc',
  fontSize: '0.9rem', outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: 'Inter, sans-serif',
};

const labelStyle = {
  display: 'block', fontSize: '0.8rem', color: '#94a3b8',
  marginBottom: '0.4rem', fontWeight: 500,
};

const chipBaseStyle = {
  padding: '0.45rem 0.9rem', borderRadius: 20,
  fontSize: '0.8rem', cursor: 'pointer',
  transition: 'all 0.2s', border: '1px solid',
  fontWeight: 500, userSelect: 'none',
  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
};

function InputField({ label, required, icon: Icon, ...props }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && (
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569', display: 'flex' }}>
            <Icon size={15} />
          </div>
        )}
        <input
          {...props}
          style={{ ...inputStyle, ...(Icon ? { paddingLeft: '2.4rem' } : {}) }}
          onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
    </div>
  );
}

function SelectField({ label, required, options, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={{
          ...inputStyle, appearance: 'none', cursor: 'pointer',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2394a3b8' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
      >
        <option value="" style={{ background: '#1a1a2e', color: '#94a3b8' }}>{placeholder || 'Select...'}</option>
        {options.map(opt => (
          <option key={opt} value={opt} style={{ background: '#1a1a2e', color: '#f8fafc' }}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function ChipSelect({ label, required, options, selected, onChange, multi = false }) {
  const toggle = (val) => {
    if (multi) {
      onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val]);
    } else {
      onChange(val === selected ? '' : val);
    }
  };
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: '#ef4444' }}>*</span>}
        {multi && <span style={{ color: '#475569', fontWeight: 400 }}> (select all that apply)</span>}
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {options.map(opt => {
          const isSelected = multi ? selected.includes(opt) : selected === opt;
          return (
            <button key={opt} type="button" onClick={() => toggle(opt)}
              style={{
                ...chipBaseStyle,
                background: isSelected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                borderColor: isSelected ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)',
                color: isSelected ? '#a5b4fc' : '#94a3b8',
                boxShadow: isSelected ? '0 0 12px rgba(99,102,241,0.15)' : 'none',
              }}
            >
              {isSelected && <Check size={12} />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}


export default function Onboarding() {
  const { PYTHON_API, token, refreshProfile, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if not authenticated or already onboarded
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    } else if (user?.profile_completed) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [animDirection, setAnimDirection] = useState('right');

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [useCases, setUseCases] = useState([]);
  const [marketingBudget, setMarketingBudget] = useState('');
  const [currentTools, setCurrentTools] = useState([]);
  const [referralSource, setReferralSource] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const STEPS = [
    { num: 1, label: 'About You', icon: User },
    { num: 2, label: 'Company', icon: Building2 },
    { num: 3, label: 'Goals', icon: Target },
  ];

  const validateStep = (s) => {
    switch (s) {
      case 1: return firstName.trim() && lastName.trim();
      case 2: return companyName.trim() && jobTitle.trim() && companySize && industry;
      case 3: return useCases.length > 0 && acceptedTerms;
      default: return true;
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setAnimDirection('right');
    setStep(s => Math.min(s + 1, totalSteps));
  };

  const prevStep = () => {
    setError('');
    setAnimDirection('left');
    setStep(s => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) {
      setError('Please fill in all required fields and accept terms.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${PYTHON_API}/api/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          company_name: companyName.trim(),
          job_title: jobTitle.trim(),
          company_website: companyWebsite.trim() || null,
          company_size: companySize,
          industry,
          use_cases: useCases,
          marketing_budget: marketingBudget || null,
          current_tools: currentTools,
          referral_source: referralSource || null,
          marketing_team_size: teamSize || null,
          accepted_terms: acceptedTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save profile');

      await refreshProfile();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a14', position: 'relative', overflow: 'hidden', padding: '2rem 1rem',
    }}>
      {/* Background orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '-15%', right: '-10%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)',
          animation: 'float-slow 22s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)',
          animation: 'float-slow 28s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 60%)',
          borderRadius: '50%', filter: 'blur(100px)',
        }} />
      </div>

      <div style={{
        position: 'relative', zIndex: 1, width: '100%', maxWidth: 560,
        background: 'linear-gradient(135deg, rgba(15,15,35,0.96) 0%, rgba(20,20,45,0.96) 100%)',
        border: '1px solid rgba(99,102,241,0.12)',
        borderRadius: 24, padding: '2.5rem',
        boxShadow: '0 0 80px rgba(99,102,241,0.06), 0 25px 50px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, margin: '0 auto 1rem',
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 25px rgba(99,102,241,0.35)',
          }}>
            <Zap size={24} color="#fff" strokeWidth={2.5} />
          </div>
          <h1 style={{
            fontSize: '1.5rem', fontFamily: 'Outfit, sans-serif', color: '#f8fafc',
            margin: '0 0 0.4rem', fontWeight: 700,
          }}>
            Complete Your Profile
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
            Tell us about yourself to personalize your experience
          </p>
        </div>

        {/* Progress Bar */}
        <div style={{
          height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 4,
          marginBottom: '1.5rem', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 4,
            background: 'linear-gradient(90deg, #6366f1, #a855f7)',
            width: `${progress}%`, transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 12px rgba(99,102,241,0.5)',
          }} />
        </div>

        {/* Step Indicator */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '0.5rem',
          marginBottom: '1.75rem',
        }}>
          {STEPS.map(({ num, label, icon: StepIcon }) => (
            <button key={num} type="button"
              onClick={() => {
                if (num < step) { setAnimDirection('left'); setStep(num); setError(''); }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.85rem', borderRadius: 20,
                fontSize: '0.75rem', fontWeight: 600, cursor: num < step ? 'pointer' : 'default',
                border: '1px solid',
                background: step === num ? 'rgba(99,102,241,0.15)' : num < step ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
                borderColor: step === num ? 'rgba(99,102,241,0.4)' : num < step ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)',
                color: step === num ? '#a5b4fc' : num < step ? '#34d399' : '#475569',
                transition: 'all 0.3s',
              }}
            >
              {num < step ? <CheckCircle2 size={13} /> : <StepIcon size={13} />}
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 12, padding: '0.7rem 1rem', marginBottom: '1rem',
            color: '#f87171', fontSize: '0.82rem', textAlign: 'center',
            animation: 'shake 0.4s ease-in-out',
          }}>
            {error}
          </div>
        )}

        {/* Step Content */}
        <div key={step} style={{ animation: `slideIn${animDirection === 'right' ? 'Right' : 'Left'} 0.35s ease-out` }}>

          {/* ─── Step 1: Personal Info ────────────────────── */}
          {step === 1 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <InputField label="First Name" required icon={User}
                  placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} />
                <InputField label="Last Name" required
                  placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
              <InputField label="Phone Number" icon={Phone}
                placeholder="+1 (555) 123-4567" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          )}

          {/* ─── Step 2: Company Info ─────────────────────── */}
          {step === 2 && (
            <div>
              <InputField label="Company Name" required icon={Building2}
                placeholder="Acme Corp" value={companyName} onChange={e => setCompanyName(e.target.value)} />
              <InputField label="Job Title / Role" required icon={Briefcase}
                placeholder="Marketing Director" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
              <InputField label="Company Website" icon={Globe}
                placeholder="https://acme.com" type="url" value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <SelectField label="Company Size" required options={COMPANY_SIZES}
                  value={companySize} onChange={setCompanySize} placeholder="Select size..." />
                <SelectField label="Industry" required options={INDUSTRIES}
                  value={industry} onChange={setIndustry} placeholder="Select industry..." />
              </div>
            </div>
          )}

          {/* ─── Step 3: Marketing Goals + Terms ─────────── */}
          {step === 3 && (
            <div>
              <ChipSelect label="Primary Use Cases" required multi
                options={USE_CASES} selected={useCases} onChange={setUseCases} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
                <SelectField label="Monthly Marketing Budget" options={MARKETING_BUDGETS}
                  value={marketingBudget} onChange={setMarketingBudget} placeholder="Select range..." />
                <SelectField label="Marketing Team Size" options={TEAM_SIZES}
                  value={teamSize} onChange={setTeamSize} placeholder="Select size..." />
              </div>

              <ChipSelect label="Tools You Currently Use" multi
                options={CURRENT_TOOLS} selected={currentTools} onChange={setCurrentTools} />

              <SelectField label="How Did You Hear About Us?" options={REFERRAL_SOURCES}
                value={referralSource} onChange={setReferralSource} placeholder="Select source..." />

              {/* Terms & Conditions */}
              <div style={{
                background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)',
                borderRadius: 14, padding: '1rem 1.15rem', marginTop: '0.5rem',
              }}>
                <label style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer',
                  fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.5,
                }}>
                  <div style={{
                    width: 20, height: 20, minWidth: 20, borderRadius: 6, marginTop: 1,
                    border: `2px solid ${acceptedTerms ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
                    background: acceptedTerms ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', cursor: 'pointer',
                  }} onClick={() => setAcceptedTerms(!acceptedTerms)}>
                    {acceptedTerms && <Check size={13} color="#fff" strokeWidth={3} />}
                  </div>
                  <span onClick={() => setAcceptedTerms(!acceptedTerms)}>
                    I agree to the{' '}
                    <Link to="/terms" target="_blank" style={{ color: '#818cf8', textDecoration: 'underline', textUnderlineOffset: 2 }}
                      onClick={e => e.stopPropagation()}>
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link to="/privacy" target="_blank" style={{ color: '#818cf8', textDecoration: 'underline', textUnderlineOffset: 2 }}
                      onClick={e => e.stopPropagation()}>
                      Privacy Policy
                    </Link>
                    {' '}<span style={{ color: '#ef4444' }}>*</span>
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex', gap: '0.75rem', marginTop: '1.75rem',
        }}>
          {step > 1 && (
            <button type="button" onClick={prevStep} style={{
              flex: '0 0 auto', padding: '0.8rem 1.25rem',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, color: '#94a3b8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8'; }}
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}

          {step < totalSteps ? (
            <button type="button" onClick={nextStep} style={{
              flex: 1, padding: '0.8rem',
              background: validateStep(step)
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'rgba(99,102,241,0.3)',
              border: 'none', borderRadius: 14, color: '#fff',
              fontSize: '0.9rem', fontWeight: 600,
              cursor: validateStep(step) ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              boxShadow: validateStep(step) ? '0 4px 20px rgba(99,102,241,0.3)' : 'none',
              transition: 'all 0.3s', opacity: validateStep(step) ? 1 : 0.6,
            }}
              onMouseOver={e => { if (validateStep(step)) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 25px rgba(99,102,241,0.45)'; } }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = validateStep(step) ? '0 4px 20px rgba(99,102,241,0.3)' : 'none'; }}
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit}
              disabled={loading || !validateStep(3)}
              style={{
                flex: 1, padding: '0.8rem',
                background: (validateStep(3) && !loading)
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'rgba(16,185,129,0.3)',
                border: 'none', borderRadius: 14, color: '#fff',
                fontSize: '0.9rem', fontWeight: 600,
                cursor: (validateStep(3) && !loading) ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                boxShadow: (validateStep(3) && !loading) ? '0 4px 20px rgba(16,185,129,0.3)' : 'none',
                transition: 'all 0.3s', opacity: (validateStep(3) && !loading) ? 1 : 0.6,
              }}
              onMouseOver={e => { if (validateStep(3) && !loading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 25px rgba(16,185,129,0.45)'; } }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = (validateStep(3) && !loading) ? '0 4px 20px rgba(16,185,129,0.3)' : 'none'; }}
            >
              {loading ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
              ) : (
                <><Sparkles size={16} /> Launch My Dashboard</>
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          marginTop: '1.5rem', paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          color: '#334155', fontSize: '0.7rem',
        }}>
          <Sparkles size={10} />
          <span>Step {step} of {totalSteps} · Your data is encrypted and secure</span>
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
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        select option {
          background: #1a1a2e !important;
          color: #f8fafc !important;
        }
      `}</style>
    </div>
  );
}
