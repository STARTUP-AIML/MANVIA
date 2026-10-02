import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { WellnessPage } from './pages/WellnessPage.js';
import { HealthTimelinePage } from './pages/HealthTimelinePage.js';
import { AccountPage } from './pages/AccountPage.js';
import { AICompanionPage } from './pages/AICompanionPage.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/get-started" element={<LoginPage />} />
      <Route path="/wellness" element={<WellnessPage />} />
      <Route path="/health-timeline" element={<HealthTimelinePage />} />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/ai-companion" element={<AICompanionPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
