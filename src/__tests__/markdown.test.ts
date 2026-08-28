import { cleanHeadingText } from '../markdown';

describe('cleanHeadingText (목록·목차 표시용)', () => {
  test('후리가나 요미를 제거하고 베이스만 남긴다', () => {
    expect(cleanHeadingText('面接《めんせつ》の準備《じゅんび》')).toBe('面接の準備');
  });

  test('베이스 경계 문자 ｜를 제거한다', () => {
    expect(cleanHeadingText('｜お茶《おちゃ》を飲む')).toBe('お茶を飲む');
  });

  test('인라인 마크업(굵게·코드·링크)을 제거한다', () => {
    expect(cleanHeadingText('**大事**な`コード`と[リンク](https://x.com)')).toBe(
      '大事なコードとリンク'
    );
  });
});
