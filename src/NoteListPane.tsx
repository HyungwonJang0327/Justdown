import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
              <TouchableOpacity
                style={[
                  styles.row,
                  {
                    borderBottomColor: colors.border,
                    backgroundColor: selected ? colors.card : colors.bg,
                  },
                ]}
                onPress={() => onSelect(item.id)}
                onLongPress={() => confirmDelete(item.id)}
              >
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                  {title}
                </Text>
                {sub.length > 0 && (
                  <Text style={[styles.sub, { color: colors.subText }]} numberOfLines={1}>
                    {sub}
                  </Text>
                )}
              </TouchableOpacity>
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
  row: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  title: { fontSize: 17, fontWeight: '600' },
  sub: { fontSize: 14, marginTop: 3 },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
  },
  deleteActionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
