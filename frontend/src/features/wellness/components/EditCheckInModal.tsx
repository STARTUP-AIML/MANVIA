import { useState } from 'react';
import type { WellnessCheckInResponse } from '@/types/wellness';
import { useUpdateWellnessCheckIn } from '@/hooks/useWellness';
import { ScoreSelector } from '@/components/ui/ScoreSelector';
import { ErrorAlert } from '@/components/common/ErrorAlert';

export function EditCheckInModal({
  checkIn,
  onClose,
}: {
  checkIn: WellnessCheckInResponse;
  onClose: () => void;
}) {
  const [mood, setMood] = useState<number>(checkIn.mood);
  const [stress, setStress] = useState<number>(checkIn.stress);
  const [energy, setEnergy] = useState<number>(checkIn.energy);
  const [sleepQuality, setSleepQuality] = useState<number>(checkIn.sleepQuality);
  const [sleepHours, setSleepHours] = useState<string>(
    checkIn.sleepDurationMinutes !== null && checkIn.sleepDurationMinutes !== undefined
      ? (checkIn.sleepDurationMinutes / 60).toFixed(1)
      : '',
  );
  const [note, setNote] = useState<string>(checkIn.note || '');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateMutation = useUpdateWellnessCheckIn();

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

    const numHours = sleepHours ? parseFloat(sleepHours) : undefined;
    const sleepDurationMinutes = numHours !== undefined ? Math.round(numHours * 60) : undefined;

    await updateMutation.mutateAsync({
      id: checkIn.id,
      data: {
        mood,
        stress,
        energy,
        sleepQuality,
        sleepHours: numHours,
        sleepDurationMinutes,
        note: note.trim() || undefined,
      },
    });

    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-checkin-title"
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
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div className="eyebrow">UPDATE RECORD</div>
            <h2 id="edit-checkin-title" style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 0', color: '#073a78' }}>
              Edit Wellness Check-in
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={updateMutation.isPending}
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

        {updateMutation.isError && (
          <ErrorAlert title="Update failed" message={updateMutation.error.message} />
        )}

        <form onSubmit={handleSubmit}>
          <ScoreSelector
            name="edit-mood"
            label="Mood"
            type="mood"
            value={mood}
            onChange={setMood}
            disabled={updateMutation.isPending}
            error={errors.mood}
          />
          <ScoreSelector
            name="edit-stress"
            label="Stress Level"
            type="stress"
            value={stress}
            onChange={setStress}
            disabled={updateMutation.isPending}
            error={errors.stress}
          />
          <ScoreSelector
            name="edit-energy"
            label="Energy Level"
            type="energy"
            value={energy}
            onChange={setEnergy}
            disabled={updateMutation.isPending}
            error={errors.energy}
          />
          <ScoreSelector
            name="edit-sleepQuality"
            label="Sleep Quality"
            type="sleepQuality"
            value={sleepQuality}
            onChange={setSleepQuality}
            disabled={updateMutation.isPending}
            error={errors.sleepQuality}
          />

          <div style={{ marginBottom: '18px' }}>
            <label
              htmlFor="edit-sleepHours"
              style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#073a78', marginBottom: '6px' }}
            >
              Sleep Duration (Hours)
            </label>
            <input
              id="edit-sleepHours"
              type="number"
              step="0.5"
              min="0"
              max="24"
              value={sleepHours}
              disabled={updateMutation.isPending}
              onChange={(e) => setSleepHours(e.target.value)}
              placeholder="e.g. 7.5"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: errors.sleepHours ? '1px solid #e11d48' : '1px solid #cbd5e1',
                fontSize: '13px',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label htmlFor="edit-note" style={{ fontSize: '13px', fontWeight: 700, color: '#073a78' }}>
                Reflection / Personal Note
              </label>
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{note.length}/2000</span>
            </div>
            <textarea
              id="edit-note"
              rows={3}
              value={note}
              disabled={updateMutation.isPending}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '12px',
                border: errors.note ? '1px solid #e11d48' : '1px solid #cbd5e1',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="primary"
            >
              {updateMutation.isPending ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
