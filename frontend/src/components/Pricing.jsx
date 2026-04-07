import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Check, Zap, Rocket, Star, Loader2, Coins, Globe, Crown, Sparkles } from 'lucide-react';

const PLANS = [
  {
    name: 'Free',
    desc: 'Perfect for trying out the platform.',
    prices: { USD: 0, INR: 0, GBP: 0, EUR: 0 },
    features: ['1 Campaign', 'Basic Agent Team', 'Community Support', '100k Included Tokens'],
    icon: Star,
    color: '#94a3b8'
  },
  {
    name: 'Pro',
    desc: 'For modern marketers scaling their growth.',
    prices: { USD: 29, INR: 1999, GBP: 25, EUR: 27 },
    features: ['10 Campaigns / month', 'Full Marketing AI Team', 'Priority Email Support', '1m Included Tokens'],
    icon: Zap,
    color: '#818cf8',
    isPopular: true
  },
  {
    name: 'Enterprise',
    desc: 'Advanced tools and dedicated support.',
    prices: { USD: 99, INR: 4999, GBP: 85, EUR: 89 },
    features: ['Unlimited Campaigns', 'Custom Brand Voice', 'Dedicated Account Manager', '5m Included Tokens'],
    icon: Rocket,
    color: '#f472b6'
  }
];

const CURRENCY_CONFIG = {
  USD: { symbol: '$', locale: 'en-US' },
  INR: { symbol: '₹', locale: 'en-IN' },
  GBP: { symbol: '£', locale: 'en-GB' },
  EUR: { symbol: '€', locale: 'en-EU' },
};

export default function Pricing() {
  const { token, user, PYTHON_API, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loadingPrice, setLoadingPrice] = useState(null);
  const [error, setError] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false);
  
  // Dynamic Currency State
  const [currency, setCurrency] = useState('USD');
  const [location, setLocation] = useState('Detecting...');

  useEffect(() => {
    const detectLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data.currency && CURRENCY_CONFIG[data.currency]) {
          setCurrency(data.currency);
        }
        setLocation(`${data.city}, ${data.country_name}`);
      } catch (err) {
        console.error("Location detection failed, defaulting to USD");
        setLocation("Global (Default)");
      }
    };
    detectLocation();
  }, []);

  const handleCheckout = async (tier) => {
    if (tier === 'free') {
      navigate('/');
      return;
    }
    
    setLoadingPrice(tier);
    setError(null);

    try {
      // 1. Create Order on Python Backend
      const orderRes = await fetch(`${PYTHON_API}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ tier, currency })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.detail || orderData.error || 'Failed to initiate order');

      // 2. Open Razorpay Checkout
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AI Marketing Platform",
        description: `Upgrade to ${tier.toUpperCase()} Plan`,
        order_id: orderData.orderId,
        handler: async function (response) {
          // 3. Verify Payment on Python Backend
          try {
            const verifyRes = await fetch(`${PYTHON_API}/api/payments/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                ...response,
                tier
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.detail || verifyData.error || 'Verification failed');

            // Success! Refresh user profile
            await refreshProfile();
            window.location.href = '/pricing?success=true';
          } catch (vErr) {
            setError(vErr.message);
          } finally {
            setLoadingPrice(null);
          }
        },
        prefill: {
          email: user?.email || '',
        },
        theme: {
          color: "#818cf8"
        },
        modal: {
          ondismiss: function() {
            setLoadingPrice(null);
          }
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
    } catch (err) {
      setError(err.message);
      setLoadingPrice(null);
    }
  };

  const currentSymbol = CURRENCY_CONFIG[currency]?.symbol || '$';
  const currentTier = user?.tier || 'free';

  return (
    <div className="animate-fade-in text-center" style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '2rem', paddingBottom: '4rem' }}>
      {/* Current plan badge */}
      {currentTier !== 'free' && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '50px', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '1rem', fontSize: '0.85rem', color: '#818cf8' }}>
          <Crown size={14} />
          <span>Current Plan: <strong>{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</strong></span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
        <Globe size={14} />
        <span>Browsing from: <strong>{location}</strong></span>
      </div>
      
      <h1 className="page-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Plans & Pricing</h1>
      <p className="page-subtitle mb-8" style={{ fontSize: '1.1rem' }}>Choose the best plan for your marketing automation needs.</p>
      
      {/* Annual Billing Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '3rem' }}>
        <span style={{ fontWeight: !isAnnual ? 700 : 400, color: !isAnnual ? '#fff' : 'var(--text-muted)' }}>Monthly</span>
        <button 
          onClick={() => setIsAnnual(!isAnnual)}
          style={{ width: '60px', height: '32px', borderRadius: '40px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', position: 'relative', cursor: 'pointer', transition: '0.3s' }}>
          <div style={{ position: 'absolute', top: '3px', left: isAnnual ? '31px' : '4px', width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
        </button>
        <span style={{ fontWeight: isAnnual ? 700 : 400, color: isAnnual ? '#fff' : 'var(--text-muted)' }}>Yearly <span style={{ color: '#34d399', fontSize: '0.8rem', background: 'rgba(52,211,153,0.1)', padding: '2px 8px', borderRadius: '12px', marginLeft: '4px' }}>Save 20%</span></span>
      </div>

      {error && (
        <div style={{ color: '#ef4444', marginBottom: '2rem', background: 'rgba(239,68,68,0.1)', padding: '1rem', borderRadius: '8px' }}>Error: {error}</div>
      )}

      {new URLSearchParams(window.location.search).get('success') === 'true' && (
        <div style={{ color: '#34d399', marginBottom: '2rem', padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Sparkles size={18} /> Payment successful! Your account has been upgraded.
        </div>
      )}

      <div className="grid grid-3 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'stretch' }}>
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const rawPrice = plan.prices[currency] || plan.prices['USD'];
          const displayPrice = isAnnual ? Math.floor(rawPrice * 0.8) : rawPrice;
          const isCurrentPlan = currentTier === plan.name.toLowerCase();

          return (
             <div key={plan.name} className={`glass-panel pricing-card ${plan.isPopular ? 'popular' : ''}`}>
              {plan.isPopular && <div className="popular-badge">Most Popular</div>}
              <div className="pricing-card-icon" style={{ background: `${plan.color}22` }}>
                <Icon size={24} color={plan.color} />
              </div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{plan.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', minHeight: '40px' }}>{plan.desc}</p>
              
              <div style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'Outfit', marginBottom: '0.5rem' }}>
                {currentSymbol}{displayPrice}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/mo</span>
              </div>
              {isAnnual && plan.name !== 'Free' && (
                <div style={{ fontSize: '0.85rem', color: '#34d399', marginBottom: '1.5rem', fontWeight: 600 }}>Billed Annually</div>
              )}
              {(!isAnnual || plan.name === 'Free') && <div style={{ marginBottom: '1.5rem' }} />}
              
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', marginBottom: '2.5rem', flex: 1 }}>
                {plan.features.map(feat => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                    <Check size={16} color={plan.color} /> {feat}
                  </li>
                ))}
              </ul>
              
              <button 
                className={plan.isPopular ? 'btn-primary' : 'btn-secondary'} 
                style={{ width: '100%', marginTop: 'auto' }}
                onClick={() => handleCheckout(plan.name.toLowerCase())}
                disabled={loadingPrice !== null || isCurrentPlan}
              >
                {loadingPrice === plan.name.toLowerCase() ? (
                  <><Loader2 size={16} className="animate-spin" /> Preparing...</>
                ) : isCurrentPlan ? (
                  <><Crown size={16} /> Current Plan</>
                ) : (
                  plan.name !== 'Free' ? 'Subscribe Now' : 'Get Started Free'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Pay-as-you-go Token Top-up */}
      <div style={{ marginTop: '4rem', maxWidth: '800px', margin: '4rem auto 0' }} className="animate-slide-up">
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>Need More Chat Tokens?</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Recharge your Team Manager tokens on the fly without changing your base plan.</p>
        
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2rem', border: '1px solid rgba(168,85,247,0.3)', background: 'linear-gradient(135deg, rgba(168,85,247,0.05) 0%, rgba(99,102,241,0.05) 100%)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(168,85,247,0.2)', padding: '1rem', borderRadius: '50%' }}>
                <Coins size={32} color="#a855f7" />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>+250,000 Tokens</h3>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Valid for all LangGraph models (Claude, ChatGPT, etc).</div>
              </div>
           </div>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
             <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'Outfit' }}>{currentSymbol}{currency === 'INR' ? '1,200' : '19'}<span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text-muted)' }}> one-time</span></div>
             <button 
               className="btn-primary" 
               style={{ background: 'linear-gradient(to right, #a855f7, #6366f1)', border: 'none' }}
               onClick={() => handleCheckout('topup')}
               disabled={loadingPrice === 'topup'}
             >
                {loadingPrice === 'topup' ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : 'Buy Tokens'}
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
