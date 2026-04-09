import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { Colors } from '../constants/Colors';

type ThemeMode = 'light' | 'dark';

interface PreferencesData {
  theme: ThemeMode;
  language: string;
  colors: typeof Colors.light;
  setTheme: (t: ThemeMode) => void;
  setLanguage: (l: string) => void;
}

const PreferencesContext = createContext<PreferencesData>({
  theme: 'dark',
  language: 'en',
  colors: Colors.dark,
  setTheme: () => {},
  setLanguage: () => {},
});

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [language, setLanguageState] = useState<string>('en');

  useEffect(() => {
    async function loadPrefs() {
      const storedTheme = await AsyncStorage.getItem('@theme');
      const storedLang = await AsyncStorage.getItem('@lang');
      if (storedTheme) setThemeState(storedTheme as ThemeMode);
      else {
        const colorScheme = Appearance.getColorScheme();
        if (colorScheme) setThemeState(colorScheme);
      }
      if (storedLang) setLanguageState(storedLang);
    }
    loadPrefs();
  }, []);

  const setTheme = async (t: ThemeMode) => {
    setThemeState(t);
    await AsyncStorage.setItem('@theme', t);
  };

  const setLanguage = async (l: string) => {
    setLanguageState(l);
    await AsyncStorage.setItem('@lang', l);
  };

  const currentColors = theme === 'light' ? Colors.light : Colors.dark;

  return (
    <PreferencesContext.Provider value={{ theme, language, colors: currentColors, setTheme, setLanguage }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export const usePreferences = () => useContext(PreferencesContext);
