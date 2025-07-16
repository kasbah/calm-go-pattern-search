import { createContext, useContext, useState, type ReactNode } from "react";

export type LocaleContextType = {
  locale: string;
};

export const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
});

export type LocaleProviderProps = {
  children: ReactNode;
};

export function LocaleProvider({ children }: LocaleProviderProps) {
  // Detect user locale
  const [locale] = useState(() => {
    // Get browser locale, fallback to 'en'
    const browserLocale =
      navigator.language || navigator.languages?.[0] || "en";
    // Extract language code (e.g., 'en-US' -> 'en')
    return browserLocale.split("-")[0];
  });

  return (
    <LocaleContext.Provider value={{ locale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
