# Justdown — 개발 문서

일본어 학습에 특화된 **후리가나 마크다운 노트 앱**.

한자 위에 요미가나(후리가나)를 얹는 `<ruby>` 렌더링을 제대로 지원하는 것이 핵심 기능이다.
서버·계정·동기화 없이 모든 데이터를 기기 로컬에 저장한다.

| | |
|---|---|
| 플랫폼 | iOS / iPad (Expo), macOS (Expo Web + Tauri) |
| Bundle ID | `com.hyungwonlabs.justdown` |
| 배포 | iOS: EAS Build → App Store / macOS: `tauri build` → .app/.dmg (로컬 배포) |
| 저장소 | AsyncStorage (기기 로컬 — 웹/Tauri에서는 localStorage 백엔드) |
| 언어 | ko / ja / en (시스템 언어 따름) |

## 출시 이력

- **1.0 → 1.0.1**: App Store 출시 (iPhone 전용). 1.0.1에서 앱 이름 "Justdown (ccf904)" → "Justdown" 정정
- **1.1.0** (2026-09-05 제출): iPad 지원, 다국어(ko/ja/en), 버그픽스, `CFBundleDevelopmentRegion: ko`
- **1.2 (계획)**: iCloud 동기화 — 아래 [향후 계획](#향후-계획-12-icloud-동기화) 참고

---

## 후리가나 문법

### 기본 — 아오조라(青空文庫)/픽시브 표기법

```
漢字《かんじ》を読む
```

`《 》` 바로 앞의 **한자 연속**이 베이스가 되어 위에 요미가나가 붙는다.

| 입력 | 결과 |
|---|---|
| `漢字《かんじ》` | 漢字 위에 かんじ |
| `明日《あした》は雨` | 明日 위에 あした |

### 베이스 경계 지정 — `｜`

베이스에 한자 이외 문자(히라가나 등)가 포함되거나 시작점을 명시하고 싶을 때:

```
｜お茶《おちゃ》
｜締め切り《しめきり》   ← り가 히라가나라 ｜ 없이는 변환되지 않는다
```

`｜`(전각) 또는 `|`(반각)부터 `《` 직전까지가 베이스가 된다.

### 정석 HTML ruby 태그

`html: true` 설정이므로 직접 쓴 태그도 그대로 렌더링된다 (복붙 대응):

```html
<ruby>手<rt>て</rt></ruby>
```

### 안전 규칙

- 인용부호 **`「」` / `『』`는 절대 변환하지 않는다** — 일본어 인용 용도로 자유롭게 사용 가능
- **인라인 코드/코드블록 안의 `《》`는 변환하지 않는다** (inline 파싱 후 text 토큰만 변환)
- `《 》`가 후리가나 구분자로 채택된 이유: 일반 문장에서 거의 쓰이지 않아 충돌이 없고, 일본 전자책 생태계의 사실상 표준 표기법이기 때문

---

## 마크다운 지원 범위

markdown-it 기반. GFM 스타일:

- 헤딩(`#`~`######`), 볼드/이탤릭, 리스트, 인용구, 구분선, 링크(autolink 포함), 이미지, 표
- 코드블록 구문강조: ` ```js ` 처럼 언어 지정 시 highlight.js 적용
- `breaks: true` — 단순 줄바꿈도 `<br>`로 (메모 앱에 자연스러운 동작)
- `html: true` — 직접 HTML 태그 사용 가능 (개인용 앱이므로 XSS 고려 불필요.
  웹 배포·공유 기능을 추가하게 되면 재검토 필요 — 특성화 테스트로 의도를 고정해 둠)

---

## 레이아웃 규칙 (멀티 폼팩터)

플랫폼이 아니라 **창 너비 + 방향** 기준으로 분기한다 (`App.tsx`):

```
wide = 너비 ≥ 700 && 너비 > 높이(가로형)
```

| 상황 | 레이아웃 |
|---|---|
| iPhone | 리스트 → push 네비게이션 (세로 고정) |
| iPad 세로 | 리스트 → push (너비와 무관하게 세로형은 무조건) |
| iPad 가로 | 사이드바 + 편집기 2-pane |
| iPad Split View 절반 | 자동으로 push 모드 (너비 < 700) |
| macOS/웹 | 창 비율에 따라 동일 규칙 |

화면은 **Pane(코어)과 Screen(래퍼)으로 분리** — `NoteListPane`/`NoteEditPane`이 실제 UI를 담당하고,
좁은 화면에선 `NoteListScreen`/`NoteEditScreen`이, 와이드 모드에선 `TwoPaneScreen`이 감싼다.

iOS 회전 설정: iPhone은 세로 고정(`UISupportedInterfaceOrientations`), iPad는 전 방향(`~ipad` 키).
`orientation` 필드는 `default` — Expo Go가 매니페스트 값으로 런타임 잠금을 걸기 때문
(infoPlist 키는 실빌드에만 적용된다).

---

## 화면 구성

### 노트 목록 (좁은 화면)

- 노트 리스트: 제목(내용 첫 줄에서 파생) + 미리보기 한 줄
- **＋** / **🌙·☀️**: 새 노트 / 테마 전환 (헤더)
- **검색바**: 제목+내용 대상 전체 검색 (iOS 네이티브 헤더 검색바, `placement: automatic`)
- 노트 **스와이프/롱프레스**: 삭제

### 와이드 모드 (2-pane)

- 왼쪽 사이드바: 검색 + 목록 (창 너비 구간별 300/340/400px)
- 오른쪽 pane: 상단 바(Code|Preview 탭, 찾기·목차 버튼) + 편집기
- 웹/macOS는 행에 **⋯ 메뉴**(삭제) 노출 — 스와이프 발견성이 낮아서
- 열려 있는 노트를 목록에서 삭제하면 오른쪽 pane은 빈 상태로 전환

### 데스크톱 단축키 (웹/macOS)

| 키 | 동작 |
|---|---|
| ⌘N | 새 노트 (브라우저에선 예약키라 Tauri에서만 실효) |
| ⌘F | 노트 내 찾기 |
| ⌘K | 후리가나 괄호 《》 삽입 (Code 탭) |
| ⌘S | 브라우저 저장 다이얼로그 억제 (자동 저장이 있으므로) |
| Esc | 찾기/목차 패널 닫기 |

### 키보드 툴바 (Code 탭, iOS)

| 버튼 | 동작 |
|---|---|
| `《 》` | 후리가나 괄호 삽입, 커서가 가운데로 |
| `｜` | 베이스 경계 문자 |
| `H` / `•` / `B` / `</>` | 헤딩 / 리스트 / 볼드 / 코드블록 |

일본어 자판에서 `{}`·`[]`를 치기 어려운 문제(동일 키가 `『』`·`「」`로 입력됨)를 우회하기 위한 장치다.

### 찾기 (🔍) / 목차 (☰)

- 찾기: 대소문자 무시, 매치 수 `n/m`, ↑/↓ 순환. Code 탭=커서 이동, Preview 탭=`<mark>` 하이라이트
- 목차: ATX 헤딩 아웃라인 (코드블록 안 제외, 후리가나 요미 제거). 탭하면 해당 위치로 이동

---

## 프로젝트 구조

```
App.tsx                  네비게이션·테마 컨텍스트, 레이아웃 분기(창 너비+방향)
index.ts                 엔트리 (Expo registerRootComponent)
app.json                 Expo 설정 (iPad 회전, CFBundleLocalizations 등)
eas.json                 EAS 빌드/제출 프로파일 (ascAppId 포함)
src/
  markdown.ts            markdown-it 설정, 후리가나 규칙, 헤딩 추출/앵커,
                         프리뷰 HTML 문서 생성(양 테마 CSS + __setTheme/__find 스크립트)
  storage.ts             노트/테마 CRUD (AsyncStorage 래핑), 제목 파생,
                         소프트 삭제(tombstone) + 구버전 블롭 마이그레이션
  i18n.ts, locales/      expo-localization + i18n-js (ko/ja/en, en 폴백)
  theme.ts               라이트/다크 색상 팔레트 + ThemeContext
  navigation.ts          네비게이션 파라미터 타입
  NoteListPane.tsx       노트 목록 코어 (좁은 화면·와이드 공용, 웹 ⋯ 메뉴)
  NoteEditPane.tsx       편집기 코어 (탭·툴바·찾기·목차·자동 저장)
  NoteListScreen.tsx     좁은 화면용 목록 래퍼 (네이티브 헤더 검색바)
  NoteEditScreen.tsx     좁은 화면용 편집 래퍼
  TwoPaneScreen.tsx      와이드 2-pane + 데스크톱 단축키
  EditHeader.tsx         Code|Preview 탭·찾기·목차 버튼 (공용)
  MarkdownPreview.tsx    네이티브 프리뷰 (WebView + injectJavaScript)
  MarkdownPreview.web.tsx  웹 프리뷰 (srcdoc iframe — 플랫폼 분기)
  __tests__/             단위 테스트 (markdown·storage·i18n)
src-tauri/               macOS 데스크톱 래퍼 (Rust, Tauri 2)
docs/screenshots/        README용 스크린샷
```

### 데이터 모델

```ts
interface Note {
  id: string;        // "타임스탬프-난수"
  content: string;   // 마크다운 원문 (제목은 첫 줄에서 파생, 별도 필드 없음)
  updatedAt: number;
  deletedAt?: number; // 소프트 삭제 시각. 있으면 tombstone (목록/조회에서 제외)
}
```

AsyncStorage 키: `justdown.note.<id>` (노트당 1키), `justdown.theme`

- **소프트 삭제**: 키를 지우지 않고 tombstone을 남긴다 — 동기화 대비.
  **tombstone은 `saveNote`로 부활하지 않는다** (삭제 직후 에디터 unmount flush가
  덮어쓰는 경쟁을 저장 계층에서 차단)
- **마이그레이션**: 구버전 단일 블롭(`justdown.notes`)을 발견하면 노트별 키로 분해 (자동, 1회)
- 목록은 `updatedAt` 내림차순. 빈 노트는 저장하지 않으며, 기존 노트를 비우면 삭제
- 웹/Tauri에서 AsyncStorage는 localStorage 백엔드 — **dev 서버(localhost:8081)와
  프로덕션(tauri:// 오리진)은 저장소가 분리**되어 데이터가 서로 넘어가지 않는다

---

## 다국어 (i18n)

- `expo-localization` + `i18n-js`. 시스템 언어 따름(선택 UI 없음), 미지원 언어는 `en` 폴백
- `src/locales/{ko,ja,en}.json` — 키 동일성은 테스트로 고정
- 에디터 플레이스홀더의 후리가나 예시(`漢字《かんじ》`)는 전 언어 유지 (테스트로 고정)
- `CFBundleLocalizations: [ko, ja, en]` + `CFBundleDevelopmentRegion: ko` — 스토어 언어 표기용

---

## macOS 데스크톱 (Tauri)

Expo Web 번들을 Tauri 2로 래핑. 산출물 ~4MB(.dmg).

```bash
npx tauri dev     # 개발 (Rust 툴체인 필요: rustup)
npx tauri build   # .app / .dmg (src-tauri/target/release/bundle/)
```

- devUrl=`localhost:8081`(expo web), frontendDist=`dist`(`expo export -p web`)
- 창 1100×760, identifier는 iOS와 동일
- 미서명(로컬 실행용) — 배포하려면 Developer ID 서명·공증 또는 Mac App Store 절차 필요
- **Tauri 웹뷰는 Metro HMR이 동작하지 않는다** — 코드 반영은 앱 재시작 필요
- react-native-macos는 Expo 통합 마찰이 커서 배제했다

---

## 개발

### 요구사항

- Node.js 20.19.4+ 권장 / Xcode + iOS 시뮬레이터 또는 Expo Go / (macOS 빌드 시) Rust

### 실행·검증

```bash
npm install
npx expo start        # i = iOS 시뮬레이터, w = 웹

npm test              # 단위 테스트 (jest-expo)
npm run typecheck     # tsc --noEmit
npm run lint          # expo lint
```

- jest는 **29.x로 고정** — `@react-native/jest-preset`(RN 0.86)이 jest 29 런타임을 쓰므로
  jest 30을 설치하면 `clearMocksOnScope` 오류로 깨진다
- WebKit(Safari/Tauri) 전용 렌더링·이벤트 버그는 **Playwright WebKit으로 재현**하는 패턴이 유효했다
  (localStorage 시딩 → UI 조작 → 지오메트리/스크린샷 검증)

### 배포 (iOS)

```bash
eas build --platform ios --profile production   # 빌드번호 autoIncrement
eas submit -p ios --latest                      # ascAppId는 eas.json에 설정됨
```

- EAS 빌드는 **미커밋 워킹 트리를 포함**한다 — 프로덕션 빌드 전 `git status` 클린 확인 필수
- 스토어 스크린샷: 시뮬레이터 ⌘S로 기기 해상도 저장 (iPad는 13인치 2064×2752 필수 규격).
  데모 노트는 App.tsx에 임시 시딩 코드로 준비 (커밋 금지)

---

## 향후 계획: 1.2 iCloud 동기화

브레인스토밍으로 확정된 방향 (2026-09-05). 설계·구현은 1.1 출시 후.

- **범위**: iPhone ↔ iPad만 (macOS Tauri는 미서명이라 iCloud 접근이 까다로워 제외)
- **방식**: CloudKit private DB + 커스텀 Expo 네이티브 모듈(Swift) — 노트 1개 = CKRecord 1개
- **트리거**: 앱 시작·포그라운드 복귀·저장 후 폴링 (silent push는 APNs 의존이라 배제 — 푸시 미도입 방침과 충돌)
- **충돌**: 노트 단위 LWW (`updatedAt` 비교), tombstone도 동일 규칙
- **UX**: 자동 동기화(무설정, Apple 순정 앱 관례). 포지셔닝은 "자체 서버 없음·수집 없음"으로 조정
- 네이티브 모듈 도입 시 Expo Go 개발 불가 → dev build 워크플로우 전환 필요

## 향후 계획: 자동 후리가나 (방향만 확정)

- **엔진**: MeCab + UniDic 온디바이스 (Expo Modules API, iOS 우선) — 로컬 온리 정체성 유지
- **사전 배포**: 앱 번들에 포함하지 않고 설치 후 온디맨드 다운로드
- **UX**: Code 탭의 변환 버튼 → 노트 전체 한 번에 한자에 《요미》를 소스로 삽입.
  이미 《》가 붙은 한자는 건너뜀
- **선택적 요미 표시**: 제외 단어 사전 → JLPT 급수 필터 → Preview 암기 모드 순으로 단계 확장

---

## 구현 노트 (트러블슈팅 이력)

버그 수정 시 참고할 것. 재발 방지 근거가 담겨 있다.

### Tauri (WKWebView) 래핑에서 잡은 것들

- **`window.confirm`은 no-op** — WKWebView 기반 Tauri 웹뷰는 JS 블로킹 다이얼로그를
  구현하지 않아 항상 falsy를 반환한다. confirm 기반 삭제 확인이 조용히 죽는 원인.
  웹 삭제는 ⋯ 메뉴 2단계 조작이므로 즉시 삭제로 통일했다 (tombstone이라 즉시 소실도 아님)
- **전역 단축키는 capture 단계로 등록** — react-native-web `TextInput`의 `handleKeyDown`이
  keydown을 무조건 `stopPropagation` 하므로, 에디터 포커스 중엔 document의 bubble 리스너가
  아예 실행되지 않는다 (Chrome에선 ⌘F가 브라우저 찾기로 넘어가 눈치채기 어려웠던 잠복 버그)
- **팝오버 zIndex는 FlatList 셀에 줘야 한다** — 셀 래퍼가 `z-index:0` stacking context를
  만들어, 행에 zIndex를 줘도 셀 컨텍스트에 갇혀 다음 셀이 팝오버를 덮는다 (마지막 행만
  정상이던 증상). `CellRendererComponent`로 메뉴가 열린 셀 자체를 끌어올린다
- **테마 전환 시 프리뷰 문서를 재생성하지 않는다** — 테마가 srcdoc/html에 구워져 있으면
  전환마다 iframe/WebView가 리로드되어 스크롤이 소실된다. CSS 변수로 양 테마를 한 문서에
  담고 `__setTheme`로 html 클래스만 전환. 문서는 content 변경 때만 재생성(useMemo)
- **Tauri 웹뷰는 HMR 미동작** — Fast Refresh를 기대하지 말고 앱을 재시작할 것
- 진단 팁: 웹뷰 콘솔 로그는 로드 시점 이후 중계되지 않는다 — keydown 등 런타임 이벤트는
  로컬 수집 서버(`fetch`로 전송)를 임시로 심는 편이 확실하다

### Expo Go / 시뮬레이터

- **Expo Go는 매니페스트의 `orientation` 값으로 런타임 회전 잠금을 건다** — infoPlist의
  기기별 회전 키는 실빌드에만 적용되므로, 회전 테스트를 하려면 `orientation: default`가 필요
- 스토어 스크린샷 규격: iPad는 **13인치**(2064×2752)가 필수 클래스 — 11인치로 찍으면 반려됨
- 상태바 정리: `xcrun simctl status_bar booted override --time "9:41" --batteryLevel 100 ...`

### InputAccessoryView (키보드 툴바)

- `nativeID`는 **화면 인스턴스마다 유니크해야 한다** (`useRef`로 마운트당 생성).
  고정 문자열을 쓰면 화면 재마운트 시 이전 등록과 충돌해 툴바가 붙지 않는다
- 탭 전환 시 `TextInput`을 **언마운트하지 말고 숨긴다**. 재마운트되면 액세서리 연결이 끊긴다
- `TextInput`은 **InputAccessoryView와 같은 첫 렌더 커밋에 마운트해야 한다**.
  로드가 느린 긴 노트일수록 재현되어 "특정 노트에서만 툴바가 안 나오는" 증상이 됐다.
  그래서 빈 값으로 즉시 마운트하고 내용은 나중에 채운다
- 숨김은 `display:'none'`이 아니라 **0-크기 + opacity 0**으로 한다.
  display none은 네이티브 뷰가 히에라키에서 빠져 액세서리 연결이 유지되지 않는다

### 키보드/검색바/커서

- 헤더가 있는 화면의 `KeyboardAvoidingView`에는 `useHeaderHeight()`를
  `keyboardVerticalOffset`으로 줘야 한다
- iOS 26부터 네이티브 검색 필드가 화면 하단에 상주한다 — 하단 절대위치 요소(FAB)와 겹치므로
  액션 버튼은 헤더에 배치. `cancelButtonText`는 iOS 26부터 무시됨 (구버전용 유지)
- `TextInput`은 평소 uncontrolled selection으로 두고(입력 중 커서 튐 방지),
  툴바 삽입/찾기 이동 직후에만 `selection`을 잠깐 제어한 뒤 해제한다

### 프리뷰 찾기

- WebView는 Preview 진입마다 재로드되므로 `onLoadEnd`에서 테마·찾기 상태를 재적용한다
- 매치 수는 DOM 기준으로 세서 `postMessage`로 RN에 돌려준다
