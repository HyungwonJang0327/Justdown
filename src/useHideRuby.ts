import { useCallback, useEffect, useState } from 'react';
import { loadHideRuby, saveHideRuby } from './storage';

/** 노트별 요미가나 가리기 상태와 토글. 헤더(버튼) 소유자가 쓰고 값은 pane 으로 내려준다.
 *  hidden 이 null 이면 로드 중 — 프리뷰가 요미가나를 보였다가 가리는 깜빡임을 막으려고
 *  pane 은 값이 정해질 때까지 프리뷰를 띄우지 않는다. */
export function useHideRuby(id: string | null): [hidden: boolean | null, toggle: () => void] {
  // 로드 결과에 노트 ID 를 같이 담아, 노트 전환 직후 이전 노트 값이 새 노트에 쓰이지 않게 한다
  const [state, setState] = useState<{ id: string; hidden: boolean } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    loadHideRuby(id)
      .catch(() => false)
      .then((hidden) => {
        if (!cancelled) setState({ id, hidden });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const hidden = state && state.id === id ? state.hidden : null;

  const toggle = useCallback(() => {
    if (!id || hidden == null) return;
    setState({ id, hidden: !hidden });
    saveHideRuby(id, !hidden);
  }, [id, hidden]);

  return [hidden, toggle];
}
