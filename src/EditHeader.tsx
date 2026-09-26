import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { t } from './i18n';
import type { Tab } from './NoteEditPane';
import { useTheme } from './theme';

// iPhone SE(375pt) 같은 좁은 화면에선 가운데 탭과 오른쪽 버튼 3개(あ·🔍·☰)가 겹치므로
// 탭 여백·버튼 간격을 줄인다
const COMPACT_WIDTH = 400;
function useCompact(): boolean {
  return useWindowDimensions().width < COMPACT_WIDTH;
}

/** 편집 헤더의 Code/Preview 탭 선택기 (좁은 화면·와이드 모드 공용) */
export function EditTabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { colors } = useTheme();
  const compact = useCompact();
  return (
    <View style={[styles.tabs, { borderColor: colors.border }]}>
      {(['code', 'preview'] as Tab[]).map((t) => {
        const active = tab === t;
        return (
          <TouchableOpacity
            key={t}
            onPress={() => onChange(t)}
            style={[
              styles.tab,
              compact && styles.tabCompact,
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
  );
}

/** 편집 헤더의 요미가나·찾기·목차 버튼 (좁은 화면·와이드 모드 공용) */
export function EditHeaderButtons({
  ruby,
  onToggleFind,
  onToggleToc,
}: {
  /** 요미가나 가리기 토글. Preview 탭에서만 의미가 있어 그때만 넘긴다 */
  ruby?: { hidden: boolean; onToggle: () => void };
  onToggleFind: () => void;
  onToggleToc: () => void;
}) {
  const { colors } = useTheme();
  const compact = useCompact();
  const btn = [styles.headerBtn, compact && styles.headerBtnCompact];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {ruby && (
        <TouchableOpacity
          onPress={ruby.onToggle}
          style={[
            styles.rubyBtn,
            compact && styles.rubyBtnCompact,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          accessibilityRole="button"
          accessibilityLabel={ruby.hidden ? t('showRuby') : t('hideRuby')}
        >
          {/* 가린 상태는 흐리게 + 취소선 (색만으로는 구분이 어려움) */}
          <Text
            style={[
              styles.rubyText,
              ruby.hidden
                ? { color: colors.subText, textDecorationLine: 'line-through' }
                : { color: colors.text },
            ]}
          >
            あ
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onToggleFind} style={btn}>
        <Text style={{ fontSize: 17 }}>🔍</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onToggleToc} style={[btn, { marginLeft: compact ? 2 : 10 }]}>
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
  tabCompact: { paddingHorizontal: 12 },
  headerBtn: { paddingHorizontal: 10, paddingVertical: 6 },
  headerBtnCompact: { paddingHorizontal: 7 },
  rubyBtn: {
    width: 36,
    height: 36,
    marginRight: 10,
    borderRadius: 9,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rubyBtnCompact: { width: 32, height: 32, marginRight: 4 },
  rubyText: { fontSize: 20, fontWeight: '600' },
});
