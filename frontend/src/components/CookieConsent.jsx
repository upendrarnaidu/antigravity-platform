import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Show with a slight delay to enhance perception
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-banner-container animate-slide-up-fade">
      <div className="glass-panel cookie-banner">
        <div className="cookie-content">
          <div className="cookie-icon">
            <ShieldCheck size={24} color="#818cf8" />
          </div>
          <div className="cookie-text">
            <p>
              We use cookies to enhance your AI marketing experience, manage sessions, and analyze platform usage. 
              By continuing to use our platform, you agree to our <a href="/privacy" className="link-underlined">Privacy Policy</a>.
            </p>
          </div>
        </div>
        <div className="cookie-actions">
          <button onClick={handleAccept} className="btn-primary" style={{ padding: '0.5rem 2rem', fontSize: '0.9rem' }}>
            Accept & Continue
          </button>
          <button onClick={() => setIsVisible(false)} className="cookie-close-btn" title="Dismiss">
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
