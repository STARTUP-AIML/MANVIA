import React, { useState } from 'react';
import type { Specialty, Language } from '@/types/doctors';

export interface DoctorFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedSpecialty: string;
  onSpecialtyChange: (specialty: string) => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
  selectedCity?: string;
  onCityChange?: (city: string) => void;
  selectedMode?: string;
  onModeChange?: (mode: string) => void;
  selectedExperience?: string;
  onExperienceChange?: (experience: string) => void;
  selectedSort?: string;
  onSortChange?: (sort: string) => void;
  specialties: Specialty[];
  languages: Language[];
  availableCities?: string[];
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
  selectedCity = '',
  onCityChange = () => {},
  selectedMode = '',
  onModeChange = () => {},
  selectedExperience = '',
  onExperienceChange = () => {},
  selectedSort = 'default',
  onSortChange = () => {},
  specialties,
  languages,
  availableCities = ['Bengaluru', 'Mumbai', 'New Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Kochi', 'Nagpur'],
  onClearFilters,
  isFiltered,
  totalResults,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      {/* Primary Search & Core Filters Row */}
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
              placeholder="e.g. Dr. Rao, Bengaluru, Anxiety..."
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

        {/* Sorting Dropdown */}
        <div>
          <label
            htmlFor="doctor-sort"
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
            Sort By
          </label>
          <select
            id="doctor-sort"
            value={selectedSort}
            onChange={(e) => onSortChange(e.target.value)}
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
            <option value="default">Default (Relevance)</option>
            <option value="fee-asc">Fee: Low to High</option>
            <option value="fee-desc">Fee: High to Low</option>
            <option value="exp-desc">Experience: High to Low</option>
            <option value="name-asc">Doctor Name (A to Z)</option>
          </select>
        </div>
      </div>

      {/* Advanced Filter Toggles (City, Mode, Experience) */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '14px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            style={{
              background: 'none',
              border: 'none',
              color: '#096ed3',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>{showAdvanced ? '▲ Less Filters' : '▼ More Filters (Location, Mode, Experience)'}</span>
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
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
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Advanced Filters Drawer */}
      {showAdvanced && (
        <div
          style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px dashed #e2e8f0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Location / City Filter */}
          <div>
            <label
              htmlFor="doctor-city"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '6px',
              }}
            >
              Location / City
            </label>
            <select
              id="doctor-city"
              value={selectedCity}
              onChange={(e) => onCityChange(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
              }}
            >
              <option value="">All Locations</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          {/* Consultation Mode Filter */}
          <div>
            <label
              htmlFor="doctor-mode"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '6px',
              }}
            >
              Consultation Mode
            </label>
            <select
              id="doctor-mode"
              value={selectedMode}
              onChange={(e) => onModeChange(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
              }}
            >
              <option value="">All Modes</option>
              <option value="VIDEO">Video Consultation</option>
              <option value="IN_PERSON">In-Person Clinic Visit</option>
              <option value="AUDIO">Audio Call</option>
            </select>
          </div>

          {/* Experience Filter */}
          <div>
            <label
              htmlFor="doctor-exp"
              style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#475569',
                marginBottom: '6px',
              }}
            >
              Minimum Experience
            </label>
            <select
              id="doctor-exp"
              value={selectedExperience}
              onChange={(e) => onExperienceChange(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#f8fafc',
                color: '#1e293b',
              }}
            >
              <option value="">Any Experience</option>
              <option value="10">10+ Years</option>
              <option value="15">15+ Years</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
