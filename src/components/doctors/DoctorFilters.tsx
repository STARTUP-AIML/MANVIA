import React from 'react';
import type { Specialty, Language } from '../../types/doctors.js';

interface DoctorFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSpecialty: string;
  onSpecialtyChange: (specialty: string) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  specialties: Specialty[];
  languages: Language[];
  onClearFilters: () => void;
  isFiltered: boolean;
  totalResults: number;
}

export const DoctorFilters: React.FC<DoctorFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedSpecialty,
  onSpecialtyChange,
  selectedLanguage,
  onLanguageChange,
  specialties,
  languages,
  onClearFilters,
  isFiltered,
  totalResults,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          alignItems: 'flex-end',
        }}
      >
        {/* Search Input */}
        <div>
          <label
            htmlFor="doctor-search"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#475569',
              marginBottom: '6px',
            }}
          >
            Search Doctor Name
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="doctor-search"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="e.g. Dr. Mitchell, cardiologist..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Clear search text"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Specialty Filter */}
        <div>
          <label
            htmlFor="doctor-specialty"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#475569',
              marginBottom: '6px',
            }}
          >
            Medical Specialty
          </label>
          <select
            id="doctor-specialty"
            value={selectedSpecialty}
            onChange={(e) => onSpecialtyChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">All Specialties</option>
            {specialties.map((spec) => (
              <option key={spec.id} value={spec.code}>
                {spec.name}
              </option>
            ))}
          </select>
        </div>

        {/* Language Filter */}
        <div>
          <label
            htmlFor="doctor-language"
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: '#475569',
              marginBottom: '6px',
            }}
          >
            Spoken Language
          </label>
          <select
            id="doctor-language"
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              fontSize: '14px',
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          >
            <option value="">All Languages</option>
            {languages.map((lang) => (
              <option key={lang.id} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions & Result Count */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            minHeight: '42px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            Showing <strong>{totalResults}</strong> {totalResults === 1 ? 'doctor' : 'doctors'}
          </div>

          {isFiltered && (
            <button
              type="button"
              onClick={onClearFilters}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
