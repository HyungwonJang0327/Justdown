import { useLayoutEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import NoteEditPane, { type Tab } from './NoteEditPane';
import { EditHeaderButtons, EditTabs } from './EditHeader';
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
        <EditTabs
          tab={tab}
          onChange={(t) => {
            setTab(t);
            setTocVisible(false); // 탭 전환 시 목차 패널 닫기
          }}
        />
      ),
      headerRight: () => (
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
