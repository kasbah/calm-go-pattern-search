import { useLocale } from "./use-locale";
import { useTranslations } from "./use-translations";
import { supportedLocales, type SupportedLocale } from "./translations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui-primitives/select";

// Language display names in their native scripts
const languageNames: Record<Exclude<SupportedLocale, "auto">, string> = {
  de: "Deutsch",
  en: "English",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  ru: "Русский",
};

export type LanguageSelectorProps = {
  className?: string;
};

export function LanguageSelector({ className }: LanguageSelectorProps) {
  const { selectedLocale, browserLocale, setSelectedLocale } = useLocale();
  const { t } = useTranslations();

  const handleLanguageChange = (value: string) => {
    const newLocale = value as SupportedLocale;
    if (supportedLocales.includes(newLocale)) {
      setSelectedLocale(newLocale);
    }
  };

  const getDisplayName = (localeValue: SupportedLocale): string => {
    if (localeValue === "auto") {
      return `${t("language.auto")} (${browserLocale.toUpperCase()})`;
    }
    return languageNames[localeValue as Exclude<SupportedLocale, "auto">];
  };

  return (
    <div className={className}>
      <Select value={selectedLocale} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[110px] h-8 text-xs border-none border-b-0 bg-white/80 backdrop-blur-sm hover:bg-white/90 transition-colors [&>svg]:h-3 [&>svg]:w-3">
          <SelectValue className="text-xs">
            {getDisplayName(selectedLocale)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="min-w-[110px]">
          {supportedLocales.map((supportedLocale) => (
            <SelectItem
              key={supportedLocale}
              value={supportedLocale}
              className="text-xs"
            >
              {getDisplayName(supportedLocale)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default LanguageSelector;
