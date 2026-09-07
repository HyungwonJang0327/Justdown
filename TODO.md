# TODO

Justdown 업데이트 후보 목록. 우선순위·상태를 함께 적는다.
상세 설계·이력은 `docs/DEVELOPMENT.md` 참고.

## 🟢 즉시 / 정리성

- [x] `docs/DEVELOPMENT.md`의 "향후 계획: 자동 후리가나" 문단 정리 (기능 폐기됨 — "폐기" 표시로 변경)
- [ ] 1.1.1 심사 통과 후 출시 확정 처리

## 🔵 다음 메이저: 1.2 iCloud 동기화 (합의됨, 미착수)

사용자 편익이 가장 큰 항목. 착수 시 **상세 설계 문서부터** 작성한다.

- [ ] CloudKit private DB + 커스텀 Expo 네이티브 모듈(Swift) — 노트 1개 = CKRecord 1개
- [ ] 범위: iPhone ↔ iPad만 (macOS 제외), 노트 단위 LWW (`updatedAt` 비교, tombstone 동일 규칙)
- [ ] 트리거: 앱 시작·포그라운드 복귀·저장 후 폴링 (silent push 배제 — 푸시 미도입 방침과 충돌)
- [ ] ⚠️ Expo Go 테스트 불가 → dev build 워크플로우 전환
- [ ] 패키지 교체 커밋(`markdown-it-aozora-ruby` 도입)도 이 릴리스에 얹어 출시

## 🟡 자체 점검 잔여 버그·개선 (미수정)

- [ ] iPad 회전 시 편집 컨텍스트 유실 — `selectedId` 리프팅 필요 (구조 변경이라 1.2 이후 권장)
- [x] 네이티브 검색바·사이드바 검색 테마 불일치 — headerSearchBarOptions에 textColor·hintTextColor·tintColor 추가, 사이드바 검색에 keyboardAppearance 추가
- [x] 앱 시작 시 라이트 플래시 — expo-splash-screen으로 테마 로드까지 스플래시 유지 후 렌더
- [ ] 테마 토글 시 에디터 포커스·스크롤 리셋 — `key={theme}` 트레이드오프 (현재 수용, 재검토 여지)
- [x] tombstone GC 없음 — purgeTombstones(TTL 30일) 추가, 앱 시작 시 1회 호출

## 🟠 크로스플랫폼 확장 (선택, 급하지 않음)

- [ ] Android 지원 — 에디터 툴바가 iOS 전용 `InputAccessoryView`라 Android에서 `《》` 툴바 미표시 → Android 툴바 대체 필요. `app.json` android 블록 + `eas.json` android 프로필 추가. (Google Play 개발자 인증 마감과는 무관 확인됨)
- [ ] macOS Tauri 마무리 보류분 — 사이드바 드래그 리사이즈 / iframe 클릭 시 ⋯ 메뉴 안 닫힘 / 세로 창 push 모드 분리 / 배포 시 서명·공증 (현재 미서명 로컬용)

## ⚪ 기술 부채 (관찰, 트리거 시 대응)

- [ ] `markdown.ts`의 `html: true` — raw HTML 통과(의도된 설계, 특성화 테스트 있음). 웹/공유 기능 추가 시 XSS 재검토 필요

---

추천 순서: 🟢 정리 → 🔵 1.2 iCloud(핵심, 그 안에서 🟡 검색바 테마·tombstone GC 같이) → 🟠 Android는 여유될 때.
