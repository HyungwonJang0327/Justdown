import {
  cleanHeadingText,
  extractHeadings,
  renderMarkdownBody,
  renderMarkdownDocument,
} from '../markdown';

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

describe('renderMarkdownBody — 후리가나 변환', () => {
  test('아오조라 표기: 한자 연속이 베이스가 된다', () => {
    expect(renderMarkdownBody('漢字《かんじ》')).toBe(
      '<p><ruby>漢字<rt>かんじ</rt></ruby></p>\n'
    );
  });

  test('한자 앞의 비한자 문자는 베이스에 포함되지 않는다', () => {
    expect(renderMarkdownBody('今日は面接《めんせつ》の日')).toBe(
      '<p>今日は<ruby>面接<rt>めんせつ</rt></ruby>の日</p>\n'
    );
  });

  test('｜로 베이스 시작을 명시하면 한자 이외 문자도 포함된다', () => {
    expect(renderMarkdownBody('｜お茶《おちゃ》を飲む')).toBe(
      '<p><ruby>お茶<rt>おちゃ</rt></ruby>を飲む</p>\n'
    );
  });

  test('반각 | 도 베이스 경계로 동작한다', () => {
    expect(renderMarkdownBody('|お茶《おちゃ》')).toBe(
      '<p><ruby>お茶<rt>おちゃ</rt></ruby></p>\n'
    );
  });

  test('인용부호 「」『』는 변환되지 않고 그대로 남는다', () => {
    expect(renderMarkdownBody('「面接《めんせつ》」と『本』')).toBe(
      '<p>「<ruby>面接<rt>めんせつ</rt></ruby>」と『本』</p>\n'
    );
  });

  test('코드 스팬 안의 《》는 변환하지 않는다', () => {
    expect(renderMarkdownBody('`漢字《かんじ》`')).toBe(
      '<p><code>漢字《かんじ》</code></p>\n'
    );
  });

  test('코드 블록 안의 《》는 변환하지 않는다', () => {
    const out = renderMarkdownBody('```\n漢字《かんじ》\n```');
    expect(out).toContain('漢字《かんじ》');
    expect(out).not.toContain('<ruby>');
  });

  test('HTML ruby 태그 직접 입력을 그대로 통과시킨다', () => {
    expect(renderMarkdownBody('<ruby>漢字<rt>かんじ</rt></ruby>')).toBe(
      '<p><ruby>漢字<rt>かんじ</rt></ruby></p>\n'
    );
  });

  test('한 문장에 여러 후리가나를 모두 변환한다', () => {
    const out = renderMarkdownBody('面接《めんせつ》の準備《じゅんび》');
    expect(out).toBe(
      '<p><ruby>面接<rt>めんせつ</rt></ruby>の<ruby>準備<rt>じゅんび</rt></ruby></p>\n'
    );
  });
});

describe('renderMarkdownBody — GFM 렌더링', () => {
  test('헤딩에 소스 라인 기반 앵커 id 를 부여한다 (목차 점프용)', () => {
    expect(renderMarkdownBody('# 見出し')).toBe('<h1 id="hl-0">見出し</h1>\n');
    expect(renderMarkdownBody('本文\n\n## 次')).toContain('<h2 id="hl-2">次</h2>');
  });

  test('줄바꿈을 <br> 로 변환한다 (breaks: true)', () => {
    expect(renderMarkdownBody('一行目\n二行目')).toBe('<p>一行目<br>\n二行目</p>\n');
  });

  test('URL 을 자동으로 링크로 만든다 (linkify)', () => {
    expect(renderMarkdownBody('https://example.com')).toContain(
      '<a href="https://example.com">'
    );
  });

  test('표를 렌더링한다', () => {
    const out = renderMarkdownBody('| a | b |\n| - | - |\n| 1 | 2 |');
    expect(out).toContain('<table>');
    expect(out).toContain('<th>a</th>');
    expect(out).toContain('<td>1</td>');
  });

  test('리스트·인용구를 렌더링한다', () => {
    expect(renderMarkdownBody('- 項目')).toContain('<li>項目</li>');
    expect(renderMarkdownBody('> 引用')).toContain('<blockquote>');
  });

  test('언어 지정 코드 블록에 구문강조를 적용한다', () => {
    const out = renderMarkdownBody('```js\nconst x = 1;\n```');
    expect(out).toContain('<pre><code class="language-js">');
    expect(out).toContain('hljs-keyword');
  });

  test('언어를 모르는 코드 블록은 HTML 이스케이프만 한다', () => {
    const out = renderMarkdownBody('```\n<tag>\n```');
    expect(out).toContain('&lt;tag&gt;');
  });

  // 의도된 동작(markdown.ts 의 html: true — 정석 ruby 직접 입력 허용)의 대가로,
  // 임의의 HTML 이 그대로 통과한다. 웹/공유 기능을 추가할 때는 재검토가 필요하다.
  test('[특성화] 임의의 raw HTML 이 이스케이프 없이 통과한다', () => {
    expect(renderMarkdownBody('<div onclick="x()">hi</div>')).toContain(
      '<div onclick="x()">hi</div>'
    );
  });
});

describe('renderMarkdownDocument (WebView 용 완전한 문서)', () => {
  test('완전한 HTML 문서를 생성한다 (본문·찾기 스크립트 포함)', () => {
    const doc = renderMarkdownDocument('# 見出し', 'light');
    expect(doc).toContain('<!DOCTYPE html>');
    expect(doc).toContain('<html lang="ja">');
    expect(doc).toContain('<h1 id="hl-0">見出し</h1>');
    expect(doc).toContain('window.__find');
  });

  test('배경색은 CSS 변수로 정의되어 양 테마가 한 문서에 공존한다', () => {
    const doc = renderMarkdownDocument('x', 'light');
    expect(doc).toContain('--bg: #ffffff');
    expect(doc).toContain('--bg: #151515');
  });

  test('테마는 html 클래스로만 반영된다 (전환 시 문서 재생성이 필요 없도록)', () => {
    const light = renderMarkdownDocument('x', 'light');
    const dark = renderMarkdownDocument('x', 'dark');
    expect(light).toContain('window.__setTheme');
    expect(dark).toContain('<html lang="ja" class="dark">');
    // 초기 클래스 말고는 완전히 동일해야 테마 전환이 리로드를 유발하지 않는다
    expect(dark.replace(' class="dark"', '')).toBe(light);
  });
});

describe('extractHeadings (목차 패널용)', () => {
  test('레벨·표시 텍스트·라인 번호를 추출한다', () => {
    const headings = extractHeadings('# A\n\n## 面接《めんせつ》');
    expect(headings).toEqual([
      { level: 1, text: 'A', line: 0, offset: 0, length: 3 },
      { level: 2, text: '面接', line: 2, offset: 5, length: 11 },
    ]);
  });

  test('코드 펜스(```·~~~) 안의 # 은 헤딩으로 취급하지 않는다', () => {
    const md = '```\n# not\n```\n# yes\n~~~\n## also not\n~~~';
    const headings = extractHeadings(md);
    expect(headings.map((h) => h.text)).toEqual(['yes']);
    expect(headings[0].line).toBe(3);
  });

  test('# 뒤에 공백이 없거나 7개 이상인 # 은 헤딩이 아니다', () => {
    expect(extractHeadings('#無空白')).toEqual([]);
    expect(extractHeadings('####### 深すぎ')).toEqual([]);
  });
});
