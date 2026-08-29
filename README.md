# Justdown

일본어 학습에 특화된 **개인용 iOS 마크다운 메모 앱**.

한자 위에 요미가나(후리가나)를 얹는 `<ruby>` 렌더링을 제대로 지원하는 것이 핵심 기능이다.
서버·계정·동기화 없이 모든 데이터를 기기 로컬에 저장한다.

| | |
|---|---|
| 플랫폼 | iOS 전용 (Expo / React Native) |
| Bundle ID | `com.hyungwonlabs.justdown` |
| 배포 | EAS Build → TestFlight (내부 테스트) |
| 저장소 | AsyncStorage (기기 로컬) |

---

## 주요 기능

- **마크다운 편집 + 미리보기**: 편집 화면 상단의 `Code` | `Preview` 탭으로 전환
- **후리가나(요미가나)**: 아오조라 문고 표기법 `漢字《かんじ》` → 진짜 `<ruby>` 태그로 렌더링
- **코드 구문강조**: highlight.js (라이트/다크 테마 대응)
- **키보드 툴바**: `《 》`·`｜` 등 자주 쓰는 기호를 탭 한 번으로 삽입
- **검색**: 노트 목록 전체 검색 + 현재 노트 내 찾기 (Code/Preview 양쪽 지원)
- **목차(☰)**: 헤딩 아웃라인 패널 → 탭하면 해당 섹션으로 점프
- **자동 저장**: 입력 후 0.5초 디바운스 저장, 화면 이탈 시 즉시 저장
- **라이트/다크 테마**: 앱 내 토글, 선택값 저장

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

베이스에 한자 이외 문자가 포함되거나 시작점을 명시하고 싶을 때:

```
｜お茶《おちゃ》
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
- `html: true` — 직접 HTML 태그 사용 가능 (개인용 앱이므로 XSS 고려 불필요)

---

## 화면 구성

### 노트 목록

- 노트 리스트: 제목(내용 첫 줄에서 파생) + 미리보기 한 줄
- **＋** (헤더 우상단): 새 노트
- **🌙/☀️** (헤더 좌상단): 테마 전환
- **검색바**: 제목+내용 대상 전체 검색
  - iOS 26+: 화면 하단에 배치 (OS 네이티브 동작)
  - iOS 18 이하: 헤더 아래 배치
  - `placement` 미지정(`automatic`)으로 OS별 네이티브 스타일을 따른다
- 노트 **롱프레스**: 삭제

### 노트 편집

- 헤더 가운데: `Code` | `Preview` 탭
- 헤더 우측: **🔍** (찾기), **☰** (목차)
- **Code 탭**: 모노스페이스 에디터 + 키보드 위 툴바
- **Preview 탭**: WebView 렌더링 (로컬 HTML 문자열 — 네트워크/서버 불필요)

### 키보드 툴바 (Code 탭)

| 버튼 | 동작 |
|---|---|
| `《 》` | 후리가나 괄호 삽입, 커서가 가운데로 |
| `｜` | 베이스 경계 문자 |
| `H` | `# ` (헤딩) |
| `•` | `- ` (리스트) |
| `B` | `****` 삽입, 커서가 가운데로 |
| `</>` | 코드블록 삽입, 커서가 안쪽으로 |

일본어 자판에서 `{}`·`[]`를 치기 어려운 문제(동일 키가 `『』`·`「」`로 입력됨)를 우회하기 위한 장치다.

### 찾기 (🔍)

- 대소문자 무시, 매치 수 `n/m` 표시, ↑/↓로 순환 이동
- **Code 탭**: 매치 위치로 커서(selection) 이동 + 하이라이트
- **Preview 탭**: WebView 안에서 `<mark>` 하이라이트 (현재 매치는 강조색) + 부드러운 스크롤
- 목차 패널이 열린 상태에서 누르면 패널을 닫고 찾기를 활성화

### 목차 (☰)

- 문서의 ATX 헤딩(`#`~`######`)을 레벨별 들여쓰기로 표시 (코드블록 안 제외)
- 표시 텍스트에서 후리가나 요미·마크업 자동 제거 (`面接《めんせつ》` → `面接`)
- 탭하면: Preview = 해당 헤딩으로 스크롤 / Code = 해당 라인으로 커서 이동
- 탭 전환 또는 항목 선택 시 자동으로 닫힘

---

## 프로젝트 구조

```
App.tsx                  네비게이션 + 테마 컨텍스트 프로바이더
index.ts                 엔트리 (Expo registerRootComponent)
app.json                 Expo 설정 (bundle ID, 아이콘, EAS projectId 등)
eas.json                 EAS 빌드/제출 프로파일
src/
  markdown.ts            markdown-it 설정, 후리가나 규칙, 헤딩 추출/앵커,
                         HTML 문서 생성(테마 CSS + 프리뷰 찾기 스크립트 포함)
  storage.ts             노트/테마 CRUD (AsyncStorage 래핑), 제목 파생,
                         소프트 삭제(tombstone) + 구버전 블롭 마이그레이션
  __tests__/storage.test.ts  storage 단위 테스트 (jest-expo)
  theme.ts               라이트/다크 색상 팔레트 + ThemeContext
  navigation.ts          네비게이션 파라미터 타입
  NoteListScreen.tsx     노트 목록 (검색바, 헤더 버튼)
  NoteEditScreen.tsx     편집기 (탭, 툴바, 찾기, 목차 패널)
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

AsyncStorage 키:

| 키 | 내용 |
|---|---|
| `justdown.note.<id>` | `Note` JSON (노트당 1키) |
| `justdown.theme` | `"light"` \| `"dark"` |

- **소프트 삭제**: 삭제 시 키를 지우지 않고 `{ content: '', deletedAt }` tombstone을 남긴다.
  나중에 서버 동기화를 붙일 때 "이 기기에서 삭제됨"을 구분하기 위한 최소 준비다.
- **마이그레이션**: 구버전은 전체 노트를 `justdown.notes` 블롭 1개에 저장했다.
  `loadNotes()`가 블롭을 발견하면 노트별 키로 분해 저장 후 블롭을 제거한다 (자동, 1회).
- 목록은 `updatedAt` 내림차순(최신순)으로 반환된다.
- 빈 노트(공백만)는 저장하지 않으며, 기존 노트를 비우면 삭제된다.

---

## 개발

### 요구사항

- Node.js 20.19.4+ 권장 (20.17.0에서도 동작하나 Expo가 경고를 출력)
- Xcode + iOS 시뮬레이터 또는 실기기의 Expo Go 앱

### 실행

```bash
npm install
npx expo start        # 이후 i = iOS 시뮬레이터, 또는 Expo Go로 QR 스캔
```

### 검증

```bash
npm test                                                # 단위 테스트 (jest-expo)
npx tsc --noEmit                                        # 타입체크
npx expo export --platform ios --output-dir /tmp/out    # 번들 빌드 확인
npx expo-doctor                                         # 프로젝트 설정 점검
```

테스트는 `jest-expo` preset + AsyncStorage 공식 mock(`jest-setup.js`)을 사용한다.
jest는 **29.x로 고정** — `@react-native/jest-preset`(RN 0.86)이 jest 29 런타임을 쓰므로
jest 30을 설치하면 `clearMocksOnScope` 오류로 깨진다.
설치 시 peer 충돌은 `--legacy-peer-deps`로 우회한다 (react-native 0.86.2 ↔ jest-preset 0.86.3).

---

## 배포 (TestFlight)

유료 Apple Developer Program 멤버십 필요. 빌드번호는 `autoIncrement`로 자동 증가한다.

```bash
eas build --platform ios --profile production --auto-submit
```

- 인증서/프로비저닝은 EAS가 관리 (최초 1회 Apple 로그인 후 저장됨)
- `ITSAppUsesNonExemptEncryption: false`가 app.json에 있어 수출 규정 질문은 생략됨
- 업로드 후 App Store Connect 처리(수 분) → TestFlight 앱에서 설치
- 내부 테스트 그룹은 심사 없이 바로 설치 가능

---

## App Store 출시 점검 (2026-08-27)

빌드를 막는 결격 사유는 없음. 확인 완료 항목과 남은 항목:

### 통과

- 앱 아이콘 1024×1024, 알파 채널 없음
- `ITSAppUsesNonExemptEncryption: false` (수출 규정 질문 생략)
- 빌드번호 자동 관리 (`appVersionSource: remote` + `autoIncrement`)
- 권한/네트워크/추적 없음 → App Privacy는 "데이터 수집 안 함"으로 선언
- WebView 외부 링크: Safari로 열고 WebView 이탈 차단 (`onShouldStartLoadWithRequest`) — 2026-08-28 처리
- iPad: `supportsTablet: false`로 1.0 출시 — 2026-08-28 처리.
  **한번 iPad 지원으로 출시하면 업데이트에서 기기 지원을 축소할 수 없으므로**,
  미검증 상태로 켜는 대신 2-pane 레이아웃 완성 후 재활성화한다
- 스플래시: `expo-splash-screen` 플러그인 설정 (라이트 `#ffffff` / 다크 `#151515`) — 2026-08-28 처리
- 의존성 패치 정렬: expo 57.0.17 / react-native 0.86.3 (`expo-doctor` 18/18 통과) — 2026-08-28 처리

### 남은 항목

| 항목 | 내용 |
|---|---|
| 개인정보처리방침 URL | 수집 데이터가 없어도 URL 자체는 App Store Connect 필수 입력. GitHub Pages에 "수집 안 함" 페이지 게시 후 App Privacy에 입력 |
| 스크린샷·설명 | App Store Connect에 iPhone 스크린샷, 앱 설명(후리가나 지원 강조), 심사 연락처 입력 |

---

## 향후 계획: macOS 데스크톱 앱

브레인스토밍으로 확정된 방향 (2026-08-27):

- **목적**: 개인용/사이드 배포 (Mac App Store 심사 없음)
- **접근**: Expo Web 내보내기(`expo export -p web`) + **Tauri** 래핑 → .app/DMG
  - 코드베이스 하나 유지, 반응형 2-pane 레이아웃은 iPad 가로 모드에도 그대로 이득
  - react-native-macos는 Expo와 통합 마찰이 커서 배제
- **UX**: 사이드바 노트 목록 + 에디터·프리뷰 2-pane, ⌘N/⌘S/⌘F 단축키
- **동기화**: 당장 없음. 대비책으로 소프트 삭제(tombstone)만 도입 완료 (위 데이터 모델 참고)
  - 서버가 생기면 같은 코드를 웹앱으로도 배포 가능 (fetch/WebSocket은 래퍼 무관)

단계: ① 웹 타깃 구동 (WebView → iframe 분기) → ② 2-pane + 단축키 → ③ Tauri 래핑/패키징

---

## 구현 노트 (트러블슈팅 이력)

버그 수정 시 참고할 것. 재발 방지 근거가 담겨 있다.

### InputAccessoryView (키보드 툴바)

- `nativeID`는 **화면 인스턴스마다 유니크해야 한다** (`useRef`로 마운트당 생성).
  고정 문자열을 쓰면 화면 재마운트 시 이전 등록과 충돌해 툴바가 붙지 않는다.
- 탭 전환 시 `TextInput`을 **언마운트하지 말고 숨긴다**.
  재마운트되면 키보드 액세서리 연결이 끊긴다.
- `TextInput`은 **InputAccessoryView와 같은 첫 렌더 커밋에 마운트해야 한다**.
  내용 로드 완료 후(늦게) 마운트하면 연결이 안 생긴다 — 로드가 느린 긴 노트일수록 재현되어
  "특정 노트에서만 툴바가 안 나오는" 증상이 됐다. 그래서 빈 값으로 즉시 마운트하고 내용은 나중에 채운다.
- 숨김은 `display:'none'`이 아니라 **0-크기 + opacity 0**으로 한다.
  display none은 네이티브 뷰가 히에라키에서 빠져 액세서리 연결이 유지되지 않는다.

### 키보드가 문서 하단을 가리는 문제

- 헤더가 있는 화면의 `KeyboardAvoidingView`에는 `useHeaderHeight()` 값을
  `keyboardVerticalOffset`으로 줘야 한다. 없으면 헤더 높이만큼 계산이 어긋난다.

### iOS 26 검색바

- iOS 26부터 네이티브 검색 필드가 **화면 하단에 상주**한다 (`placement: 'automatic'` 기준).
  하단에 절대위치 요소(FAB 등)를 두면 겹치므로, 액션 버튼은 헤더에 배치한다.
- `placement: 'stacked'`로 모든 버전에서 상단 고정도 가능하지만, OS별 네이티브 스타일을 따르기로 결정했다.
- `cancelButtonText`는 iOS 26부터 무시된다 (취소 버튼에 텍스트가 없어짐). 구버전용으로 유지 중.

### 에디터 커서 제어

- `TextInput`은 평소 **uncontrolled selection**으로 두고(입력 중 커서 튐 방지),
  툴바 삽입/찾기 이동 직후에만 `selection` prop을 잠깐 제어한 뒤 `onSelectionChange`에서 해제한다.

### 프리뷰 찾기

- WebView는 Preview 진입마다 재로드되므로, `onLoadEnd`에서 찾기 상태를 재적용한다.
- 매치 수는 DOM 기준으로 세서 `postMessage`로 RN에 돌려준다 (소스 기준 카운트와 다를 수 있음).
