import { i18n, t } from '../i18n';
import ko from '../locales/ko.json';
import ja from '../locales/ja.json';
import en from '../locales/en.json';

// 시스템 언어를 고정해 테스트를 결정적으로 만든다 (jest.mock 은 import 위로 호이스팅됨)
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'ko' }],
}));

const restoreLocale = i18n.locale;
afterEach(() => {
  i18n.locale = restoreLocale;
});

describe('로케일 파일', () => {
  it('ko/ja/en 이 동일한 키 집합을 가진다', () => {
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(ja)).toEqual(keys(ko));
    expect(keys(en)).toEqual(keys(ko));
  });

  it('전 언어의 에디터 placeholder 에 후리가나 예시(漢字《かんじ》)가 유지된다', () => {
    for (const locale of [ko, ja, en]) {
      expect(locale.editorPlaceholder).toContain('漢字《かんじ》');
    }
  });
});

describe('언어 해석', () => {
  it('시스템 언어(ko)를 따른다', () => {
    expect(i18n.locale).toBe('ko');
    expect(t('delete')).toBe('삭제');
  });

  it('일본어로 전환하면 일본어 문자열을 반환한다', () => {
    i18n.locale = 'ja';
    expect(t('delete')).toBe('削除');
  });

  it('지원하지 않는 언어는 영어로 폴백한다', () => {
    i18n.locale = 'fr';
    expect(t('delete')).toBe('Delete');
  });
});
