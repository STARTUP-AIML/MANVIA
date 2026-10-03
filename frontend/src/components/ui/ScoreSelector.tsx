export interface ScoreOption {
  value: number;
  label: string;
  emoji?: string;
}

type ScoreType = 'mood' | 'stress' | 'energy' | 'sleepQuality';

const DEFAULT_OPTIONS: Record<ScoreType, ScoreOption[]> = {
  mood: [
    { value: 1, label: 'Very Low', emoji: '☁️' },
    { value: 2, label: 'Low', emoji: '🌥️' },
    { value: 3, label: 'Moderate', emoji: '⛅' },
    { value: 4, label: 'Good', emoji: '🌤️' },
    { value: 5, label: 'Excellent', emoji: '☀️' },
  ],
  stress: [
    { value: 1, label: 'Very Low', emoji: '🌿' },
    { value: 2, label: 'Low', emoji: '🍃' },
    { value: 3, label: 'Moderate', emoji: '🍂' },
    { value: 4, label: 'High', emoji: '⚡' },
    { value: 5, label: 'Very High', emoji: '🔥' },
  ],
  energy: [
    { value: 1, label: 'Very Low', emoji: '🪫' },
    { value: 2, label: 'Low', emoji: '🔋' },
    { value: 3, label: 'Moderate', emoji: '⚡' },
    { value: 4, label: 'High', emoji: '✨' },
    { value: 5, label: 'Very High', emoji: '🚀' },
  ],
  sleepQuality: [
    { value: 1, label: 'Very Poor', emoji: '🌑' },
    { value: 2, label: 'Poor', emoji: '🌘' },
    { value: 3, label: 'Fair', emoji: '🌗' },
    { value: 4, label: 'Good', emoji: '🌖' },
    { value: 5, label: 'Excellent', emoji: '🌕' },
  ],
};

export function ScoreSelector({
  name,
  label,
  value,
  onChange,
  type = 'mood',
  disabled = false,
  error,
}: {
  name: string;
  label: string;
  value: number;
  onChange: (val: number) => void;
  type?: 'mood' | 'stress' | 'energy' | 'sleepQuality';
  disabled?: boolean;
  error?: string;
}) {
  const options = DEFAULT_OPTIONS[type] ?? DEFAULT_OPTIONS.mood ?? [];

  return (
    <div style={{ marginBottom: '18px' }}>
      <label
        id={`${name}-label`}
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 700,
          color: '#073a78',
          marginBottom: '8px',
        }}
      >
        {label} <span style={{ color: '#096ed3' }}>({value}/5)</span>
      </label>
      <div
        role="radiogroup"
        aria-labelledby={`${name}-label`}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '8px',
        }}
      >
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 4px',
                borderRadius: '14px',
                border: isSelected ? '2px solid #0ba9e7' : '1px solid #dcecf6',
                background: isSelected ? '#f0f9ff' : '#fff',
                color: isSelected ? '#0369a1' : '#405b79',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 4px 12px rgba(11, 169, 231, 0.18)' : 'none',
              }}
            >
              <span style={{ fontSize: '18px', marginBottom: '4px' }}>{opt.emoji}</span>
              <span style={{ fontSize: '12px', fontWeight: 800 }}>{opt.value}</span>
              <span
                style={{
                  fontSize: '9px',
                  color: isSelected ? '#0284c7' : '#718ca8',
                  marginTop: '2px',
                  textAlign: 'center',
                  lineHeight: 1.1,
                }}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
      {error && (
        <span style={{ display: 'block', color: '#be123c', fontSize: '11px', marginTop: '4px' }}>
          {error}
        </span>
      )}
    </div>
  );
}
