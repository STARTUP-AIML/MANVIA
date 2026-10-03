import React from 'react';
import type { DoctorConsultationOffer } from '@/types/doctors';

interface ConsultationOfferSelectorProps {
  offers: DoctorConsultationOffer[];
  selectedOfferId: string | null;
  onSelectOffer: (offer: DoctorConsultationOffer) => void;
  isLoading?: boolean;
}

export const ConsultationOfferSelector: React.FC<ConsultationOfferSelectorProps> = ({
  offers,
  selectedOfferId,
  onSelectOffer,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading consultation offers">
        <div className="h-20 bg-slate-100 animate-pulse rounded-xl" />
        <div className="h-20 bg-slate-100 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <p className="text-slate-600 text-sm font-medium">
          No consultation offers are currently available for this doctor.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Consultation Offers">
      {offers.map((offer) => {
        const isSelected = selectedOfferId === offer.id;
        return (
          <button
            key={offer.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelectOffer(offer)}
            className={`w-full text-left p-4 rounded-xl border transition-all duration-150 flex items-start justify-between gap-4 ${
              isSelected
                ? 'border-teal-600 bg-teal-50/50 shadow-sm ring-2 ring-teal-600/20'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 text-base">
                  {offer.title}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                  {offer.durationMinutes} min
                </span>
                {offer.consultationType && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                    {offer.consultationType.replace('_', ' ')}
                  </span>
                )}
              </div>
              {offer.description && (
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                  {offer.description}
                </p>
              )}
            </div>

            <div className="text-right shrink-0">
              <div className="text-lg font-bold text-slate-900">
                {offer.currency} {offer.fee}
              </div>
              <div className="text-xs text-slate-500 font-medium">
                per session
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
