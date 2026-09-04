import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import { renderMarkdownDocument } from './markdown';
import type { MarkdownPreviewProps } from './MarkdownPreviewTypes';

/** 네이티브(iOS) 프리뷰: WebView + injectJavaScript */
export default function MarkdownPreview({
  content,
  theme,
  findQuery,
  findIndex,
  onFindCount,
  backgroundColor,
  ref,
}: MarkdownPreviewProps) {
  const webviewRef = useRef<WebView>(null);

  const runFind = useCallback((query: string, index: number) => {
    webviewRef.current?.injectJavaScript(
      `window.__find && window.__find(${JSON.stringify(query)}, ${index}); true;`
    );
  }, []);

  // 찾기 상태가 바뀌면 WebView에 반영 (빈 쿼리는 하이라이트 제거)
  useEffect(() => {
    runFind(findQuery, findIndex);
  }, [runFind, findQuery, findIndex]);

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
      source={{ html: renderMarkdownDocument(content, theme) }}
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
        // WebView는 Preview 진입마다 재로드되므로 찾기 상태를 다시 적용
        if (findQuery) runFind(findQuery, findIndex);
      }}
    />
  );
}
