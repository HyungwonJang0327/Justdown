import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NoteListScreen from './src/NoteListScreen';
import NoteEditScreen from './src/NoteEditScreen';
import { loadTheme, saveTheme } from './src/storage';
import { ThemeContext, colorsFor, type ThemeName } from './src/theme';
import type { RootStackParamList } from './src/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [theme, setTheme] = useState<ThemeName>('light');

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
    <SafeAreaProvider>
      <ThemeContext.Provider value={themeValue}>
        <NavigationContainer theme={navTheme}>
          <Stack.Navigator>
            <Stack.Screen
              name="NoteList"
              component={NoteListScreen}
              options={{ title: 'Justdown' }}
            />
            <Stack.Screen
              name="NoteEdit"
              component={NoteEditScreen}
              options={{ title: '', headerBackTitle: '목록' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
