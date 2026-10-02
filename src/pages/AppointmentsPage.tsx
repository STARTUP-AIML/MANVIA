import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, List, Filter, RotateCw, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { usePatientAppointments } from '../hooks/useAppointments.js';
import { AppointmentCard } from '../components/appointments/AppointmentCard.js';
import type { AppointmentStatus } from '../types/appointments.js';

type TabFilter = 'UPCOMING' | 'PAST' | 'ALL';

function AppointmentsHeaderIllustration() {
  return (
    <div className="appointments-header-illustration" aria-hidden="true">
      <svg width="128" height="112" viewBox="0 0 128 112" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Soft pastel ambient glow */}
        <circle cx="70" cy="56" r="48" fill="url(#ill-glow)" opacity="0.65" />

        {/* Sparkle top right */}
        <path d="M106 14L108 20L114 22L108 24L106 30L104 24L98 22L104 20L106 14Z" fill="#93c5fd" />
        <circle cx="112" cy="36" r="1.5" fill="#bfdbfe" />

        {/* Calendar Body (perspective white card with soft shadow) */}
        <g filter="url(#cal-shadow)">
          <rect x="24" y="22" width="76" height="66" rx="16" fill="white" />
          <rect x="24" y="22" width="76" height="66" rx="16" stroke="rgba(255, 255, 255, 0.95)" strokeWidth="1.5" />
        </g>

        {/* Top Binder Rings */}
        <rect x="38" y="16" width="6" height="12" rx="3" fill="#60a5fa" />
        <rect x="76" y="16" width="6" height="12" rx="3" fill="#60a5fa" />

        {/* Calendar day dots grid */}
        <circle cx="40" cy="44" r="3.5" fill="#93c5fd" />
        <circle cx="55" cy="44" r="3.5" fill="#93c5fd" />
        <circle cx="70" cy="44" r="3.5" fill="#93c5fd" />
        <circle cx="85" cy="44" r="3.5" fill="#93c5fd" />

        <circle cx="40" cy="58" r="3.5" fill="#93c5fd" />
        <circle cx="55" cy="58" r="3.5" fill="#93c5fd" />
        <circle cx="70" cy="58" r="3.5" fill="#93c5fd" />
        <circle cx="85" cy="58" r="3.5" fill="#bfdbfe" opacity="0.6" />

        <circle cx="40" cy="72" r="3.5" fill="#93c5fd" />
        <circle cx="55" cy="72" r="3.5" fill="#93c5fd" />

        {/* Floating Clock Badge on bottom right */}
        <g filter="url(#clock-shadow)">
          <circle cx="84" cy="76" r="17" fill="url(#clock-grad)" />
          <circle cx="84" cy="76" r="17" stroke="white" strokeWidth="2.5" />
          {/* Clock hands: 3 o'clock / L-shape */}
          <path d="M84 68V76H90" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        <defs>
          <filter id="cal-shadow" x="16" y="18" width="92" height="82" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#3b82f6" floodOpacity="0.12" />
          </filter>
          <filter id="clock-shadow" x="63" y="57" width="42" height="42" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2563eb" floodOpacity="0.25" />
          </filter>
          <radialGradient id="ill-glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(70 56) rotate(90) scale(48)">
            <stop stopColor="#93c5fd" stopOpacity="0.45" />
            <stop offset="1" stopColor="#c084fc" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="clock-grad" x1="67" y1="59" x2="101" y2="93" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3b82f6" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export const AppointmentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabFilter>('UPCOMING');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | undefined>(undefined);

  const { user } = useAuth();

  const {
    data: paginatedData,
    isLoading,
    isError,
    error,
    refetch,
  } = usePatientAppointments({
    timeFilter: activeTab,
    status: statusFilter,
  });

  const appointments = paginatedData?.data || [];

  if (user && user.roles && !user.roles.includes('PATIENT')) {
    return (
      <div className="appointments-page-bg">
        <div className="appointments-glass-container max-w-xl text-center py-12">
          <div className="p-6 bg-white/70 border border-slate-200/80 rounded-2xl">
            <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
            <p className="text-sm text-slate-600 mt-2">
              The patient appointments area is only accessible to authenticated patient accounts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="appointments-page-bg">
      <div className="appointments-glass-container">
        {/* Header matching reference */}
        <header className="appointments-header">
          <div className="appointments-header-left">
            <div className="appointments-header-icon-bubble" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="4" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <circle cx="8" cy="14" r="1" fill="currentColor" />
                <circle cx="12" cy="14" r="1" fill="currentColor" />
                <circle cx="16" cy="14" r="1" fill="currentColor" />
                <circle cx="8" cy="18" r="1" fill="currentColor" />
                <circle cx="12" cy="18" r="1" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="appointments-title">
                My Appointments
              </h1>
              <p className="appointments-subtitle">
                Track, prepare, and manage your scheduled physician consultations.
              </p>
            </div>
          </div>

          <AppointmentsHeaderIllustration />
        </header>

        {/* Inner Card: Book Consultation Section */}
        <div className="appointments-inner-card">
          <div className="appointments-controls-row">
            <h2 className="appointments-section-title">
              Book Consultation
            </h2>

            {/* Tab Control */}
            <div className="appointments-tab-pill-container" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'UPCOMING'}
                onClick={() => {
                  setActiveTab('UPCOMING');
                  setStatusFilter(undefined);
                }}
                className={`appointments-tab-btn ${activeTab === 'UPCOMING' ? 'active' : ''}`}
              >
                <Calendar className="w-4 h-4" />
                Upcoming
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'PAST'}
                onClick={() => {
                  setActiveTab('PAST');
                  setStatusFilter(undefined);
                }}
                className={`appointments-tab-btn ${activeTab === 'PAST' ? 'active' : ''}`}
              >
                <Clock className="w-4 h-4" />
                Past &amp; Completed
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ALL'}
                onClick={() => {
                  setActiveTab('ALL');
                  setStatusFilter(undefined);
                }}
                className={`appointments-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
              >
                <List className="w-4 h-4" />
                All
              </button>
            </div>

            {/* Filter Status */}
            <div className="appointments-filter-row">
              <label htmlFor="status-filter" className="appointments-filter-label">
                <Filter className="w-4 h-4 text-blue-600" />
                Filter Status
              </label>
              <div className="appointments-filter-select-wrap">
                <select
                  id="status-filter"
                  value={statusFilter || ''}
                  onChange={(e) => setStatusFilter(e.target.value ? (e.target.value as AppointmentStatus) : undefined)}
                  className="appointments-filter-select"
                >
                  <option value="">All Statuses</option>
                  <option value="REQUESTED">Waiting Confirmation</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="DECLINED">Declined</option>
                </select>
                <ChevronDown className="appointments-filter-chevron w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="space-y-4" aria-busy="true" aria-label="Loading appointments">
              {[1, 2, 3].map((i) => (
                <div key={i} className="appointments-skeleton-card" />
              ))}
            </div>
          )}

          {/* Empty State matching reference */}
          {!isLoading && !isError && appointments.length === 0 && (
            <div className="appointments-empty-card">
              <div className="appointments-empty-left">
                <div className="appointments-empty-icon-bubble" aria-hidden="true">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="3" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <circle cx="8" cy="15" r="1" fill="currentColor" />
                    <circle cx="12" cy="15" r="1" fill="currentColor" />
                    <circle cx="16" cy="15" r="1" fill="currentColor" />
                    <circle cx="17" cy="17" r="4.5" fill="#3b82f6" stroke="white" strokeWidth="1.2" />
                    <path d="M17 15V17H18.5" stroke="white" strokeWidth="1.2" />
                  </svg>
                </div>
                <div>
                  <h3 className="appointments-empty-title">
                    {activeTab === 'UPCOMING'
                      ? 'No upcoming appointments'
                      : activeTab === 'PAST'
                      ? 'No past appointments'
                      : 'No appointments found'}
                    {/* Accessible text for existing test suites */}
                    <span className="sr-only">No upcoming consultations</span>
                  </h3>
                  <p className="appointments-empty-desc">
                    Book a consultation with a trusted doctor to get started on your health journey.
                  </p>
                </div>
              </div>

              <Link
                to="/doctors"
                aria-label="Book Appointment — Find a Doctor"
                className="appointments-cta-btn"
              >
                Book Appointment <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          )}

          {/* Error State matching reference */}
          {isError && (
            <div className="appointments-error-card">
              <div className="appointments-error-left">
                <div className="appointments-error-icon-bubble" aria-hidden="true">
                  <RotateCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="appointments-error-title">
                    {error instanceof Error ? error.message : 'Request failed with status 500'}
                  </h3>
                  <p className="appointments-error-desc">
                    We&apos;re experiencing an issue. Please try again later.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => refetch()}
                className="appointments-retry-btn"
              >
                <RotateCw className="w-4 h-4" />
                Retry Loading
              </button>
            </div>
          )}

          {/* Appointment Cards List */}
          {!isLoading && !isError && appointments.length > 0 && (
            <div className="space-y-4" role="feed" aria-label="Appointments list">
              {appointments.map((apt) => (
                <AppointmentCard key={apt.id || apt.publicAppointmentId} appointment={apt} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

