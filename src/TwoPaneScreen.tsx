import { useCallback, useLayoutEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import NoteListPane from './NoteListPane';
import NoteEditPane, { type Tab } from './NoteEditPane';
import { EditHeaderButtons, EditTabs } from './EditHeader';
import { useTheme } from './theme';
import type { RootStackParamList } from './navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Split'>;

const SIDEBAR_WIDTH = 300;

/** 와이드(데스크톱·태블릿) 모드: 왼쪽 노트 목록 사이드바 + 오른쪽 편집 pane */
export default function TwoPaneScreen({ navigation }: Props) {
  const { colors, theme, toggle } = useTheme();

  const [query, setQuery] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNewNote, setIsNewNote] = useState(false);
  const [tab, setTab] = useState<Tab>('preview');
  const [findVisible, setFindVisible] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);

  // 저장(자동 저장 포함)될 때마다 사이드바 목록 갱신 — 제목이 실시간으로 따라온다
  const refreshList = useCallback(() => setRefreshToken((t) => t + 1), []);

  const selectNote = (id: string) => {
    if (id === selectedId) return;
    // 이전 노트의 flush 저장은 NoteEditPane이 key 교체(unmount)로 처리
    setSelectedId(id);
    setIsNewNote(false);
    setTab('preview');
    setFindVisible(false);
    setTocVisible(false);
  };

  const createNote = () => {
    const id = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    setSelectedId(id);
    setIsNewNote(true);
    setTab('code');
    setFindVisible(false);
    setTocVisible(false);
  };

  // 헤더: 왼쪽 테마 토글, 가운데 탭·오른쪽 찾기/목차는 노트가 선택됐을 때만
  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={toggle} style={styles.headerBtn}>
          <Text style={{ fontSize: 17 }}>{theme === 'dark' ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      ),
      headerTitle: selectedId
        ? () => (
            <EditTabs
              tab={tab}
              onChange={(t) => {
                setTab(t);
                setTocVisible(false); // 탭 전환 시 목차 패널 닫기
              }}
            />
          )
        : 'Justdown',
      headerRight: selectedId
        ? () => (
            <EditHeaderButtons
              onToggleFind={() => {
                if (tocVisible) {
                  // 목차가 열려 있으면 닫고 검색을 활성화
                  setTocVisible(false);
                  setFindVisible(true);
                } else {
                  setFindVisible((v) => !v);
                }
              }}
              onToggleToc={() => setTocVisible((v) => !v)}
            />
          )
        : undefined,
    });
  }, [navigation, theme, toggle, selectedId, tab, tocVisible]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.sidebar, { borderRightColor: colors.border }]}>
        <View style={[styles.sidebarTop, { borderBottomColor: colors.border }]}>
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder="검색"
            placeholderTextColor={colors.subText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={createNote} style={styles.newBtn}>
            <Text style={{ fontSize: 26, lineHeight: 28, fontWeight: '300', color: colors.tint }}>
              ＋
            </Text>
          </TouchableOpacity>
        </View>
        <NoteListPane
          query={query}
          selectedId={selectedId}
          onSelect={selectNote}
          refreshToken={refreshToken}
        />
      </View>

      <View style={styles.detail}>
        {selectedId ? (
          // key=id: 노트 전환 시 pane을 재마운트해 이전 노트를 flush 저장하고 새로 로드
          <NoteEditPane
            key={selectedId}
            id={selectedId}
            isNew={isNewNote}
            tab={tab}
            findVisible={findVisible}
            tocVisible={tocVisible}
            onRequestCloseFind={() => setFindVisible(false)}
            onRequestCloseToc={() => setTocVisible(false)}
            onSaved={refreshList}
          />
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={[styles.empty, { color: colors.subText }]}>
              {'노트를 선택하거나\n＋ 버튼으로 새 노트를 만드세요.'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  sidebar: { width: SIDEBAR_WIDTH, borderRightWidth: StyleSheet.hairlineWidth },
  sidebarTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  newBtn: { paddingHorizontal: 10, paddingVertical: 2, marginLeft: 6 },
  detail: { flex: 1 },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { textAlign: 'center', lineHeight: 24 },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6 },
});
