import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  InputAccessoryView,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useHeaderHeight } from '@react-navigation/elements';
import { deleteNote, loadNote, saveNote } from './storage';
import { extractHeadings, renderMarkdownDocument, type Heading } from './markdown';
import { useTheme } from './theme';
import type { RootStackParamList } from './navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteEdit'>;
type Tab = 'code' | 'preview';

// 키보드 위 툴바 버튼: label = 표시, snippet = 삽입 문자열, caretBack = 삽입 후 커서를 뒤로 당길 칸 수
const TOOLBAR: { label: string; snippet: string; caretBack: number }[] = [
  { label: '《 》', snippet: '《》', caretBack: 1 }, // 후리가나 (커서 가운데)
  { label: '｜', snippet: '｜', caretBack: 0 }, // 베이스 경계
  { label: 'H', snippet: '# ', caretBack: 0 },
  { label: '•', snippet: '- ', caretBack: 0 },
  { label: 'B', snippet: '****', caretBack: 2 },
  { label: '</>', snippet: '```\n\n```', caretBack: 4 },
];

export default function NoteEditScreen({ route, navigation }: Props) {
  const { id, isNew } = route.params;
  const { colors, theme } = useTheme();

  const [content, setContent] = useState('');
  const [tab, setTab] = useState<Tab>('code');
  const [loaded, setLoaded] = useState(isNew);
  const existedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 커서 위치 추적: 평소엔 uncontrolled(입력 튐 방지), 툴바 삽입 직후에만 잠깐 제어
  const selRef = useRef({ start: 0, end: 0 });
  const [pendingSel, setPendingSel] = useState<{ start: number; end: number } | undefined>(
    undefined
  );

  // InputAccessoryView nativeID는 화면 인스턴스마다 유니크해야 함.
  // 고정 문자열이면 화면 재마운트 시 이전 등록과 충돌해 툴바가 안 붙는다.
  const accessoryId = useRef(`justdown-toolbar-${Math.random().toString(36).slice(2)}`).current;

  // 노트 내 찾기
  const inputRef = useRef<TextInput>(null);
  const [findVisible, setFindVisible] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findIndex, setFindIndex] = useState(0);
  const [previewCount, setPreviewCount] = useState(0); // Preview 탭 DOM 기준 매치 수

  // findQuery의 모든 매치 시작 위치 (대소문자 무시)
  const matches = useMemo(() => {
    if (!findQuery) return [];
    const haystack = content.toLowerCase();
    const needle = findQuery.toLowerCase();
    const out: number[] = [];
    let i = haystack.indexOf(needle);
    while (i >= 0) {
      out.push(i);
      i = haystack.indexOf(needle, i + needle.length);
    }
    return out;
  }, [content, findQuery]);

  // 매치로 이동. Code 탭=커서(selection) 이동, Preview 탭=WebView 하이라이트 스크롤
  const gotoMatch = (idx: number) => {
    if (tab === 'preview') {
      setFindIndex(idx); // 래핑은 WebView 쪽 __find가 처리
      webviewRef.current?.injectJavaScript(
        `window.__find && window.__find(${JSON.stringify(findQuery)}, ${idx}); true;`
      );
      return;
    }
    if (matches.length === 0) return;
    const wrapped = ((idx % matches.length) + matches.length) % matches.length;
    setFindIndex(wrapped);
    const start = matches[wrapped];
    const sel = { start, end: start + findQuery.length };
    selRef.current = sel;
    inputRef.current?.focus();
    setPendingSel(sel);
  };

  // Preview 탭에서 찾기 상태가 바뀌면 WebView에 반영 (닫히면 빈 쿼리로 하이라이트 제거)
  useEffect(() => {
    if (tab !== 'preview') return;
    const q = findVisible ? findQuery : '';
    webviewRef.current?.injectJavaScript(
      `window.__find && window.__find(${JSON.stringify(q)}, ${findIndex}); true;`
    );
  }, [tab, findVisible, findQuery, findIndex]);

  // 목차
  const webviewRef = useRef<WebView>(null);
  const [tocVisible, setTocVisible] = useState(false);
  const headings = useMemo(() => extractHeadings(content), [content]);

  const gotoHeading = (h: Heading) => {
    setTocVisible(false);
    if (tab === 'preview') {
      // 헤딩 앵커(id="hl-<line>")로 스크롤
      webviewRef.current?.injectJavaScript(
        `document.getElementById('hl-${h.line}')?.scrollIntoView({behavior:'smooth',block:'start'}); true;`
      );
    } else {
      // 헤딩 라인으로 커서 이동 (찾기와 같은 메커니즘)
      const sel = { start: h.offset, end: h.offset + h.length };
      selRef.current = sel;
      inputRef.current?.focus();
      setPendingSel(sel);
    }
  };

  // 최초 로드: 기존 노트 내용 채우기
  useEffect(() => {
    loadNote(id).then((existing) => {
      existedRef.current = existing != null;
      if (existing) setContent(existing.content);
      setLoaded(true);
    });
  }, [id]);

  // 자동 저장 (디바운스)
  const persist = (text: string) => {
    if (text.trim().length === 0) {
      // 빈 노트는 저장하지 않음 (기존에 있었다면 제거)
      if (existedRef.current) {
        existedRef.current = false;
        deleteNote(id);
      }
    } else {
      existedRef.current = true;
      saveNote({ id, content: text, updatedAt: Date.now() });
    }
  };

  const onChange = (text: string) => {
    setContent(text);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(text), 500);
  };

  // 툴바에서 현재 커서 위치에 문자열 삽입
  const insert = (snippet: string, caretBack: number) => {
    const { start, end } = selRef.current;
    const next = content.slice(0, start) + snippet + content.slice(end);
    const caret = start + snippet.length - caretBack;
    onChange(next);
    selRef.current = { start: caret, end: caret };
    setPendingSel({ start: caret, end: caret });
  };

  // 화면 벗어날 때 즉시 저장
  useEffect(() => {
    return navigation.addListener('beforeRemove', () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      persist(content);
    });
  }, [navigation, content]);

  // 상단 탭을 헤더에 배치
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={[styles.tabs, { borderColor: colors.border }]}>
          {(['code', 'preview'] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => {
                  setTab(t);
                  setTocVisible(false); // 탭 전환 시 목차 패널 닫기
                }}
                style={[
                  styles.tab,
                  { backgroundColor: active ? colors.tint : 'transparent' },
                ]}
              >
                <Text
                  style={{
                    color: active ? '#fff' : colors.subText,
                    fontWeight: '600',
                    fontSize: 15,
                  }}
                >
                  {t === 'code' ? 'Code' : 'Preview'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ),
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              if (tocVisible) {
                // 목차가 열려 있으면 닫고 검색을 활성화
                setTocVisible(false);
                setFindVisible(true);
              } else {
                setFindVisible((v) => !v);
              }
            }}
            style={styles.headerBtn}
          >
            <Text style={{ fontSize: 17 }}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTocVisible((v) => !v)}
            style={[styles.headerBtn, { marginLeft: 10 }]}
          >
            <Text style={{ fontSize: 22, color: colors.text }}>☰</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, tab, colors, tocVisible]);

  const headerHeight = useHeaderHeight();

  // 현재 탭 기준 매치 수/위치 (Preview는 findIndex가 래핑되지 않으므로 여기서 래핑)
  const findCount = tab === 'preview' ? previewCount : matches.length;
  const findPos = findCount === 0 ? 0 : ((findIndex % findCount) + findCount) % findCount;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      {findVisible && (
        <View style={[styles.findBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <TextInput
            style={[styles.findInput, { color: colors.text, borderColor: colors.border }]}
            value={findQuery}
            onChangeText={(t) => {
              setFindQuery(t);
              setFindIndex(0);
            }}
            placeholder="찾기"
            placeholderTextColor={colors.subText}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => gotoMatch(findIndex)}
            keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
          />
          <Text style={[styles.findCount, { color: colors.subText }]}>
            {findCount === 0 ? '0/0' : `${findPos + 1}/${findCount}`}
          </Text>
          <TouchableOpacity onPress={() => gotoMatch(findIndex - 1)} style={styles.findBtn}>
            <Text style={{ color: colors.tint, fontSize: 17 }}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => gotoMatch(findIndex + 1)} style={styles.findBtn}>
            <Text style={{ color: colors.tint, fontSize: 17 }}>↓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setFindVisible(false);
              setFindQuery('');
              setFindIndex(0);
            }}
            style={styles.findBtn}
          >
            <Text style={{ color: colors.subText, fontSize: 17 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* TextInput은 탭 전환 시 언마운트하지 않고 숨김만 한다.
          재마운트되면 키보드 액세서리(툴바) 연결이 끊기기 때문. */}
      {loaded && (
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }, tab !== 'code' && styles.hidden]}
          value={content}
          onChangeText={onChange}
          selection={pendingSel}
          onSelectionChange={(e) => {
            selRef.current = e.nativeEvent.selection;
            if (pendingSel) setPendingSel(undefined);
          }}
          inputAccessoryViewID={accessoryId}
          placeholder={'# 제목\n\n漢字《かんじ》 처럼 후리가나를 넣을 수 있어요.\n키보드 위 《 》 버튼을 눌러보세요.'}
          placeholderTextColor={colors.subText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="top"
          autoFocus={isNew}
          keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
        />
      )}
      {loaded && tab === 'preview' && (
        <WebView
          ref={webviewRef}
          originWhitelist={['*']}
          style={{ backgroundColor: colors.bg }}
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
              if (msg.type === 'findCount') setPreviewCount(msg.count);
            } catch {
              // 무시
            }
          }}
          onLoadEnd={() => {
            // WebView는 Preview 진입마다 재로드되므로 찾기 상태를 다시 적용
            if (findVisible && findQuery) {
              webviewRef.current?.injectJavaScript(
                `window.__find && window.__find(${JSON.stringify(findQuery)}, ${findIndex}); true;`
              );
            }
          }}
        />
      )}

      {tocVisible && (
        <View style={[StyleSheet.absoluteFill, styles.tocWrap]}>
          <TouchableOpacity
            style={styles.tocBackdrop}
            activeOpacity={1}
            onPress={() => setTocVisible(false)}
          />
          <View style={[styles.tocPanel, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <ScrollView>
              {headings.length === 0 ? (
                <Text style={[styles.tocEmpty, { color: colors.subText }]}>
                  헤딩(#)이 없습니다.
                </Text>
              ) : (
                headings.map((h, i) => (
                  <TouchableOpacity
                    key={`${h.line}-${i}`}
                    style={[styles.tocItem, { paddingLeft: 16 + (h.level - 1) * 14 }]}
                    onPress={() => gotoHeading(h)}
                  >
                    <Text
                      style={{ color: colors.text, fontSize: 15, fontWeight: h.level === 1 ? '700' : '400' }}
                      numberOfLines={1}
                    >
                      {h.text}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}

      <InputAccessoryView nativeID={accessoryId}>
        <View style={[styles.accessory, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}>
            {TOOLBAR.map((b) => (
              <TouchableOpacity
                key={b.label}
                style={[styles.toolBtn, { borderColor: colors.border }]}
                onPress={() => insert(b.snippet, b.caretBack)}
              >
                <Text style={[styles.toolText, { color: colors.text }]}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </InputAccessoryView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  hidden: { display: 'none' },
  findBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  findInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  findCount: { fontSize: 13, marginLeft: 8, minWidth: 34, textAlign: 'center' },
  findBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  tocWrap: { flexDirection: 'row', zIndex: 10 },
  tocBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  tocPanel: {
    width: '74%',
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  tocItem: { paddingVertical: 11, paddingRight: 16 },
  tocEmpty: { padding: 24, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 9,
    overflow: 'hidden',
  },
  tab: { paddingVertical: 6, paddingHorizontal: 18 },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  accessory: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolBtn: {
    minWidth: 44,
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginHorizontal: 3,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolText: { fontSize: 16, fontWeight: '600' },
});
