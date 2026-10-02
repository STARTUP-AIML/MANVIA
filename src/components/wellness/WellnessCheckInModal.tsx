import { useState } from 'react';
import { useCreateWellnessCheckIn } from '../../hooks/useWellness.js';
import { ScoreSelector } from '../common/ScoreSelector.js';
import { ErrorAlert } from '../common/ErrorAlert.js';

export function WellnessCheckInModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [mood, setMood] = useState<number>(3);
  const [stress, setStress] = useState<number>(3);
  const [energy, setEnergy] = useState<number>(3);
  const [sleepQuality, setSleepQuality] = useState<number>(3);
  const [sleepHours, setSleepHours] = useState<string>('7.5');
  const [note, setNote] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const createMutation = useCreateWellnessCheckIn();

  if (!isOpen) return null;

  const validate = () => {
    const errs: Record<string, string> = {};
    if (mood < 1 || mood > 5) errs.mood = 'Mood must be an integer between 1 and 5';
    if (stress < 1 || stress > 5) errs.stress = 'Stress must be an integer between 1 and 5';
    if (energy < 1 || energy > 5) errs.energy = 'Energy must be an integer between 1 and 5';
    if (sleepQuality < 1 || sleepQuality > 5) errs.sleepQuality = 'Sleep quality must be an integer between 1 and 5';

    if (sleepHours) {
      const numHours = parseFloat(sleepHours);
      if (isNaN(numHours) || numHours < 0 || numHours > 24) {
        errs.sleepHours = 'Sleep hours must be between 0 and 24';
      }
    }

    if (note && note.length > 2000) {
      errs.note = 'Note cannot exceed 2000 characters';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const numHours = sleepHours ? parseFloat(sleepHours) : undefined;
      const sleepDurationMinutes = numHours !== undefined ? Math.round(numHours * 60) : undefined;

      await createMutation.mutateAsync({
        mood,
        stress,
        energy,
        sleepQuality,
        sleepHours: numHours,
        sleepDurationMinutes,
        note: note.trim() || undefined,
        recordedAt: new Date().toISOString(),
      });

      setSuccessMessage('Check-in recorded successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch {
      // Handled via createMutation.error
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(7, 24, 50, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 100,
        padding: '20px',
        overflowY: 'auto',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          padding: '28px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div className="eyebrow">DAILY ASSESSMENT</div>
            <h2 id="checkin-modal-title" style={{ fontSize: '22px', fontWeight: 800, margin: '4px 0 0', color: '#073a78' }}>
              Daily Wellness Check-in
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={createMutation.isPending}
            style={{
              border: 0,
              background: '#f1f5f9',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              fontSize: '16px',
              cursor: 'pointer',
              color: '#64748b',
            }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
          Record your subjective well-being across mood, stress, energy, and sleep. This is non-diagnostic and strictly patient-owned.
        </p>

        {successMessage && (
          <div
            role="status"
            style={{
              padding: '12px 16px',
              background: '#dcfce7',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            ✓ {successMessage}
          </div>
        )}

        {createMutation.isError && (
          <ErrorAlert
            title="Failed to record check-in"
            message={createMutation.error.message}
          />
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Mood 1-5 */}
          <ScoreSelector
            name="mood"
            label="Mood"
            type="mood"
            value={mood}
            onChange={setMood}
            disabled={createMutation.isPending}
            error={errors.mood}
          />

          {/* Stress 1-5 */}
          <ScoreSelector
            name="stress"
            label="Stress Level"
            type="stress"
            value={stress}
            onChange={setStress}
            disabled={createMutation.isPending}
            error={errors.stress}
          />

          {/* Energy 1-5 */}
          <ScoreSelector
            name="energy"
            label="Energy Level"
            type="energy"
            value={energy}
            onChange={setEnergy}
            disabled={createMutation.isPending}
            error={errors.energy}
          />

          {/* Sleep Quality 1-5 */}
          <ScoreSelector
            name="sleepQuality"
            label="Sleep Quality"
            type="sleepQuality"
            value={sleepQuality}
            onChange={setSleepQuality}
            disabled={createMutation.isPending}
            error={errors.sleepQuality}
          />

          {/* Sleep Hours (0 to 24) */}
          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="sleepHours"
              style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#073a78', marginBottom: '6px' }}
            >
              Sleep Duration (Hours)
            </label>
            <input
              id="sleepHours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={sleepHours}
              disabled={createMutation.isPending}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="e.g. 7.5"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: errors.sleepHours ? '1px solid #e11d48' : '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
              Recorded in hours (0.0 to 24.0).
            </span>
            {errors.sleepHours && (
              <span style={{ color: '#e11d48', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                {errors.sleepHours}
              </span>
            )}
          </div>

          {/* Reflection Note */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="note" style={{ fontSize: '13px', fontWeight: 700, color: '#073a78' }}>
                Reflection / Personal Note (Optional)
              </label>
              <span style={{ fontSize: '11px', color: note.length > 2000 ? '#e11d48' : '#94a3b8' }}>
                {note.length}/2000
              </span>
            </div>
            <textarea
              id="note"
              rows={3}
              value={note}
              disabled={createMutation.isPending}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How are you feeling today? Any specific factors affecting your sleep or energy?"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: errors.note ? '1px solid #e11d48' : '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
              }}
            />
            {errors.note && (
              <span style={{ color: '#e11d48', fontSize: '11px', marginTop: '2px', display: 'block' }}>
                {errors.note}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={createMutation.isPending}
              className="outline"
              style={{ padding: '10px 18px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="primary"
              style={{
                padding: '10px 22px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                opacity: createMutation.isPending ? 0.7 : 1,
                cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {createMutation.isPending ? 'Saving...' : 'Submit Check-in'}
              <span>→</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
