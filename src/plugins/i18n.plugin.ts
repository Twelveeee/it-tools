import type { Plugin, Ref } from 'vue';
import { watch } from 'vue';
import { createI18n } from 'vue-i18n';

interface LocaleMessages {
  [key: string]: LocaleMessages | string
}

const localeLoaders = import.meta.glob<LocaleMessages>([
  '../../locales/*.yml',
  '!../../locales/en.yml',
], { import: 'default' });
const initialEnglishMessages = import.meta.glob<LocaleMessages>('../../locales/en.yml', { eager: true, import: 'default' });
const englishMessages = initialEnglishMessages['../../locales/en.yml'] ?? {};
const localeCodes = ['en', ...Object.keys(localeLoaders).map(path => path.match(/\/([^/]+)\.yml$/)?.[1]).filter(Boolean) as string[]];
const messages: Record<string, LocaleMessages> = Object.fromEntries(localeCodes.map(locale => [locale, locale === 'en' ? englishMessages : {}]));
const loadedLocales = new Set(['en']);

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages,
});
const i18nGlobal = i18n.global as unknown as {
  locale: Ref<string>
  setLocaleMessage: (locale: string, messages: LocaleMessages) => void
  t: (key: string) => string
  te: (key: string, locale?: string) => boolean
};

export async function loadLocaleMessages(locale: string) {
  if (loadedLocales.has(locale)) {
    return;
  }

  const loadLocale = localeLoaders[`../../locales/${locale}.yml`];
  if (!loadLocale) {
    return;
  }

  const localeMessages = await loadLocale();
  i18nGlobal.setLocaleMessage(locale, localeMessages);
  loadedLocales.add(locale);
}

export const i18nPlugin: Plugin = {
  install: (app) => {
    app.use(i18n);
    watch(i18nGlobal.locale, async (locale) => {
      await loadLocaleMessages(locale);
    }, { immediate: true });
  },
};

export const translate = function (localeKey: string) {
  const hasKey = i18nGlobal.te(localeKey, i18nGlobal.locale.value);
  return hasKey ? i18nGlobal.t(localeKey) : localeKey;
};
