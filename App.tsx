import { useEffect, useMemo, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NoteListScreen from './src/NoteListScreen';
import NoteEditScreen from './src/NoteEditScreen';
import TwoPaneScreen from './src/TwoPaneScreen';
import { loadTheme, saveTheme } from './src/storage';
import { t } from './src/i18n';
import { ThemeContext, colorsFor, type ThemeName } from './src/theme';
import type { RootStackParamList } from './src/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

// 이 너비 이상 + 가로형(너비>높이)이면 2-pane(사이드바+본문) 레이아웃.
// 세로형은 너비와 무관하게 리스트→push (iPad 세로모드 포함).
// 브라우저 리사이즈·iPad 회전·Split View 에 동일하게 적용.
const WIDE_BREAKPOINT = 700;

export default function App() {
  const [theme, setTheme] = useState<ThemeName>('light');
  const { width, height } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT && width > height;

  useEffect(() => {
    loadTheme().then(setTheme);
  }, []);

  const themeValue = useMemo(
    () => ({
      theme,
      colors: colorsFor(theme),
      toggle: () => {
        setTheme((prev) => {
          const next = prev === 'dark' ? 'light' : 'dark';
          saveTheme(next);
          return next;
        });
      },
    }),
    [theme]
  );

  const colors = themeValue.colors;
  const navTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: colors.bg,
      card: colors.bg,
      text: colors.text,
      border: colors.border,
      primary: colors.tint,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeContext.Provider value={themeValue}>
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator>
            {wide ? (
              <Stack.Screen
                name="Split"
                component={TwoPaneScreen}
                options={{ title: 'Justdown' }}
              />
            ) : (
              <>
                <Stack.Screen
                  name="NoteList"
                  component={NoteListScreen}
                  options={{ title: 'Justdown' }}
                />
                <Stack.Screen
                  name="NoteEdit"
                  component={NoteEditScreen}
                  options={{ title: '', headerBackTitle: t('backToList') }}
                />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
          <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
        </ThemeContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
