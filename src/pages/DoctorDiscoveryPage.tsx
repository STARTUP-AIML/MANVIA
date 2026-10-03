import React, { useState, useMemo } from 'react';
import { useDoctors, useSpecialties, useLanguages } from '../hooks/useDoctors.js';
import { DoctorCard } from '../components/doctors/DoctorCard.js';
import { DoctorFilters } from '../components/doctors/DoctorFilters.js';
import { LoadingSpinner } from '../components/common/LoadingSpinner.js';
import { ErrorAlert } from '../components/common/ErrorAlert.js';
import { EmptyState } from '../components/common/EmptyState.js';

const PAGE_SIZE = 12;

export const DoctorDiscoveryPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [offset, setOffset] = useState(0);

  const { data: specialties = [], isLoading: isLoadingSpecialties } = useSpecialties();
  const { data: languages = [], isLoading: isLoadingLanguages } = useLanguages();

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

  const doctorsList = doctorsResponse?.data || [];
  const totalBackendCount = doctorsResponse?.total || 0;

  // Client-side text search enhancement over current paginated dataset
  const filteredDoctors = useMemo(() => {
    if (!searchQuery.trim()) return doctorsList;
    const q = searchQuery.toLowerCase().trim();
    return doctorsList.filter(
      (doc) =>
        doc.displayName.toLowerCase().includes(q) ||
        (doc.primarySpecialty && doc.primarySpecialty.toLowerCase().includes(q)) ||
        (doc.bio && doc.bio.toLowerCase().includes(q)) ||
        doc.publicDoctorId.toLowerCase().includes(q)
    );
  }, [doctorsList, searchQuery]);

  const isFiltered = Boolean(searchQuery || selectedSpecialty || selectedLanguage);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('');
    setSelectedLanguage('');
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

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Page Title & Scope Header */}
      <div style={{ marginBottom: '28px' }}>
        <div className="eyebrow" style={{ color: '#096ed3', marginBottom: '6px' }}>
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
        <p style={{ fontSize: '15px', color: '#64748b', margin: 0, maxWidth: '680px' }}>
          Explore board-certified physicians, review qualifications, specialties, and preview
          availability schedules across the MANVIA network.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <DoctorFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedSpecialty={selectedSpecialty}
        onSpecialtyChange={handleSpecialtyChange}
        selectedLanguage={selectedLanguage}
        onLanguageChange={handleLanguageChange}
        specialties={specialties}
        languages={languages}
        onClearFilters={handleClearFilters}
        isFiltered={isFiltered}
        totalResults={filteredDoctors.length}
      />

      {/* Main Content State Handling */}
      {isLoadingDoctors || isLoadingSpecialties || isLoadingLanguages ? (
        <LoadingSpinner message="Searching doctor directory..." />
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
      ) : filteredDoctors.length === 0 ? (
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
            {filteredDoctors.map((doc) => (
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
