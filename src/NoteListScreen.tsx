import { useCallback, useLayoutEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { deleteNote as deleteNoteInStorage, loadNotes, noteTitle, type Note } from './storage';
import { useTheme } from './theme';
import type { RootStackParamList } from './navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteList'>;

function preview(content: string): string {
  const title = noteTitle(content);
  const rest = content
    .replace(title, '')
    .replace(/[#>*`\-\[\]{}|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return rest.slice(0, 80);
}

export default function NoteListScreen({ navigation }: Props) {
  const { colors, theme, toggle } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadNotes().then(setNotes);
    }, [])
  );

  const createNote = () => {
    const id = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    navigation.navigate('NoteEdit', { id, isNew: true });
  };

  // iOS 네이티브 헤더 검색바 + 헤더 버튼.
  // iOS 26+에서 검색 필드가 화면 하단에 상주하므로, 새 노트/테마 버튼은
  // 플로팅(FAB)이 아니라 헤더에 둔다 (하단 겹침 방지).
  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: '검색',
        cancelButtonText: '취소',
        hideWhenScrolling: false,
        onChangeText: (e) => setQuery(e.nativeEvent.text),
        onCancelButtonPress: () => setQuery(''),
      },
      headerLeft: () => (
        <TouchableOpacity onPress={toggle} style={styles.headerBtn}>
          <Text style={{ fontSize: 17 }}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={createNote} style={styles.headerBtn}>
          <Text style={{ fontSize: 28, lineHeight: 30, fontWeight: '300', color: colors.tint }}>
            ＋
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, theme, colors, toggle]);

  // 제목은 content 첫 줄에서 파생되므로 content 검색이 제목 검색을 포함한다
  const q = query.trim().toLowerCase();
  const filtered = q ? notes.filter((n) => n.content.toLowerCase().includes(q)) : notes;

  // 스와이프 삭제 버튼용: 즉시 삭제 (iOS 표준 관례상 확인 없음)
  const removeNote = async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await deleteNoteInStorage(id);
  };

  const deleteNote = (id: string) => {
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
          const title = noteTitle(item.content) || '(제목 없음)';
          const sub = preview(item.content);
          return (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.deleteAction}
                  onPress={() => removeNote(item.id)}
                >
                  <Text style={styles.deleteActionText}>삭제</Text>
                </TouchableOpacity>
              )}
            >
              <TouchableOpacity
                style={[styles.row, { borderBottomColor: colors.border, backgroundColor: colors.bg }]}
                onPress={() => navigation.navigate('NoteEdit', { id: item.id, isNew: false })}
                onLongPress={() => deleteNote(item.id)}
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
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  deleteAction: {
    backgroundColor: '#e5484d',
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
  },
  deleteActionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
