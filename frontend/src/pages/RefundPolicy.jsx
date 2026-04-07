import React from 'react';

export default function RefundPolicy() {
  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', color: 'var(--text-primary)' }}>
      <h1 style={{ marginBottom: '1.5rem', color: '#fff' }}>Refund Policy</h1>
      <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="content-section" style={{ lineHeight: '1.6' }}>
        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>1. Credit Purchases</h2>
        <p>All credit purchases made on Antigravity are final and non-refundable, except as required by applicable law.</p>

        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>2. Technical Issues</h2>
        <p>If you experience a technical issue resulting in credits being deducted without the delivery of the requested generated media or campaign, please contact support within 7 days. We will investigate and, at our discretion, reimburse the lost credits to your account.</p>

        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>3. Subscription Upgrades</h2>
        <p>If you choose to cancel a subscription, your cancellation will take effect at the end of the current paid term. We do not provide prorated refunds for mid-term cancellations.</p>
        
        <h2 style={{ marginTop: '2rem', marginBottom: '1rem', color: '#e2e8f0' }}>4. Contact Us</h2>
        <p>For any refund-related inquiries, please reach out to us at support@vipunkrut.com.</p>
      </div>
    </div>
  );
}
