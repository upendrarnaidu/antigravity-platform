import React from 'react';

export default function TermsOfService() {
  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 style={{ marginBottom: '1.5rem', color: '#fff' }}>Terms of Service</h1>
      <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="content-section" style={{ lineHeight: '1.6' }}>
        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>1. Introduction</h2>
        <p>Welcome to Antigravity. By using our platform, you agree to these terms. Please read them carefully.</p>

        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>2. Use of Services</h2>
        <p>You must follow any policies made available to you within the Services. You may use our Services only as permitted by law.</p>

        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#ef4444' }}>3. Accuracy of AI-Generated Content & User Responsibility</h2>
        <p>
          Antigravity uses probabilistic generative AI to create marketing content, media, and suggestions. 
          We do not guarantee the factual accuracy, completeness, or reliability of any generated output (commonly known as "hallucinations").
        </p>
        <p>
          <strong>By using our services, you acknowledge and agree that:</strong>
        </p>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
          <li>You assume zero liability for the platform or vipunkrut.com regarding generated output.</li>
          <li>You are solely responsible for reviewing and verifying all generated content before publishing, distributing, or using it.</li>
          <li>Antigravity and vipunkrut.com shall not be held liable for any copyright, trademark, or intellectual property issues arising from the use of generated content.</li>
        </ul>

        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>4. Credits & Payments</h2>
        <p>Our services operate on a credit-based system. All purchases are final unless covered by our Refund Policy.</p>
        
        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>5. Termination</h2>
        <p>We may suspend or stop providing our Services to you if you do not comply with our terms or policies.</p>

      </div>
    </div>
  );
}
