/**
 * i18n Configuration
 * Internationalization setup with English and Arabic support
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files directly for core languages
import enTranslations from "./locales/en.json";
import arTranslations from "./locales/ar.json";

const resources = {
  en: {
    translation: enTranslations,
  },
  ar: {
    translation: arTranslations,
  },
};

// Initialize i18n
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    debug: import.meta.env.DEV,

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    backend: {
      loadPath: "/locales/{{lng}}.json",
    },

    react: {
      useSuspense: true,
    },
  });

// Function to change language with RTL support
export function changeLanguage(lng: string) {
  i18n.changeLanguage(lng);

  // Update HTML dir attribute for RTL
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = lng;

  // Store preference
  localStorage.setItem("i18nextLng", lng);
}

// Initialize direction on load
const currentLang = i18n.language || "en";
document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
document.documentElement.lang = currentLang;

export default i18n;

// Type-safe translation keys
export type TranslationKey = keyof typeof enTranslations;
