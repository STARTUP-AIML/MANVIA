import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDoctors, useSpecialties, useLanguages } from '@/hooks/useDoctors';
import { DoctorCard } from '@/features/doctors/components/DoctorCard';
import { DoctorCardSkeleton } from '@/features/doctors/components/DoctorCardSkeleton';
import { DoctorFilters } from '@/features/doctors/components/DoctorFilters';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { EmptyState } from '@/components/common/EmptyState';

const PAGE_SIZE = 12;

export const DoctorDiscoveryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial state from URL query parameters
  const initialQuery = searchParams.get('q') || searchParams.get('search') || '';
  const initialSpecialty = searchParams.get('specialty') || '';
  const initialLanguage = searchParams.get('language') || '';
  const initialCity = searchParams.get('city') || '';
  const initialMode = searchParams.get('mode') || '';
  const initialExperience = searchParams.get('exp') || '';
  const initialSort = searchParams.get('sort') || 'default';
  const initialOffset = parseInt(searchParams.get('offset') || '0', 10) || 0;

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedSpecialty, setSelectedSpecialty] = useState(initialSpecialty);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [selectedCity, setSelectedCity] = useState(initialCity);
  const [selectedMode, setSelectedMode] = useState(initialMode);
  const [selectedExperience, setSelectedExperience] = useState(initialExperience);
  const [selectedSort, setSelectedSort] = useState(initialSort);
  const [offset, setOffset] = useState(initialOffset);

  // Sync state to URL search params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedSpecialty) params.set('specialty', selectedSpecialty);
    if (selectedLanguage) params.set('language', selectedLanguage);
    if (selectedCity) params.set('city', selectedCity);
    if (selectedMode) params.set('mode', selectedMode);
    if (selectedExperience) params.set('exp', selectedExperience);
    if (selectedSort !== 'default') params.set('sort', selectedSort);
    if (offset > 0) params.set('offset', String(offset));

    setSearchParams(params, { replace: true });
  }, [
    searchQuery,
    selectedSpecialty,
    selectedLanguage,
    selectedCity,
    selectedMode,
    selectedExperience,
    selectedSort,
    offset,
    setSearchParams,
  ]);

  const { data: specialties = [], isLoading: isLoadingSpecialties } = useSpecialties();
  const { data: languages = [], isLoading: isLoadingLanguages } = useLanguages();

  // Query backend with specialty, language, and pagination
  const {
    data: doctorsResponse,
    isLoading: isLoadingDoctors,
    isError,
    error,
    refetch,
  } = useDoctors({
    specialty: selectedSpecialty || undefined,
    language: selectedLanguage || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  const rawDoctorsList = doctorsResponse?.data || [];
  const totalBackendCount = doctorsResponse?.total || 0;

  // Dynamically extract unique cities available in the platform
  const availableCities = useMemo(() => {
    const defaultCities = ['Bengaluru', 'Mumbai', 'New Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kochi', 'Nagpur'];
    const extracted = rawDoctorsList
      .map((d) => d.city)
      .filter((c): c is string => Boolean(c && c.trim().length > 0));
    const combined = Array.from(new Set([...defaultCities, ...extracted]));
    return combined.sort();
  }, [rawDoctorsList]);

  // Client-side text refinement and multi-criteria filters
  const filteredAndSortedDoctors = useMemo(() => {
    let list = [...rawDoctorsList];

    // Client-side text filter safeguard if backend search returned broader matches
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (doc) =>
          doc.displayName.toLowerCase().includes(q) ||
          (doc.primarySpecialty && doc.primarySpecialty.toLowerCase().includes(q)) ||
          (doc.bio && doc.bio.toLowerCase().includes(q)) ||
          (doc.clinicName && doc.clinicName.toLowerCase().includes(q)) ||
          (doc.city && doc.city.toLowerCase().includes(q)) ||
          (doc.state && doc.state.toLowerCase().includes(q)) ||
          doc.publicDoctorId.toLowerCase().includes(q)
      );
    }

    // Filter by City
    if (selectedCity) {
      list = list.filter((doc) => doc.city?.toLowerCase() === selectedCity.toLowerCase());
    }

    // Filter by Consultation Mode
    if (selectedMode) {
      list = list.filter((doc) =>
        (doc.consultationModes || ['VIDEO', 'IN_PERSON']).includes(selectedMode)
      );
    }

    // Filter by Experience
    if (selectedExperience) {
      const minYears = parseInt(selectedExperience, 10);
      if (!isNaN(minYears)) {
        list = list.filter((doc) => doc.yearsOfExperience >= minYears);
      }
    }

    // Deterministic Sorting
    list.sort((a, b) => {
      if (selectedSort === 'fee-asc') {
        const diff = a.defaultConsultationFee - b.defaultConsultationFee;
        return diff !== 0 ? diff : a.publicDoctorId.localeCompare(b.publicDoctorId);
      }
      if (selectedSort === 'fee-desc') {
        const diff = b.defaultConsultationFee - a.defaultConsultationFee;
        return diff !== 0 ? diff : a.publicDoctorId.localeCompare(b.publicDoctorId);
      }
      if (selectedSort === 'exp-desc') {
        const diff = b.yearsOfExperience - a.yearsOfExperience;
        return diff !== 0 ? diff : a.publicDoctorId.localeCompare(b.publicDoctorId);
      }
      if (selectedSort === 'name-asc') {
        return a.displayName.localeCompare(b.displayName);
      }
      // Default: publicDoctorId stable order
      return a.publicDoctorId.localeCompare(b.publicDoctorId);
    });

    return list;
  }, [
    rawDoctorsList,
    searchQuery,
    selectedCity,
    selectedMode,
    selectedExperience,
    selectedSort,
  ]);

  const isFiltered = Boolean(
    searchQuery ||
    selectedSpecialty ||
    selectedLanguage ||
    selectedCity ||
    selectedMode ||
    selectedExperience ||
    selectedSort !== 'default'
  );

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setOffset(0);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('');
    setSelectedLanguage('');
    setSelectedCity('');
    setSelectedMode('');
    setSelectedExperience('');
    setSelectedSort('default');
    setOffset(0);
  };

  const handleSpecialtyChange = (spec: string) => {
    setSelectedSpecialty(spec);
    setOffset(0);
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setOffset(0);
  };

  const handleCityChange = (city: string) => {
    setSelectedCity(city);
    setOffset(0);
  };

  const handleModeChange = (mode: string) => {
    setSelectedMode(mode);
    setOffset(0);
  };

  const handleExperienceChange = (exp: string) => {
    setSelectedExperience(exp);
    setOffset(0);
  };

  const handleSortChange = (sort: string) => {
    setSelectedSort(sort);
  };

  const handleNextPage = () => {
    if (offset + PAGE_SIZE < totalBackendCount) {
      setOffset((prev) => prev + PAGE_SIZE);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (offset > 0) {
      setOffset((prev) => Math.max(0, prev - PAGE_SIZE));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(totalBackendCount / PAGE_SIZE) || 1;

  const isLoading = isLoadingDoctors || isLoadingSpecialties || isLoadingLanguages;

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Page Title & Scope Header */}
      <div style={{ marginBottom: '24px' }}>
        <div className="eyebrow" style={{ color: '#096ed3', marginBottom: '6px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          Find Trusted Care
        </div>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#0f172a',
            margin: '0 0 8px 0',
            letterSpacing: '-0.5px',
          }}
        >
          Doctor Discovery
        </h1>
        <p style={{ fontSize: '15px', color: '#64748b', margin: 0, maxWidth: '680px', lineHeight: 1.5 }}>
          Explore board-certified physicians, review qualifications, specialties, and preview
          availability schedules across the MANVIA network.
        </p>
      </div>

      {/* Healthcare Integrity / Fictional Demo Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: '#eff6ff',
          borderRadius: '12px',
          border: '1px solid #bfdbfe',
          color: '#1e40af',
          fontSize: '13px',
          marginBottom: '24px',
        }}
        role="note"
        aria-label="Clinical Demonstration Notice"
      >
        <span style={{ fontSize: '18px' }}>ℹ️</span>
        <div style={{ lineHeight: 1.4 }}>
          <strong>Platform Demonstration Mode:</strong> All doctor profiles displayed below are fictional Indian demo clinicians provided to validate discovery, scheduling, and pre-consultation flows.
        </div>
      </div>

      {/* Filter & Search Bar */}
      <DoctorFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedSpecialty={selectedSpecialty}
        onSpecialtyChange={handleSpecialtyChange}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        selectedCity={selectedCity}
        onCityChange={handleCityChange}
        selectedMode={selectedMode}
        onModeChange={handleModeChange}
        selectedExperience={selectedExperience}
        onExperienceChange={handleExperienceChange}
        selectedSort={selectedSort}
        onSortChange={handleSortChange}
        specialties={specialties}
        languages={languages}
        availableCities={availableCities}
        onClearFilters={handleClearFilters}
        isFiltered={isFiltered}
        totalResults={filteredAndSortedDoctors.length}
      />

      {/* Main Content State Handling */}
      {isLoading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
            marginBottom: '32px',
          }}
          aria-busy="true"
          aria-label="Loading doctors"
        >
          {Array.from({ length: 6 }).map((_, idx) => (
            <DoctorCardSkeleton key={idx} />
          ))}
        </div>
      ) : isError ? (
        <ErrorAlert
          title="Unable to load doctors"
          message={
            error instanceof Error
              ? error.message
              : 'Failed to retrieve physician directory from server.'
          }
          onRetry={() => refetch()}
        />
      ) : filteredAndSortedDoctors.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'No matching physicians found' : 'No doctors currently registered'}
          description={
            isFiltered
              ? 'Try adjusting or resetting your search filters to view more doctor profiles.'
              : 'Check back soon as new verified physicians are added to the directory.'
          }
          actionLabel={isFiltered ? 'Reset Filters' : undefined}
          onAction={isFiltered ? handleClearFilters : undefined}
        />
      ) : (
        <>
          {/* Doctor Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
              marginBottom: '32px',
            }}
          >
            {filteredAndSortedDoctors.map((doc) => (
              <DoctorCard key={doc.publicDoctorId} doctor={doc} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                marginTop: '32px',
              }}
            >
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={offset === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: offset === 0 ? '#f1f5f9' : '#ffffff',
                  color: offset === 0 ? '#94a3b8' : '#0f172a',
                  cursor: offset === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                &larr; Previous
              </button>

              <span style={{ fontSize: '13px', color: '#64748b' }}>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={offset + PAGE_SIZE >= totalBackendCount}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor:
                    offset + PAGE_SIZE >= totalBackendCount ? '#f1f5f9' : '#ffffff',
                  color: offset + PAGE_SIZE >= totalBackendCount ? '#94a3b8' : '#0f172a',
                  cursor: offset + PAGE_SIZE >= totalBackendCount ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
