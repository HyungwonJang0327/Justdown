import { useEffect, useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { deleteNote as deleteNoteInStorage, loadNotes, noteTitle, type Note } from './storage';
import { cleanHeadingText } from './markdown';
import { useTheme } from './theme';

function preview(content: string): string {
  const title = noteTitle(content);
  const rest = content
    .replace(title, '')
    .replace(/[#>*`\-\[\]{}|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // 후리가나 요미(《…》)는 목록에서 숨긴다 (목차와 동일한 규칙)
  return cleanHeadingText(rest).slice(0, 80);
}

interface Props {
  query: string;
  /** 와이드(2-pane) 모드에서 현재 열려 있는 노트 강조용 */
  selectedId?: string | null;
  onSelect: (id: string) => void;
  /** 값이 바뀌면 목록을 다시 로드한다 */
  refreshToken: number;
}

/** 노트 목록 본문. 좁은 화면에선 NoteListScreen이, 와이드 모드에선 사이드바가 감싼다. */
export default function NoteListPane({ query, selectedId, onSelect, refreshToken }: Props) {
  const { colors } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  // ⋯ 메뉴가 열려 있는 노트 id (웹 전용)
  const [menuId, setMenuId] = useState<string | null>(null);

  // 메뉴 밖 아무 곳이나 클릭하면 닫기. 리스너는 메뉴가 열린 뒤(이펙트 시점)에
  // 등록되므로 메뉴를 연 클릭 자체로는 닫히지 않고, 다른 ⋯ 클릭으로 메뉴를
  // 옮길 때는 functional update 가 id 비교로 새 메뉴를 보존한다.
  useEffect(() => {
    if (Platform.OS !== 'web' || menuId == null) return;
    const openedId = menuId;
    const close = () => setMenuId((cur) => (cur === openedId ? null : cur));
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuId]);

  useEffect(() => {
    loadNotes().then(setNotes);
  }, [refreshToken]);

  // 제목은 content 첫 줄에서 파생되므로 content 검색이 제목 검색을 포함한다
  const q = query.trim().toLowerCase();
  const filtered = q ? notes.filter((n) => n.content.toLowerCase().includes(q)) : notes;

  // 스와이프 삭제 버튼용: 즉시 삭제 (iOS 표준 관례상 확인 없음)
  const removeNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await deleteNoteInStorage(id);
  };

  const confirmDelete = (id: string) => {
    // react-native-web 의 Alert 는 no-op — 웹은 브라우저 confirm 사용
    if (Platform.OS === 'web') {
      if (window.confirm('이 노트를 삭제할까요?')) removeNote(id);
      return;
    }
    Alert.alert('삭제', '이 노트를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => removeNote(id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={(n) => n.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={filtered.length === 0 && styles.emptyWrap}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.subText }]}>
            {q
              ? '검색 결과가 없습니다.'
              : '노트가 없습니다.\n오른쪽 위 + 버튼으로 새 노트를 만드세요.'}
          </Text>
        }
        renderItem={({ item }) => {
          const title = cleanHeadingText(noteTitle(item.content)) || '(제목 없음)';
          const sub = preview(item.content);
          const selected = item.id === selectedId;
          const row = (
              <TouchableOpacity
                style={[
                  styles.row,
                  menuId === item.id && styles.rowMenuOpen,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: selected ? colors.card : colors.bg,
                  },
                ]}
                onPress={() => {
                  setMenuId(null);
                  onSelect(item.id);
                }}
                onLongPress={() => confirmDelete(item.id)}
              >
                <View style={styles.rowBody}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {title}
                  </Text>
                  {sub.length > 0 && (
                    <Text style={[styles.sub, { color: colors.subText }]} numberOfLines={1}>
                      {sub}
                    </Text>
                  )}
                </View>
                {/* 웹은 스와이프·롱프레스 발견성이 낮아 행 메뉴(⋯)를 노출 */}
                {Platform.OS === 'web' && (
                  <TouchableOpacity
                    onPress={() => setMenuId((cur) => (cur === item.id ? null : item.id))}
                    style={styles.rowMenuBtn}
                  >
                    <Text style={{ color: colors.subText, fontSize: 17 }}>⋯</Text>
                  </TouchableOpacity>
                )}
                {menuId === item.id && (
                  <View
                    style={[
                      styles.rowMenu,
                      { backgroundColor: colors.card, borderColor: colors.border },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setMenuId(null);
                        confirmDelete(item.id);
                      }}
                      style={styles.rowMenuItem}
                    >
                      <Text style={{ color: colors.destructive, fontSize: 15 }}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
          );
          // 웹은 ⋯ 메뉴로 삭제하므로 Swipeable 불필요
          // (Swipeable 의 overflow:hidden 이 메뉴 팝오버를 잘라내는 문제도 함께 회피)
          if (Platform.OS === 'web') return row;
          return (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity
                  style={[styles.deleteAction, { backgroundColor: colors.destructive }]}
                  onPress={() => removeNote(item.id)}
                >
                  <Text style={styles.deleteActionText}>삭제</Text>
                </TouchableOpacity>
              )}
            >
              {row}
            </Swipeable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { textAlign: 'center', lineHeight: 24, paddingHorizontal: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBody: { flex: 1 },
  rowMenuBtn: { paddingHorizontal: 8, paddingVertical: 6, marginLeft: 4 },
  rowMenuOpen: { zIndex: 10 }, // 메뉴가 다음 행에 가려지지 않게
  rowMenu: {
    position: 'absolute',
    top: '70%',
    right: 14,
    zIndex: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 100,
  },
  rowMenuItem: { paddingVertical: 8, paddingHorizontal: 14 },
  title: { fontSize: 17, fontWeight: '600' },
  sub: { fontSize: 14, marginTop: 3 },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
  },
  deleteActionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
