import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { renderMarkdownDocument } from './markdown';
import type { MarkdownPreviewProps } from './MarkdownPreviewTypes';

/** 네이티브(iOS) 프리뷰: WebView + injectJavaScript */
export default function MarkdownPreview({
  content,
  theme,
  hideRuby,
  findQuery,
  findIndex,
  onFindCount,
  backgroundColor,
  ref,
}: MarkdownPreviewProps) {
  const webviewRef = useRef<WebView>(null);

  // 테마는 마운트 시점 문서에만 굽는다. 이후 전환은 __setTheme 로 클래스만
  // 바꿔야 html 재생성(=WebView 리로드=스크롤 소실)이 일어나지 않는다.
  // 요미가나 가리기도 같은 방식 (__setHideRuby)
  const [initialTheme] = useState(theme);
  const [initialHideRuby] = useState(hideRuby);
  const html = useMemo(
    () => renderMarkdownDocument(content, initialTheme, { hideRuby: initialHideRuby }),
    [content, initialTheme, initialHideRuby]
  );
  const applyTheme = useCallback((t: string) => {
    webviewRef.current?.injectJavaScript(`window.__setTheme && window.__setTheme(${JSON.stringify(t)}); true;`);
  }, []);
  useEffect(() => {
    applyTheme(theme);
  }, [applyTheme, theme]);
  const applyHideRuby = useCallback((h: boolean) => {
    webviewRef.current?.injectJavaScript(`window.__setHideRuby && window.__setHideRuby(${h}); true;`);
  }, []);
  useEffect(() => {
    applyHideRuby(hideRuby);
  }, [applyHideRuby, hideRuby]);

  const runFind = useCallback((query: string, index: number) => {
    webviewRef.current?.injectJavaScript(
      `window.__find && window.__find(${JSON.stringify(query)}, ${index}); true;`
    );
  }, []);

  // 찾기 상태가 바뀌면 WebView에 반영 (빈 쿼리는 하이라이트 제거).
  // 요미가나를 가리거나 보이면 찾기 대상이 달라지므로 다시 찾는다
  useEffect(() => {
    runFind(findQuery, findIndex);
  }, [runFind, findQuery, findIndex, hideRuby]);

  useImperativeHandle(ref, () => ({
    scrollToHeading(line: number) {
      webviewRef.current?.injectJavaScript(
        `document.getElementById('hl-${line}')?.scrollIntoView({behavior:'smooth',block:'start'}); true;`
      );
    },
  }));

  return (
    <WebView
      ref={webviewRef}
      originWhitelist={['*']}
      style={{ backgroundColor }}
      source={{ html }}
      // 노트 속 링크는 Safari로 열고, WebView 자체가 외부로 이동하는 것은 차단
      onShouldStartLoadWithRequest={(req) => {
        if (req.url.startsWith('http://') || req.url.startsWith('https://')) {
          Linking.openURL(req.url);
          return false;
        }
        return true;
      }}
      showsVerticalScrollIndicator
      onMessage={(e) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === 'findCount') onFindCount(msg.count);
        } catch {
          // 무시
        }
      }}
      onLoadEnd={() => {
        // WebView는 Preview 진입마다 재로드되므로 테마·찾기 상태를 다시 적용
        applyTheme(theme);
        applyHideRuby(hideRuby);
        if (findQuery) runFind(findQuery, findIndex);
      }}
    />
  );
}
