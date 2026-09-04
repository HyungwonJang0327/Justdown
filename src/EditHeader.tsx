import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Tab } from './NoteEditPane';
import { useTheme } from './theme';

/** 편집 헤더의 Code/Preview 탭 선택기 (좁은 화면·와이드 모드 공용) */
export function EditTabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.tabs, { borderColor: colors.border }]}>
      {(['code', 'preview'] as Tab[]).map((t) => {
        const active = tab === t;
        return (
          <TouchableOpacity
            key={t}
            onPress={() => onChange(t)}
            style={[styles.tab, { backgroundColor: active ? colors.tint : 'transparent' }]}
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
  );
}

/** 편집 헤더의 찾기·목차 버튼 (좁은 화면·와이드 모드 공용) */
export function EditHeaderButtons({
  onToggleFind,
  onToggleToc,
}: {
  onToggleFind: () => void;
  onToggleToc: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity onPress={onToggleFind} style={styles.headerBtn}>
        <Text style={{ fontSize: 17 }}>🔍</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onToggleToc} style={[styles.headerBtn, { marginLeft: 10 }]}>
        <Text style={{ fontSize: 22, color: colors.text }}>☰</Text>
      </TouchableOpacity>
    </View>
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
