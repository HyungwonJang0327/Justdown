import { useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { renderMarkdownDocument } from './markdown';
import type { MarkdownPreviewProps } from './MarkdownPreviewTypes';

/** 문서 스크립트(markdown.ts)가 iframe window에 노출하는 API */
type PreviewWindow = Window & { __find?: (query: string, index: number) => void };

/** 웹 프리뷰: srcdoc iframe. 같은 HTML 문서를 재사용하고 __find를 직접 호출한다. */
export default function MarkdownPreview({
  content,
  theme,
  findQuery,
  findIndex,
  onFindCount,
  backgroundColor,
  ref,
}: MarkdownPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const runFind = useCallback(
    (query: string, index: number) => {
      const win = frameRef.current?.contentWindow as PreviewWindow | null | undefined;
      if (!win?.__find) return;
      win.__find(query, index);
      onFindCount(win.document.querySelectorAll('mark.__find').length);
    },
    [onFindCount]
  );

  // 찾기 상태가 바뀌면 iframe에 반영 (빈 쿼리는 하이라이트 제거)
  useEffect(() => {
    runFind(findQuery, findIndex);
  }, [runFind, findQuery, findIndex]);

  useImperativeHandle(ref, () => ({
    scrollToHeading(line: number) {
      frameRef.current?.contentWindow?.document
        .getElementById(`hl-${line}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  }));

  return (
    <iframe
      ref={frameRef}
      title="preview"
      srcDoc={renderMarkdownDocument(content, theme)}
      style={{ flex: 1, width: '100%', border: 'none', backgroundColor }}
      onLoad={() => {
        // srcdoc 변경 시 재로드되므로 찾기 상태를 다시 적용
        if (findQuery) runFind(findQuery, findIndex);
      }}
    />
  );
}
