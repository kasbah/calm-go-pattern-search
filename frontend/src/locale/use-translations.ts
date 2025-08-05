import { useLocale } from "./use-locale";
import {
  translations,
  type TranslationKey,
  type SupportedLocale,
  isSupportedLocale,
} from "./translations";

export function useTranslations() {
  const { selectedLocale, browserLocale } = useLocale();

  // Determine the actual locale being used (can be unsupported)
  const actualLocale: string = (() => {
    if (selectedLocale === "auto") {
      return browserLocale;
    }
    return selectedLocale;
  })();

  // For translation lookups, we need a supported locale
  const currentLocale: Exclude<SupportedLocale, "auto"> = (() => {
    if (selectedLocale === "auto") {
      // Try browserLocale first, fall back to English if unsupported
      return isSupportedLocale(browserLocale) && browserLocale !== "auto"
        ? (browserLocale as Exclude<SupportedLocale, "auto">)
        : "en";
    }
    // Use selectedLocale if supported, otherwise fall back to English
    const nonAutoLocale = selectedLocale as Exclude<SupportedLocale, "auto">;
    return isSupportedLocale(nonAutoLocale) ? nonAutoLocale : "en";
  })();

  const lookupTranslation = (
    key: TranslationKey,
    locale: string,
  ): string | undefined => {
    //@ts-expect-error - we want to use string keys and return undefined
    return translations[locale]?.[key] ?? undefined;
  };

  /**
   * Get translated text for a given key
   * Falls back to English, then to provided fallback, then to the key itself
   */
  const t = (key: TranslationKey, fallback?: string): string => {
    // Try current locale
    const currentTranslation = lookupTranslation(key, currentLocale);
    if (currentTranslation != null) {
      return currentTranslation;
    }

    // Fallback to English if not current locale
    if (currentLocale !== "en") {
      const englishTranslation = translations.en[key];
      if (englishTranslation != null) {
        return englishTranslation;
      }
    }

    // Use provided fallback or key as last resort
    return fallback ?? key;
  };

  /**
   * Get translated text with count (for pluralization-like scenarios)
   * Returns "count translation" format
   */
  const tc = (
    count: number,
    key: TranslationKey,
    fallback?: string,
  ): string => {
    const translation = t(key, fallback);
    return `${count} ${translation}`;
  };

  /**
   * Get month name by index (1-12)
   */
  const getMonthName = (month: number): string => {
    const monthKeys: TranslationKey[] = [
      "months.january",
      "months.february",
      "months.march",
      "months.april",
      "months.may",
      "months.june",
      "months.july",
      "months.august",
      "months.september",
      "months.october",
      "months.november",
      "months.december",
    ];

    const monthKey = monthKeys[month - 1];
    return monthKey ? t(monthKey) : month.toString();
  };

  /**
   * Get ordinal suffix for numbers (1st, 2nd, 3rd, 4th)
   */
  const getOrdinalSuffix = (day: number): string => {
    // For languages that don't use ordinals (Chinese, Japanese, Korean, Russian)
    // the translations return empty strings or appropriate alternatives
    if (day >= 11 && day <= 13) return t("ordinal.th");

    switch (day % 10) {
      case 1:
        return t("ordinal.st");
      case 2:
        return t("ordinal.nd");
      case 3:
        return t("ordinal.rd");
      default:
        return t("ordinal.th");
    }
  };

  /**
   * Format a date with localized month names and ordinals
   */
  const formatDate = (day: number, month: number, year: number): string => {
    const monthName = getMonthName(month);
    const ordinalSuffix = getOrdinalSuffix(day);

    // Handle different date formats per language
    if (
      currentLocale === "zh" ||
      currentLocale === "ja" ||
      currentLocale === "ko"
    ) {
      // Asian format: year年month月day日 or similar
      return `${year}年${monthName}${day}日`;
    } else if (currentLocale === "ru") {
      // Russian format: day month year
      return `${day} ${monthName} ${year}`;
    } else {
      // English format: day month year
      return `${day}${ordinalSuffix} ${monthName} ${year}`;
    }
  };

  return {
    t,
    tc,
    getMonthName,
    getOrdinalSuffix,
    formatDate,
    locale: actualLocale,
    lookupTranslation,
  };
}

export type UseTranslationsReturn = ReturnType<typeof useTranslations>;
export type { TranslationKey };
