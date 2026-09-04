import type { Ref } from 'react';
import type { ThemeName } from './theme';

/** 플랫폼 구현(MarkdownPreview.tsx / .web.tsx)이 공유하는 인터페이스 */
export interface MarkdownPreviewHandle {
  /** 헤딩 앵커(id="hl-<line>")로 스크롤 */
  scrollToHeading(line: number): void;
}

export interface MarkdownPreviewProps {
  content: string;
  theme: ThemeName;
  /** 프리뷰 내 찾기 쿼리. 빈 문자열이면 하이라이트 제거 */
  findQuery: string;
  findIndex: number;
  /** DOM 기준 매치 수 통지 */
  onFindCount: (count: number) => void;
  backgroundColor: string;
  ref?: Ref<MarkdownPreviewHandle>;
}
