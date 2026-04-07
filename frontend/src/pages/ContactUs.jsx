import React from 'react';

export default function ContactUs() {
  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 style={{ marginBottom: '1.5rem', color: '#fff' }}>Contact Us</h1>
      
      <div className="content-section" style={{ lineHeight: '1.6', background: 'rgba(255, 255, 255, 0.03)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
        <p style={{ marginBottom: '1.5rem' }}>We're here to help! If you have any questions, concerns, or feedback regarding Antigravity or your account, please reach out to us using the details below.</p>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#818cf8', marginBottom: '0.5rem' }}>Email Support</h3>
          <p>
            <a href="mailto:support@vipunkrut.com" style={{ color: '#fff', textDecoration: 'none', fontWeight: 'bold' }}>
              support@vipunkrut.com
            </a>
          </p>
        </div>

        <div>
          <h3 style={{ color: '#818cf8', marginBottom: '0.5rem' }}>Business Address</h3>
          <address style={{ fontStyle: 'normal', color: 'var(--text-muted)' }}>
            123 Tech Park<br />
            Bengaluru, Karnataka<br />
            India
          </address>
        </div>
      </div>
    </div>
  );
}
