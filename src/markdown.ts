import MarkdownIt from 'markdown-it';
import aozoraRuby, { stripRuby } from 'markdown-it-aozora-ruby';
import hljs from 'highlight.js';
import type { ThemeName } from './theme';

/**
 * Furigana(요미가나) — 아오조라 문고 / 픽시브 표기법 (`漢字《かんじ》`).
 * 파싱·렌더링은 별도 배포한 markdown-it-aozora-ruby 플러그인에 위임한다
 * (원래 여기 인라인으로 있던 로직을 패키지로 분리·도그푸딩).
 */

const md = new MarkdownIt({
  html: true, // 나만 쓰는 앱이므로 정석 <ruby> 태그 직접 입력도 허용
  linkify: true,
  breaks: true, // 줄바꿈을 <br> 로 (메모 앱에 자연스러움)
  highlight: (code, lang): string => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
      } catch {
        // fall through
      }
    }
    return md.utils.escapeHtml(code);
  },
});

md.use(aozoraRuby);

// 각 헤딩에 소스 라인 기반 앵커 부여 (목차 점프용): <h2 id="hl-12">
md.renderer.rules.heading_open = (tokens, idx, options, _env, self) => {
  const map = tokens[idx].map;
  if (map) tokens[idx].attrSet('id', `hl-${map[0]}`);
  return self.renderToken(tokens, idx, options);
};

export interface Heading {
  level: number; // 1~6
  text: string; // 마크업 제거된 표시용 텍스트
  line: number; // 소스 라인 번호 (앵커 id와 일치)
  offset: number; // 소스에서 라인 시작 문자 오프셋 (Code 탭 커서 이동용)
  length: number; // 라인 길이
}

/** 마크다운에서 ATX 헤딩(#~######)을 추출한다. 코드 펜스 안은 제외. */
export function extractHeadings(markdown: string): Heading[] {
  const lines = (markdown ?? '').split('\n');
  const out: Heading[] = [];
  let offset = 0;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
    } else if (!inFence) {
      const m = /^(#{1,6})\s+(.+)$/.exec(line);
      if (m) {
        out.push({
          level: m[1].length,
          text: cleanHeadingText(m[2]),
          line: i,
          offset,
          length: line.length,
        });
      }
    }
    offset += line.length + 1;
  }
  return out;
}

/** 목차·노트 목록 표시용으로 후리가나 요미와 인라인 마크업을 제거한다. */
export function cleanHeadingText(s: string): string {
  return stripRuby(s) // 후리가나 요미·｜ 제거는 패키지 stripRuby 에 위임 (베이스만 남김)
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
}

/** 마크다운 본문을 (문서가 아닌) HTML 조각으로 변환한다. */
export function renderMarkdownBody(markdown: string): string {
  return md.render(markdown ?? '');
}

/** WebView 에 주입할 완전한 HTML 문서를 생성한다.
 *  테마는 html 클래스로만 반영 — CSS 는 양 테마를 모두 포함하므로
 *  __setTheme 호출만으로 문서 재생성(리로드·스크롤 소실) 없이 전환된다. */
export function renderMarkdownDocument(markdown: string, theme: ThemeName): string {
  const body = renderMarkdownBody(markdown);
  return `<!DOCTYPE html>
<html lang="ja"${theme === 'dark' ? ' class="dark"' : ''}>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>${baseCss()}</style>
</head>
<body>
<article class="md">
${body}
</article>
<script>
(function () {
  // 테마 전환: 클래스만 바꾸므로 스크롤 위치가 유지된다
  window.__setTheme = function (t) {
    document.documentElement.classList.toggle('dark', t === 'dark');
  };
  // 프리뷰 내 찾기: 텍스트 노드를 걸어 매치를 <mark>로 감싸고 index번째로 스크롤.
  // RN 쪽에서 injectJavaScript로 호출하고, 매치 수는 postMessage로 돌려준다.
  window.__find = function (query, index) {
    document.querySelectorAll('mark.__find').forEach(function (m) {
      var p = m.parentNode;
      p.replaceChild(document.createTextNode(m.textContent), m);
      p.normalize();
    });
    var count = 0;
    if (query) {
      var q = query.toLowerCase();
      var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      var nodes = [];
      while (walker.nextNode()) {
        var n = walker.currentNode;
        if (n.parentNode && n.parentNode.closest('script,style')) continue;
        if (n.nodeValue.toLowerCase().indexOf(q) >= 0) nodes.push(n);
      }
      nodes.forEach(function (node) {
        var text = node.nodeValue;
        var lower = text.toLowerCase();
        var frag = document.createDocumentFragment();
        var last = 0;
        var i = lower.indexOf(q);
        while (i >= 0) {
          frag.appendChild(document.createTextNode(text.slice(last, i)));
          var mark = document.createElement('mark');
          mark.className = '__find';
          mark.textContent = text.slice(i, i + q.length);
          frag.appendChild(mark);
          last = i + q.length;
          i = lower.indexOf(q, last);
        }
        frag.appendChild(document.createTextNode(text.slice(last)));
        node.parentNode.replaceChild(frag, node);
      });
      var marks = document.querySelectorAll('mark.__find');
      count = marks.length;
      if (count) {
        var cur = marks[((index % count) + count) % count];
        cur.classList.add('__cur');
        cur.scrollIntoView({ block: 'center' });
      }
    }
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'findCount', count: count }));
    }
    return true;
  };
})();
</script>
</body>
</html>`;
}

function baseCss(): string {
  return `
  :root {
    --fg: #1a1a1a; --bg: #ffffff; --muted: #6a737d; --border: #e1e4e8;
    --code-bg: #f6f8fa; --link: #0366d6; --rt: #555;
    --find-bg: #ffe58f; --find-cur-bg: #ffb84d;
  }
  html.dark {
    --fg: #e6e6e6; --bg: #151515; --muted: #9aa0a6; --border: #333;
    --code-bg: #1e1e1e; --link: #5aa9ff; --rt: #bcc2c9;
    --find-bg: #5c4a00; --find-cur-bg: #b8860b;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--bg);
    color: var(--fg);
    -webkit-text-size-adjust: 100%;
  }
  .md {
    padding: 16px 18px 60px;
    font-family: -apple-system, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", sans-serif;
    font-size: 17px;
    line-height: 1.75;
    word-break: break-word;
    overflow-wrap: anywhere;
  }
  .md h1, .md h2, .md h3, .md h4 { line-height: 1.35; margin: 1.4em 0 0.6em; font-weight: 700; }
  .md h1 { font-size: 1.7em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
  .md h2 { font-size: 1.4em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
  .md h3 { font-size: 1.2em; }
  .md h4 { font-size: 1.05em; }
  .md p { margin: 0.7em 0; }
  .md a { color: var(--link); text-decoration: none; }
  .md blockquote {
    margin: 0.8em 0;
    padding: 0.2em 1em;
    color: var(--muted);
    border-left: 4px solid var(--border);
  }
  .md ul, .md ol { padding-left: 1.5em; margin: 0.6em 0; }
  .md li { margin: 0.2em 0; }
  .md hr { border: none; border-top: 1px solid var(--border); margin: 1.5em 0; }
  .md img { max-width: 100%; height: auto; }
  .md table { border-collapse: collapse; margin: 0.8em 0; display: block; overflow-x: auto; }
  .md th, .md td { border: 1px solid var(--border); padding: 6px 12px; }
  .md th { background: var(--code-bg); }

  /* inline code */
  .md code {
    font-family: "SF Mono", ui-monospace, Menlo, monospace;
    font-size: 0.9em;
    background: var(--code-bg);
    padding: 0.15em 0.4em;
    border-radius: 5px;
  }
  /* code block */
  .md pre {
    background: var(--code-bg);
    padding: 12px 14px;
    border-radius: 8px;
    overflow-x: auto;
    line-height: 1.5;
  }
  .md pre code { background: transparent; padding: 0; font-size: 0.85em; }

  /* 프리뷰 내 찾기 하이라이트 */
  mark.__find { background: var(--find-bg); color: inherit; border-radius: 3px; padding: 0 1px; }
  mark.__find.__cur { background: var(--find-cur-bg); }

  /* ruby / furigana */
  .md ruby { ruby-align: center; }
  .md rt {
    font-size: 0.55em;
    color: var(--rt);
    line-height: 1;
    user-select: none;
  }

  /* highlight.js token colors (github light/dark 간소화 버전) */
  ${hljsLightCss()}
  ${hljsDarkCss()}
  `;
}

function hljsLightCss(): string {
  return `
  .hljs-comment, .hljs-quote { color: #6a737d; font-style: italic; }
  .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-type { color: #d73a49; }
  .hljs-string, .hljs-attr, .hljs-regexp, .hljs-addition { color: #032f62; }
  .hljs-number, .hljs-built_in, .hljs-builtin-name { color: #005cc5; }
  .hljs-title, .hljs-section, .hljs-function .hljs-title { color: #6f42c1; }
  .hljs-name, .hljs-tag { color: #22863a; }
  .hljs-attribute { color: #005cc5; }
  .hljs-variable, .hljs-template-variable { color: #e36209; }
  .hljs-deletion { color: #b31d28; }
  .hljs-emphasis { font-style: italic; }
  .hljs-strong { font-weight: bold; }
  `;
}

function hljsDarkCss(): string {
  // html.dark 스코프 — 라이트 규칙 뒤에 함께 포함되므로 프리픽스가 필수
  return `
  html.dark .hljs-comment, html.dark .hljs-quote { color: #8b949e; font-style: italic; }
  html.dark .hljs-keyword, html.dark .hljs-selector-tag, html.dark .hljs-literal, html.dark .hljs-type { color: #ff7b72; }
  html.dark .hljs-string, html.dark .hljs-attr, html.dark .hljs-regexp, html.dark .hljs-addition { color: #a5d6ff; }
  html.dark .hljs-number, html.dark .hljs-built_in, html.dark .hljs-builtin-name { color: #79c0ff; }
  html.dark .hljs-title, html.dark .hljs-section, html.dark .hljs-function .hljs-title { color: #d2a8ff; }
  html.dark .hljs-name, html.dark .hljs-tag { color: #7ee787; }
  html.dark .hljs-attribute { color: #79c0ff; }
  html.dark .hljs-variable, html.dark .hljs-template-variable { color: #ffa657; }
  html.dark .hljs-deletion { color: #ffdcd7; }
  `;
}
