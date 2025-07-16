import { createContext } from "react";
import { type SupportedLocale } from "./translations";

export type LocaleContextType = {
  selectedLocale: SupportedLocale;
  browserLocale: string;
  setSelectedLocale: (locale: SupportedLocale) => void;
};

export const LocaleContext = createContext<LocaleContextType>({
  selectedLocale: "auto",
  browserLocale: "en",
  setSelectedLocale: () => {},
});
