import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 style={{ marginBottom: '1.5rem', color: '#fff' }}>Privacy Policy</h1>
      <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="content-section" style={{ lineHeight: '1.6' }}>
        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>1. Information We Collect</h2>
        <p>We collect information to provide better services to all our users. This includes basic account details (like your email address) and usage data.</p>

        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>2. How We Use Information</h2>
        <p>We use the information we collect from all of our services to provide, maintain, protect and improve them, to develop new ones, and to protect Antigravity and our users.</p>

        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>3. Information We Share</h2>
        <p>We do not share personal information with companies, organizations, and individuals outside of Antigravity unless one of the following circumstances applies: with your consent, for external processing, or for legal reasons.</p>
        
        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>4. AI Processing</h2>
        <p>Data provided within the platform may be processed by secondary AI providers (e.g., OpenAI, Anthropic, Google) solely for the purpose of generating your requested marketing assets. We do not use your private data to train our foundational models.</p>
      </div>
    </div>
  );
}
