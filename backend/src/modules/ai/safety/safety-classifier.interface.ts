import type { AISafetyClassification, AISafetyAction } from './safety.enums.js';

export interface SafetyClassificationResult {
  classification: AISafetyClassification;
  action: AISafetyAction;
  confidence: number;
  matchedRules: string[];
  advisoryMessage?: string | undefined;
  escalationRequired: boolean;
  locale: string;
}

export interface SafetyClassifier {
  classify(text: string, locale?: string | undefined): Promise<SafetyClassificationResult>;
}
