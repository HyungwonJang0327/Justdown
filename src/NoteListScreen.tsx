import { useCallback, useLayoutEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import NoteListPane from './NoteListPane';
import { t } from './i18n';
import { useTheme } from './theme';
import type { RootStackParamList } from './navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteList'>;

export default function NoteListScreen({ navigation }: Props) {
  const { colors, theme, toggle } = useTheme();
  const [query, setQuery] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  // 편집 화면에서 돌아올 때 목록 갱신
  useFocusEffect(
    useCallback(() => {
      setRefreshToken((t) => t + 1);
    }, [])
  );

  const createNote = useCallback(() => {
    const id = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    navigation.navigate('NoteEdit', { id, isNew: true });
  }, [navigation]);

  // iOS 네이티브 헤더 검색바 + 헤더 버튼.
  // iOS 26+에서 검색 필드가 화면 하단에 상주하므로, 새 노트/테마 버튼은
  // 플로팅(FAB)이 아니라 헤더에 둔다 (하단 겹침 방지).
  useLayoutEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: t('search'),
        cancelButtonText: t('cancel'),
        hideWhenScrolling: false,
        // 다크 모드에서 입력 텍스트·플레이스홀더·커서가 기본(라이트)색으로 남지 않게 지정
        textColor: colors.text,
        hintTextColor: colors.subText,
        headerIconColor: colors.subText,
        tintColor: colors.tint,
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
  }, [navigation, theme, colors, toggle, createNote]);

  return (
    <NoteListPane
      query={query}
      onSelect={(id) => navigation.navigate('NoteEdit', { id, isNew: false })}
      refreshToken={refreshToken}
    />
  );
}

const styles = StyleSheet.create({
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6 },
});
