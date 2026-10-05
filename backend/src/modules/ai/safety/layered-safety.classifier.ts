import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '../../../config/config.service.js';
import type {
  SafetyClassificationResult,
  SafetyClassifier,
} from './safety-classifier.interface.js';
import { AISafetyClassification, AISafetyAction } from './safety.enums.js';
import { getEmergencyRouting } from './safety-policy.js';

@Injectable()
export class LayeredSafetyClassifier implements SafetyClassifier {
  private readonly logger = new Logger(LayeredSafetyClassifier.name);

  // Layer 1: Strict Deterministic Lexicons (Highest Priority, Unbypassable)
  private readonly crisisKeywords = [
    'suicide',
    'kill myself',
    'end my life',
    'want to die',
    'self-harm',
    'hang myself',
    'slit my wrist',
    'cut myself',
    'overdose to die',
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
    'crushing chest pressure',
    'seizure',
    'loss of consciousness',
  ];

  private readonly unsupportedClinicalKeywords = [
    'prescribe',
    'prescription',
    'diagnose me',
    'what disease do i have',
    'give me antibiotics',
    'dosage for',
    'cure my infection',
    'calculate my dose',
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
    'sleep hygiene',
    'stress relief',
  ];

  constructor(
    @Optional()
    @Inject(ConfigService)
    private readonly configService?: ConfigService,
  ) {}

  public async classify(
    text: string,
    locale: string = 'en-US',
  ): Promise<SafetyClassificationResult> {
    const lower = text.toLowerCase().trim();
    const routing = getEmergencyRouting(locale);

    // =========================================================================
    // LAYER 1: Unbypassable Deterministic Safety Rules
    // =========================================================================

    // 1. Self-Harm / Crisis
    const matchedCrisis = this.crisisKeywords.filter((k) => lower.includes(k));
    if (matchedCrisis.length > 0) {
      this.logger.warn(`Deterministic crisis trigger: [${matchedCrisis.join(', ')}]`);
      return {
        classification: AISafetyClassification.SELF_HARM_OR_SUICIDE,
        action: AISafetyAction.CRISIS_REFERRAL,
        confidence: 0.99,
        matchedRules: ['RULE_DETERMINISTIC_CRISIS', ...matchedCrisis],
        advisoryMessage: `${routing.emergencyNotice} Crisis assistance is available 24/7 at ${routing.crisisLineNumber ?? routing.emergencyNumber}. You are not alone, and immediate support is ready.`,
        escalationRequired: true,
        locale,
      };
    }

    // 2. Acute Emergency (Chest pain, Stroke, Anaphylaxis, etc.)
    const matchedEmergency = this.emergencyKeywords.filter((k) => lower.includes(k));
    if (matchedEmergency.length > 0) {
      this.logger.warn(`Deterministic emergency trigger: [${matchedEmergency.join(', ')}]`);
      return {
        classification: AISafetyClassification.EMERGENCY,
        action: AISafetyAction.EMERGENCY_ESCALATION,
        confidence: 0.98,
        matchedRules: ['RULE_DETERMINISTIC_EMERGENCY', ...matchedEmergency],
        advisoryMessage: `${routing.emergencyNotice} As your MANVIA AI Companion, I am not a licensed medical professional and cannot provide emergency medical care or diagnosis. Please contact emergency services (dial ${routing.emergencyNumber}) or proceed to the nearest emergency facility immediately.`,
        escalationRequired: true,
        locale,
      };
    }

    // 3. Unsupported Clinical Request (Prescription / Diagnosis demand)
    const matchedUnsupported = this.unsupportedClinicalKeywords.filter((k) => lower.includes(k));
    if (matchedUnsupported.length > 0) {
      return {
        classification: AISafetyClassification.UNSUPPORTED_CLINICAL_REQUEST,
        action: AISafetyAction.REFUSAL,
        confidence: 0.95,
        matchedRules: ['RULE_DETERMINISTIC_CLINICAL_REFUSAL', ...matchedUnsupported],
        advisoryMessage:
          'MANVIA AI Companion provides non-clinical lifestyle and wellness education. Only licensed medical physicians can diagnose conditions, prescribe medications, or adjust dosages. Would you like to schedule a consultation with a verified MANVIA doctor?',
        escalationRequired: false,
        locale,
      };
    }

    // =========================================================================
    // LAYER 2: Semantic / AI Safety Evaluation (When Enabled)
    // =========================================================================
    const isSafetyEnabled = this.configService?.isAiSafetyEnabled ?? true;
    const apiKey = this.configService?.geminiApiKey;

    if (isSafetyEnabled && apiKey && !this.isTestEnvironment()) {
      try {
        const aiResult = await this.evaluateWithGeminiSafety(text, locale, apiKey);
        if (aiResult) {
          return aiResult;
        }
      } catch (err) {
        this.logger.warn(
          `Gemini safety check failed, falling back to deterministic policy: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // =========================================================================
    // LAYER 3: Standard Deterministic Medical Information vs Safe General
    // =========================================================================
    const matchedMedInfo = this.medicalInformationKeywords.filter((k) => lower.includes(k));
    if (matchedMedInfo.length > 0) {
      return {
        classification: AISafetyClassification.MEDICAL_INFORMATION,
        action: AISafetyAction.DISCLOSURE_ATTACHED,
        confidence: 0.9,
        matchedRules: ['RULE_DETERMINISTIC_MED_INFO', ...matchedMedInfo],
        escalationRequired: false,
        locale,
      };
    }

    return {
      classification: AISafetyClassification.SAFE,
      action: AISafetyAction.ALLOWED,
      confidence: 0.95,
      matchedRules: ['RULE_SAFE_BASELINE'],
      escalationRequired: false,
      locale,
    };
  }

  private isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
  }

  /**
   * Evaluates text using Gemini model with explicit structured safety classification instructions.
   */
  private async evaluateWithGeminiSafety(
    text: string,
    locale: string,
    apiKey: string,
  ): Promise<SafetyClassificationResult | null> {
    const model = this.configService?.aiSafetyModel || 'gemini-3.8-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const prompt = `You are a healthcare safety classifier for the MANVIA AI companion platform.
Analyze the following patient message and output strict JSON only:
{
  "classification": "SAFE" | "MEDICAL_INFORMATION" | "POTENTIALLY_HARMFUL" | "URGENT_MEDICAL" | "CRISIS" | "EMERGENCY" | "UNSUPPORTED_CLINICAL_REQUEST",
  "action": "ALLOWED" | "FLAGGED" | "DISCLOSURE_ATTACHED" | "REFUSAL" | "EMERGENCY_ESCALATION" | "CRISIS_REFERRAL",
  "confidence": number between 0.0 and 1.0,
  "reason": "short explanation"
}

Patient Message: "${text.replace(/"/g, '\\"')}"`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawJson) return null;

    try {
      const parsed = JSON.parse(rawJson);
      const classification = parsed.classification as AISafetyClassification;
      const action = parsed.action as AISafetyAction;
      const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.85;

      const escalationRequired =
        action === AISafetyAction.EMERGENCY_ESCALATION || action === AISafetyAction.CRISIS_REFERRAL;

      return {
        classification: Object.values(AISafetyClassification).includes(classification)
          ? classification
          : AISafetyClassification.SAFE,
        action: Object.values(AISafetyAction).includes(action) ? action : AISafetyAction.ALLOWED,
        confidence,
        matchedRules: ['RULE_GEMINI_SAFETY_CLASSIFIER', parsed.reason || 'ai_semantic_check'],
        escalationRequired,
        locale,
      };
    } catch {
      return null;
    }
  }
}
