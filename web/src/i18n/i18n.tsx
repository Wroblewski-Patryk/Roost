import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Locale, MessageKey, messages } from "./messages";

const storageKey = "companycoreLocale";
const supportedLocales: Locale[] = ["en", "pl"];

type TranslateParams = Record<string, string | number>;
type Translate = (key: MessageKey, params?: TranslateParams) => string;

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLocale(): Locale {
  const stored = window.localStorage.getItem(storageKey);
  return supportedLocales.includes(stored as Locale) ? stored as Locale : "en";
}

function interpolate(template: string, params?: TranslateParams) {
  if (!params) {
    return template;
  }
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  useEffect(() => {
    window.localStorage.setItem(storageKey, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<LanguageContextValue>(() => {
    const t: Translate = (key, params) => {
      const dictionary = messages[locale];
      const fallback = messages.en[key] ?? key;
      return interpolate(dictionary[key] ?? fallback, params);
    };

    return {
      locale,
      setLocale: setLocaleState,
      t
    };
  }, [locale]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error("LanguageProvider is required");
  }
  return value;
}

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export type { MessageKey, Translate };
