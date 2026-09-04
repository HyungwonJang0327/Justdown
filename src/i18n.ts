import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import ko from './locales/ko.json';
import ja from './locales/ja.json';
import en from './locales/en.json';

/** 시스템 언어를 따르고(선택 UI 없음), 미지원 언어는 영어로 폴백한다. */
export const i18n = new I18n({ ko, ja, en });
i18n.defaultLocale = 'en';
i18n.enableFallback = true;
i18n.locale = getLocales()[0]?.languageCode ?? 'en';

export const t = i18n.t.bind(i18n);
