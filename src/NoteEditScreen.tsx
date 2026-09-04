import { useLayoutEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import NoteEditPane, { type Tab } from './NoteEditPane';
import { useTheme } from './theme';
import type { RootStackParamList } from './navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteEdit'>;

export default function NoteEditScreen({ route, navigation }: Props) {
  const { id, isNew } = route.params;
  const { colors } = useTheme();

  // 신규 노트는 바로 작성(Code), 기존 노트는 읽기(Preview)부터
  const [tab, setTab] = useState<Tab>(isNew ? 'code' : 'preview');
  const [findVisible, setFindVisible] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);

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

  return (
    <NoteEditPane
      id={id}
      isNew={isNew}
      tab={tab}
      findVisible={findVisible}
      tocVisible={tocVisible}
      onRequestCloseFind={() => setFindVisible(false)}
      onRequestCloseToc={() => setTocVisible(false)}
    />
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 9,
    overflow: 'hidden',
  },
  tab: { paddingVertical: 6, paddingHorizontal: 18 },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6 },
});
