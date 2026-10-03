/* eslint-disable react-refresh/only-export-components */
/**
 * MANVIA Internationalization (i18n) Architecture
 * Provides language switching, resource lookup, interpolation, and fallback handling.
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
} from "react";
import { en, type TranslationDictionary } from "./translations/en";

export type SupportedLanguage = "en" | "te" | "hi";

export interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const translations: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  te: en, // Fallback to en until Telugu packs are loaded in future phases
  hi: en, // Fallback to en until Hindi packs are loaded in future phases
};

export const I18nContext = createContext<I18nContextValue | null>(null);

export interface I18nProviderProps {
  children: ReactNode;
  initialLanguage?: SupportedLanguage;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({
  children,
  initialLanguage = "en",
}) => {
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);

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
