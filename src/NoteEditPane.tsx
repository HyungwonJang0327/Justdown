import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InputAccessoryView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';
import { deleteNote, loadNote, saveNote } from './storage';
import { extractHeadings, type Heading } from './markdown';
import MarkdownPreview from './MarkdownPreview';
import type { MarkdownPreviewHandle } from './MarkdownPreviewTypes';
import { useTheme } from './theme';

export type Tab = 'code' | 'preview';

// 키보드 위 툴바 버튼: label = 표시, snippet = 삽입 문자열, caretBack = 삽입 후 커서를 뒤로 당길 칸 수
const TOOLBAR: { label: string; snippet: string; caretBack: number }[] = [
  { label: '《 》', snippet: '《》', caretBack: 1 }, // 후리가나 (커서 가운데)
  { label: '｜', snippet: '｜', caretBack: 0 }, // 베이스 경계
  { label: 'H', snippet: '# ', caretBack: 0 },
  { label: '•', snippet: '- ', caretBack: 0 },
  { label: 'B', snippet: '****', caretBack: 2 },
  { label: '</>', snippet: '```\n\n```', caretBack: 4 },
];

// InputAccessoryView nativeID 발급용 시퀀스 (마운트마다 새 값)
let nextToolbarSeq = 0;

interface Props {
  id: string;
  isNew: boolean;
  /** 탭·찾기·목차 표시 상태는 헤더(버튼) 소유자가 관리한다 */
  tab: Tab;
  findVisible: boolean;
  tocVisible: boolean;
  onRequestCloseFind: () => void;
  onRequestCloseToc: () => void;
  /** 노트가 저장될 때마다 호출 (와이드 모드 목록 갱신용) */
  onSaved?: () => void;
}

/** 노트 편집 본문. 좁은 화면에선 NoteEditScreen이, 와이드 모드에선 오른쪽 pane이 감싼다. */
export default function NoteEditPane({
  id,
  isNew,
  tab,
  findVisible,
  tocVisible,
  onRequestCloseFind,
  onRequestCloseToc,
  onSaved,
}: Props) {
  const { colors, theme } = useTheme();

  const [content, setContent] = useState('');
  const [loaded, setLoaded] = useState(isNew);
  const existedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef('');
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // 커서 위치 추적: 평소엔 uncontrolled(입력 튐 방지), 툴바 삽입 직후에만 잠깐 제어
  const selRef = useRef({ start: 0, end: 0 });
  const [pendingSel, setPendingSel] = useState<{ start: number; end: number } | undefined>(
    undefined
  );

  // InputAccessoryView nativeID는 화면 인스턴스마다 유니크해야 함.
  // 고정 문자열이면 화면 재마운트 시 이전 등록과 충돌해 툴바가 안 붙는다.
  const [accessoryId] = useState(() => `justdown-toolbar-${nextToolbarSeq++}`);

  // 노트 내 찾기
  const inputRef = useRef<TextInput>(null);
  const [findQuery, setFindQuery] = useState('');
  const [findIndex, setFindIndex] = useState(0);
  const [previewCount, setPreviewCount] = useState(0); // Preview 탭 DOM 기준 매치 수

  // 찾기 바 닫기: 상태 초기화 후 닫기 요청 (하이라이트 제거 포함)
  const closeFind = () => {
    setFindQuery('');
    setFindIndex(0);
    onRequestCloseFind();
  };

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

  // 매치로 이동. Code 탭=커서(selection) 이동, Preview 탭=프리뷰 하이라이트 스크롤
  const gotoMatch = (idx: number) => {
    if (tab === 'preview') {
      setFindIndex(idx); // 래핑·스크롤은 MarkdownPreview가 findIndex 변화에 반응해 처리
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

  // 목차
  const previewRef = useRef<MarkdownPreviewHandle>(null);
  const headings = useMemo(() => extractHeadings(content), [content]);

  const gotoHeading = (h: Heading) => {
    onRequestCloseToc();
    if (tab === 'preview') {
      previewRef.current?.scrollToHeading(h.line);
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
  const persist = useCallback(
    (text: string) => {
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
      onSaved?.();
    },
    [id, onSaved]
  );

  const onChange = (text: string) => {
    setContent(text);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null; // 발화 후 비워야 언마운트 flush 가 "미저장 있음"으로 오판하지 않는다
      persist(text);
    }, 500);
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
  const insertRef = useRef(insert);
  useEffect(() => {
    insertRef.current = insert;
  });

  // ⌘K: 후리가나 괄호 《》 삽입 (웹 전용, Code 탭에서만)
  useEffect(() => {
    if (Platform.OS !== 'web' || tab !== 'code') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey && !e.shiftKey && !e.altKey && !e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        insertRef.current('《》', 1);
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [tab]);

  // 언마운트(화면 이탈·노트 전환) 시 미저장 변경만 즉시 저장.
  // saveTimer 가 걸려 있다 = 디바운스가 아직 안 끝난 입력이 있다는 뜻.
  // 변경이 없는데도 저장하면 updatedAt 이 갱신돼 목록 순서가 뒤바뀐다.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        persist(contentRef.current);
      }
    };
  }, [persist]);

  const headerHeight = useHeaderHeight();

  // 현재 탭 기준 매치 수/위치 (Preview는 findIndex가 래핑되지 않으므로 여기서 래핑)
  const findCount = tab === 'preview' ? previewCount : matches.length;
  const findPos = findCount === 0 ? 0 : ((findIndex % findCount) + findCount) % findCount;

  // 서식 툴바: iOS는 키보드 액세서리로, 웹은 에디터 상단 고정 바로 표시
  const toolbar = (
    <View style={[styles.accessory, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false}>
        {TOOLBAR.map((b) => (
          <TouchableOpacity
            key={b.label}
            style={[styles.toolBtn, { borderColor: colors.border }]}
            onPress={() => {
              insert(b.snippet, b.caretBack);
              inputRef.current?.focus(); // 웹: 버튼 클릭으로 빠진 포커스를 에디터로 복귀
            }}
          >
            <Text style={[styles.toolText, { color: colors.text }]}>{b.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

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
          <TouchableOpacity onPress={closeFind} style={styles.findBtn}>
            <Text style={{ color: colors.subText, fontSize: 17 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      {Platform.OS === 'web' && tab === 'code' && toolbar}
      {/* TextInput은 InputAccessoryView(툴바)와 같은 첫 렌더 커밋에 마운트되어야
          액세서리 연결이 생긴다 (늦게 마운트하면 내용 로드가 느린 노트에서 연결 실패).
          그래서 로드 완료를 기다리지 않고 빈 값으로 즉시 마운트하고, 내용은 나중에 채운다.
          탭 전환 시에도 언마운트하지 않고 숨김만 한다 (재마운트 시 연결이 끊김). */}
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
      {loaded && tab === 'preview' && (
        <MarkdownPreview
          ref={previewRef}
          content={content}
          theme={theme}
          findQuery={findVisible ? findQuery : ''}
          findIndex={findIndex}
          onFindCount={setPreviewCount}
          backgroundColor={colors.bg}
        />
      )}

      {tocVisible && (
        <View style={[StyleSheet.absoluteFill, styles.tocWrap]}>
          <TouchableOpacity
            style={styles.tocBackdrop}
            activeOpacity={1}
            onPress={onRequestCloseToc}
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

      {/* InputAccessoryView는 iOS 전용 (웹/안드로이드에서는 렌더하지 않음) */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={accessoryId}>{toolbar}</InputAccessoryView>
      )}
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
  // display:'none'이 아닌 0-크기 숨김: 네이티브 뷰를 히에라키에 남겨 액세서리 연결을 보존
  hidden: { position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' },
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
