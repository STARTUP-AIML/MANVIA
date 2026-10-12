/* eslint-disable react-refresh/only-export-components */
/**
 * MANVIA Internationalization (i18n) Architecture
 * Provides language switching, resource lookup, interpolation, and fallback handling.
 * Genuine Telugu (te), Hindi (hi), English (en), and Kannada (kn) localization.
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { en, type TranslationDictionary } from "./translations/en";
import { te } from "./translations/te";
import { hi } from "./translations/hi";
import { kn } from "./translations/kn";

export type SupportedLanguage = "te" | "hi" | "en" | "kn";

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "te", label: "తెలుగు — Telugu (te)", nativeName: "తెలుగు" },
  { code: "hi", label: "हिन्दी — Hindi (hi)", nativeName: "हिन्दी" },
  { code: "en", label: "English (en)", nativeName: "English" },
  { code: "kn", label: "ಕನ್ನಡ — Kannada (kn)", nativeName: "ಕನ್ನಡ" },
];

export interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  supportedLanguages: LanguageOption[];
}

const translations: Record<SupportedLanguage, TranslationDictionary | any> = {
  te,
  hi,
  en,
  kn,
};

export const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
  initialLanguage?: SupportedLanguage;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  initialLanguage,
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    if (initialLanguage) return initialLanguage;
    try {
      const stored = localStorage.getItem("manvia_language") as SupportedLanguage | null;
      if (stored && (stored === "te" || stored === "hi" || stored === "en" || stored === "kn")) {
        return stored;
      }
    } catch {
      // localStorage may not be available in SSR or strict test environments
    }
    return "en";
  });

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("manvia_language", lang);
    } catch {
      // Ignore storage errors safely
    }
  };

  const t = useMemo(() => {
    return (path: string, params?: Record<string, string | number>): string => {
      const keys = path.split(".");
      let current: unknown = translations[language] || translations.en;

      for (const key of keys) {
        if (current && typeof current === "object" && key in current) {
          current = (current as Record<string, unknown>)[key];
        } else {
          // Fallback to English
          let fallback: unknown = translations.en;
          for (const fallbackKey of keys) {
            if (
              fallback &&
              typeof fallback === "object" &&
              fallbackKey in fallback
            ) {
              fallback = (fallback as Record<string, unknown>)[fallbackKey];
            } else {
              return path;
            }
          }
          current = fallback;
          break;
        }
      }

      if (typeof current !== "string") {
        return path;
      }

      if (params) {
        return Object.entries(params).reduce((str, [paramKey, val]) => {
          return str.replace(new RegExp(`{${paramKey}}`, "g"), String(val));
        }, current);
      }

      return current;
    };
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      supportedLanguages: SUPPORTED_LANGUAGES,
    }),
    [language, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useTranslation(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
