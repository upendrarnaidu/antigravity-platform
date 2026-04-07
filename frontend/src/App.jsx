import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CampaignWizard from './components/CampaignWizard';
import CampaignViewer from './components/CampaignViewer';
import CampaignFlow from './components/CampaignFlow';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import ContentCalendar from './components/ContentCalendar';
import BrandVoice from './components/BrandVoice';
import ContentRepurposer from './components/ContentRepurposer';
import VideoCreator from './components/VideoCreator';
import Chat from './components/Chat';
import Pricing from './components/Pricing';
import Integrations from './components/Integrations';
import { Loader2 } from 'lucide-react';

import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';
import ContactUs from './pages/ContactUs';
import Footer from './components/Footer';

const PublicLayout = ({ children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0a14' }}>
    <div style={{ flex: 1 }}>{children}</div>
    <Footer />
  </div>
);

const LoadingScreen = () => (
  <div style={{
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#0a0a14', flexDirection: 'column', gap: '1rem',
  }}>
    <Loader2 size={32} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
    <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Loading...</span>
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />;
};

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/terms" element={<PublicLayout><TermsOfService /></PublicLayout>} />
      <Route path="/privacy" element={<PublicLayout><PrivacyPolicy /></PublicLayout>} />
      <Route path="/refund" element={<PublicLayout><RefundPolicy /></PublicLayout>} />
      <Route path="/contact" element={<PublicLayout><ContactUs /></PublicLayout>} />
      
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/dashboard" element={<Navigate to="/" replace />} />
      <Route path="/campaigns" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/campaigns/new" element={<ProtectedRoute><CampaignWizard /></ProtectedRoute>} />
      <Route path="/campaign/:id" element={<ProtectedRoute><CampaignViewer /></ProtectedRoute>} />
      <Route path="/campaign/:id/flow" element={<CampaignFlow />} />
      <Route path="/calendar" element={<ProtectedRoute><ContentCalendar /></ProtectedRoute>} />
      <Route path="/repurpose" element={<ProtectedRoute><ContentRepurposer /></ProtectedRoute>} />
      <Route path="/video" element={<ProtectedRoute><VideoCreator /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/brand-voice" element={<ProtectedRoute><BrandVoice /></ProtectedRoute>} />
      <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
      <Route path="/integrations" element={<ProtectedRoute><Integrations /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
