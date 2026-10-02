import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage.js';
import { LoginPage } from './pages/LoginPage.js';
import { WellnessPage } from './pages/WellnessPage.js';
import { HealthTimelinePage } from './pages/HealthTimelinePage.js';
import { AccountPage } from './pages/AccountPage.js';
import { AICompanionPage } from './pages/AICompanionPage.js';
import { DoctorDiscoveryPage } from './pages/DoctorDiscoveryPage.js';
import { DoctorProfilePage } from './pages/DoctorProfilePage.js';
import { DoctorBookingPage } from './pages/DoctorBookingPage.js';
import { AppointmentsPage } from './pages/AppointmentsPage.js';
import { AppointmentDetailPage } from './pages/AppointmentDetailPage.js';
import { PreConsultationPage } from './pages/PreConsultationPage.js';
import { HealthRecordsPage } from './pages/HealthRecordsPage.js';
import { HealthRecordDetailPage } from './pages/HealthRecordDetailPage.js';
import { PatientLayout } from './components/layout/PatientLayout.js';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/get-started" element={<LoginPage />} />
      <Route path="/wellness" element={<WellnessPage />} />
      <Route path="/health-timeline" element={<HealthTimelinePage />} />
      <Route
        path="/doctors"
        element={
          <PatientLayout activeTab="doctors">
            <DoctorDiscoveryPage />
          </PatientLayout>
        }
      />
      <Route path="/care/doctors" element={<Navigate to="/doctors" replace />} />
      <Route
        path="/doctors/:doctorId"
        element={
          <PatientLayout activeTab="doctors">
            <DoctorProfilePage />
          </PatientLayout>
        }
      />
      <Route
        path="/care/doctors/:doctorId"
        element={
          <PatientLayout activeTab="doctors">
            <DoctorProfilePage />
          </PatientLayout>
        }
      />
      <Route
        path="/doctors/:doctorId/book"
        element={
          <PatientLayout activeTab="doctors">
            <DoctorBookingPage />
          </PatientLayout>
        }
      />
      <Route
        path="/care/doctors/:doctorId/book"
        element={
          <PatientLayout activeTab="doctors">
            <DoctorBookingPage />
          </PatientLayout>
        }
      />
      <Route
        path="/appointments"
        element={
          <PatientLayout activeTab="appointments">
            <AppointmentsPage />
          </PatientLayout>
        }
      />
      <Route
        path="/care/appointments"
        element={<Navigate to="/appointments" replace />}
      />
      <Route
        path="/appointments/:appointmentId"
        element={
          <PatientLayout activeTab="appointments">
            <AppointmentDetailPage />
          </PatientLayout>
        }
      />
      <Route
        path="/appointments/:appointmentId/pre-consultation"
        element={
          <PatientLayout activeTab="appointments">
            <PreConsultationPage />
          </PatientLayout>
        }
      />
      <Route
        path="/health-records"
        element={
          <PatientLayout activeTab="records">
            <HealthRecordsPage />
          </PatientLayout>
        }
      />
      <Route
        path="/care/health-records"
        element={<Navigate to="/health-records" replace />}
      />
      <Route
        path="/health-records/:recordId"
        element={
          <PatientLayout activeTab="records">
            <HealthRecordDetailPage />
          </PatientLayout>
        }
      />
      <Route
        path="/consents"
        element={<Navigate to="/health-records?tab=consents" replace />}
      />
      <Route path="/account" element={<AccountPage />} />
      <Route path="/ai-companion" element={<AICompanionPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

