import React, { useState, useEffect } from 'react';
import type { PreConsultationDraftDto, PreConsultationResponseDto } from '@/types/appointments';

interface PreConsultationFormProps {
  initialData?: PreConsultationResponseDto | null;
  onSaveDraft: (dto: PreConsultationDraftDto) => Promise<void>;
  onSubmitIntake: (dto: PreConsultationDraftDto) => Promise<void>;
  isSavingDraft?: boolean;
  isSubmitting?: boolean;
  isLocked?: boolean;
  errorMessage?: string | null;
}

export const PreConsultationForm: React.FC<PreConsultationFormProps> = ({
  initialData,
  onSaveDraft,
  onSubmitIntake,
  isSavingDraft = false,
  isSubmitting = false,
  isLocked = false,
  errorMessage,
}) => {
  const [reasonForVisit, setReasonForVisit] = useState(initialData?.reasonForVisit || '');
  const [symptoms, setSymptoms] = useState(initialData?.symptoms || '');
  const [symptomOnset, setSymptomOnset] = useState(initialData?.symptomOnset || '');
  const [currentMedications, setCurrentMedications] = useState(initialData?.currentMedications || '');
  const [allergies, setAllergies] = useState(initialData?.allergies || '');
  const [patientNotes, setPatientNotes] = useState(initialData?.patientNotes || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setReasonForVisit(initialData.reasonForVisit || '');
      setSymptoms(initialData.symptoms || '');
      setSymptomOnset(initialData.symptomOnset || '');
      setCurrentMedications(initialData.currentMedications || '');
      setAllergies(initialData.allergies || '');
      setPatientNotes(initialData.patientNotes || '');
    }
  }, [initialData]);

  const handleSaveDraftClick = async () => {
    if (!reasonForVisit.trim()) {
      setValidationError('Primary reason for visit is required to save a draft.');
      return;
    }
    setValidationError(null);
    await onSaveDraft({
      reasonForVisit: reasonForVisit.trim(),
      symptoms: symptoms.trim() || undefined,
      symptomOnset: symptomOnset.trim() || undefined,
      currentMedications: currentMedications.trim() || undefined,
      allergies: allergies.trim() || undefined,
      patientNotes: patientNotes.trim() || undefined,
    });
  };

  const handleSubmitClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reasonForVisit.trim()) {
      setValidationError('Please state the primary reason for your consultation visit.');
      return;
    }
    setValidationError(null);
    await onSubmitIntake({
      reasonForVisit: reasonForVisit.trim(),
      symptoms: symptoms.trim() || undefined,
      symptomOnset: symptomOnset.trim() || undefined,
      currentMedications: currentMedications.trim() || undefined,
      allergies: allergies.trim() || undefined,
      patientNotes: patientNotes.trim() || undefined,
    });
  };

  const isFormDisabled = isLocked || isSavingDraft || isSubmitting;

  return (
    <form onSubmit={handleSubmitClick} noValidate className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Neutral Clinical Preparation Notice */}
      <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-teal-900 text-xs sm:text-sm">
        <p className="font-semibold text-teal-950 mb-1">
          Clinical Preparation Intake
        </p>
        <p className="text-teal-800 leading-relaxed">
          Please provide the information requested below to help your physician prepare for your consultation.
          This intake is reviewed directly by your doctor and does not constitute a diagnosis or treatment recommendation.
        </p>
      </div>

      {isLocked && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs sm:text-sm flex items-center gap-2">
          <span className="font-bold text-emerald-700">✓ Submitted & Locked:</span>
          <span>Your clinical intake was submitted. Responses are locked to preserve clinical record integrity.</span>
        </div>
      )}

      {/* Validation or API error alert */}
      {(validationError || errorMessage) && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-800">
          {validationError || errorMessage}
        </div>
      )}

      <div className="space-y-5">
        {/* Field 1: Reason for Visit (Required, max 1000 chars) */}
        <div>
          <label htmlFor="reason-for-visit" className="block text-sm font-semibold text-slate-900 mb-1">
            Primary Reason for Visit <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="reason-for-visit"
            value={reasonForVisit}
            onChange={(e) => setReasonForVisit(e.target.value.slice(0, 1000))}
            placeholder="e.g. Persistent cough and mild fever for the past 5 days"
            rows={3}
            maxLength={1000}
            required
            disabled={isFormDisabled}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 resize-none"
          />
          <div className="flex justify-between text-[11px] text-slate-400 mt-1">
            <span>Required for consultation preparation</span>
            <span>{reasonForVisit.length} / 1000</span>
          </div>
        </div>

        {/* Field 2: Symptoms description (Optional, max 2000 chars) */}
        <div>
          <label htmlFor="symptoms" className="block text-sm font-semibold text-slate-900 mb-1">
            Symptoms Description (Optional)
          </label>
          <textarea
            id="symptoms"
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value.slice(0, 2000))}
            placeholder="Describe specific symptoms, severity, or triggers"
            rows={3}
            maxLength={2000}
            disabled={isFormDisabled}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 resize-none"
          />
          <div className="text-right text-[11px] text-slate-400 mt-1">
            {symptoms.length} / 2000
          </div>
        </div>

        {/* Field 3: Symptom Onset (Optional, max 100 chars) */}
        <div>
          <label htmlFor="symptom-onset" className="block text-sm font-semibold text-slate-900 mb-1">
            Symptom Onset & Duration (Optional)
          </label>
          <input
            id="symptom-onset"
            type="text"
            value={symptomOnset}
            onChange={(e) => setSymptomOnset(e.target.value.slice(0, 100))}
            placeholder="e.g. Started 4 days ago after travelling"
            maxLength={100}
            disabled={isFormDisabled}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
          />
          <div className="text-right text-[11px] text-slate-400 mt-1">
            {symptomOnset.length} / 100
          </div>
        </div>

        {/* Field 4: Current Medications (Optional, max 2000 chars) */}
        <div>
          <label htmlFor="current-medications" className="block text-sm font-semibold text-slate-900 mb-1">
            Current Medications & Supplements (Optional)
          </label>
          <textarea
            id="current-medications"
            value={currentMedications}
            onChange={(e) => setCurrentMedications(e.target.value.slice(0, 2000))}
            placeholder="List any ongoing prescription medications, over-the-counter drugs, or vitamins"
            rows={2}
            maxLength={2000}
            disabled={isFormDisabled}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 resize-none"
          />
        </div>

        {/* Field 5: Allergies (Optional, max 1000 chars) */}
        <div>
          <label htmlFor="allergies" className="block text-sm font-semibold text-slate-900 mb-1">
            Known Drug or Environmental Allergies (Optional)
          </label>
          <input
            id="allergies"
            type="text"
            value={allergies}
            onChange={(e) => setAllergies(e.target.value.slice(0, 1000))}
            placeholder="e.g. Penicillin, Sulfa drugs, Latex"
            maxLength={1000}
            disabled={isFormDisabled}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
          />
        </div>

        {/* Field 6: Patient Questions / Notes (Optional, max 2000 chars) */}
        <div>
          <label htmlFor="patient-notes" className="block text-sm font-semibold text-slate-900 mb-1">
            Specific Questions for the Physician (Optional)
          </label>
          <textarea
            id="patient-notes"
            value={patientNotes}
            onChange={(e) => setPatientNotes(e.target.value.slice(0, 2000))}
            placeholder="Any specific questions, topics, or concerns you would like to address during your consultation"
            rows={2}
            maxLength={2000}
            disabled={isFormDisabled}
            className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500 resize-none"
          />
        </div>
      </div>

      {!isLocked && (
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleSaveDraftClick}
            disabled={isFormDisabled}
            className="w-full sm:w-auto py-2.5 px-5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
          </button>
          <button
            type="submit"
            disabled={isFormDisabled}
            className="w-full sm:w-auto py-2.5 px-6 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Submitting & Locking...</span>
              </>
            ) : (
              <span>Submit Pre-Consultation</span>
            )}
          </button>
        </div>
      )}
    </form>
  );
};
