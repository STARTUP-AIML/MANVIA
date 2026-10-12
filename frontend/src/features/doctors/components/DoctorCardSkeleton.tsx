import React from 'react';

export const DoctorCardSkeleton: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div>
        {/* Top Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '90px',
              height: '20px',
              backgroundColor: '#e2e8f0',
              borderRadius: '6px',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
          <div
            style={{
              width: '80px',
              height: '20px',
              backgroundColor: '#e2e8f0',
              borderRadius: '12px',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
        </div>

        {/* Avatar & Name Row */}
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#e2e8f0',
              flexShrink: 0,
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: '75%',
                height: '18px',
                backgroundColor: '#e2e8f0',
                borderRadius: '4px',
                marginBottom: '6px',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
            <div
              style={{
                width: '45%',
                height: '12px',
                backgroundColor: '#e2e8f0',
                borderRadius: '4px',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
          </div>
        </div>

        {/* Clinic & Location */}
        <div
          style={{
            width: '60%',
            height: '14px',
            backgroundColor: '#e2e8f0',
            borderRadius: '4px',
            marginBottom: '12px',
            animation: 'pulse 1.5s infinite ease-in-out',
          }}
        />

        {/* Bio lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
          <div
            style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
          <div
            style={{
              width: '90%',
              height: '12px',
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
        </div>

        {/* Metadata Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            padding: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '10px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              height: '24px',
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
          <div
            style={{
              height: '24px',
              backgroundColor: '#e2e8f0',
              borderRadius: '4px',
              animation: 'pulse 1.5s infinite ease-in-out',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1px solid #f1f5f9',
          paddingTop: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            width: '80px',
            height: '28px',
            backgroundColor: '#e2e8f0',
            borderRadius: '4px',
            animation: 'pulse 1.5s infinite ease-in-out',
          }}
        />
        <div
          style={{
            width: '110px',
            height: '36px',
            backgroundColor: '#e2e8f0',
            borderRadius: '10px',
            animation: 'pulse 1.5s infinite ease-in-out',
          }}
        />
      </div>
    </div>
  );
};
