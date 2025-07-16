import { useState, type ReactNode } from "react";
import { LocaleContext } from "./locale-context-types";
import { isSupportedLocale, type SupportedLocale } from "./translations";

export type LocaleProviderProps = {
  children: ReactNode;
};

export function LocaleProvider({ children }: LocaleProviderProps) {
  // Detect raw browser locale once (could be any language code)
  const browserLocale = (() => {
    const browserLang = navigator.language || navigator.languages?.[0] || "en";
    // Extract language code (e.g., 'en-US' -> 'en')
    return browserLang.split("-")[0];
  })();

  // Default to auto mode, check localStorage for saved preference
  const [selectedLocale, setSelectedLocale] = useState<SupportedLocale>(() => {
    // Check localStorage first for saved preference
    const savedLocale = localStorage.getItem("locale");
    if (savedLocale && isSupportedLocale(savedLocale)) {
      return savedLocale;
    }

    // Default to auto mode
    return "auto";
  });

  // Save locale preference to localStorage when it changes
  const handleSetSelectedLocale = (newLocale: SupportedLocale) => {
    setSelectedLocale(newLocale);
    localStorage.setItem("locale", newLocale);
  };

  return (
    <LocaleContext.Provider
      value={{
        selectedLocale,
        browserLocale,
        setSelectedLocale: handleSetSelectedLocale,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}
