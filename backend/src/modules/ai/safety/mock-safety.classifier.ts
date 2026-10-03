import { Injectable } from '@nestjs/common';
import {
  type SafetyClassifier,
  type SafetyClassificationResult,
} from './safety-classifier.interface.js';
import { AISafetyClassification, AISafetyAction } from './safety.enums.js';
import { getEmergencyRouting } from './safety-policy.js';

@Injectable()
export class MockSafetyClassifier implements SafetyClassifier {
  private readonly crisisKeywords = [
    'suicide',
    'kill myself',
    'end my life',
    'want to die',
    'self-harm',
    'hang myself',
    'slit my wrist',
  ];

  private readonly emergencyKeywords = [
    'chest pain',
    'cannot breathe',
    'cant breathe',
    'heart attack',
    'stroke',
    'bleeding uncontrollably',
    'unconscious',
    'severe overdose',
    'anaphylaxis',
    'difficulty breathing',
  ];

  private readonly unsupportedClinicalKeywords = [
    'prescribe',
    'prescription',
    'diagnose me',
    'what disease do i have',
    'give me antibiotics',
    'dosage for',
  ];

  private readonly medicalInformationKeywords = [
    'symptom',
    'hypertension',
    'blood pressure',
    'diabetes',
    'cholesterol',
    'headache',
    'migraine',
    'fever',
    'asthma',
    'guideline',
    'treatment',
    'nutrition',
    'vaccine',
  ];

  public async classify(
    text: string,
    locale: string = 'en-US',
  ): Promise<SafetyClassificationResult> {
    const lower = text.toLowerCase();
    const routing = getEmergencyRouting(locale);

    // 1. Self-harm / suicide check
    const matchedCrisis = this.crisisKeywords.filter((k) => lower.includes(k));
    if (matchedCrisis.length > 0) {
      return {
        classification: AISafetyClassification.SELF_HARM_OR_SUICIDE,
        action: AISafetyAction.CRISIS_REFERRAL,
        confidence: 0.98,
        matchedRules: ['RULE_CRISIS_SELF_HARM', ...matchedCrisis],
        advisoryMessage: `${routing.emergencyNotice} Crisis assistance is available 24/7 at ${routing.crisisLineNumber ?? routing.emergencyNumber}. You are not alone, and help is available.`,
        escalationRequired: true,
        locale,
      };
    }

    // 2. Acute Emergency check
    const matchedEmergency = this.emergencyKeywords.filter((k) => lower.includes(k));
    if (matchedEmergency.length > 0) {
      return {
        classification: AISafetyClassification.EMERGENCY,
        action: AISafetyAction.EMERGENCY_ESCALATION,
        confidence: 0.95,
        matchedRules: ['RULE_ACUTE_EMERGENCY', ...matchedEmergency],
        advisoryMessage: `${routing.emergencyNotice} As your MANVIA AI Companion, I am not a licensed medical professional and cannot provide clinical diagnoses or emergency medical care. Please contact emergency services (dial ${routing.emergencyNumber}) or go to the nearest emergency room immediately.`,
        escalationRequired: true,
        locale,
      };
    }

    // 3. Unsupported Clinical Request (Prescription / Diagnosis)
    const matchedUnsupported = this.unsupportedClinicalKeywords.filter((k) => lower.includes(k));
    if (matchedUnsupported.length > 0) {
      return {
        classification: AISafetyClassification.UNSUPPORTED_CLINICAL_REQUEST,
        action: AISafetyAction.REFUSAL,
        confidence: 0.9,
        matchedRules: ['RULE_UNSUPPORTED_CLINICAL_REQUEST', ...matchedUnsupported],
        advisoryMessage: `MANVIA AI Companion is an educational wellness assistant. I am not a licensed medical professional and cannot provide clinical diagnoses or prescribe medications. If you require emergency services or urgent care, please consult a licensed medical professional or dial ${routing.emergencyNumber}.`,
        escalationRequired: false,
        locale,
      };
    }

    // 4. Medical Information request (Safe with RAG + non-clinical disclosure)
    const matchedMedInfo = this.medicalInformationKeywords.filter((k) => lower.includes(k));
    if (matchedMedInfo.length > 0) {
      return {
        classification: AISafetyClassification.MEDICAL_INFORMATION,
        action: AISafetyAction.DISCLOSURE_ATTACHED,
        confidence: 0.88,
        matchedRules: ['RULE_MEDICAL_INFO_QUERY', ...matchedMedInfo],
        advisoryMessage: undefined,
        escalationRequired: false,
        locale,
      };
    }

    // 5. Default Safe
    return {
      classification: AISafetyClassification.SAFE,
      action: AISafetyAction.ALLOWED,
      confidence: 0.99,
      matchedRules: ['RULE_GENERAL_SAFE'],
      advisoryMessage: undefined,
      escalationRequired: false,
      locale,
    };
  }
}
