import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { TranslatedText as Text } from '../../lib/TranslatedText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { usePreferences } from '../../lib/PreferencesContext';
import { languageGroups, t } from '../../lib/i18n';

const { width } = Dimensions.get('window');

export default function SettingsScreen() {
  const { theme, language, setTheme, setLanguage, colors } = usePreferences();

  const handleThemeToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLanguageSelect = (code: string) => {
    Haptics.selectionAsync();
    setLanguage(code);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textHighlight }]}>{t('settings', language)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.textDim }]}>{t('theme', language)}</Text>
        <TouchableOpacity 
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} 
          onPress={handleThemeToggle}
          activeOpacity={0.7}
        >
          <View style={styles.cardRow}>
            <View style={[styles.iconBox, { backgroundColor: colors.neonGlow }]}>
              <Ionicons name={theme === 'dark' ? 'moon' : 'sunny'} size={24} color={colors.primary} />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Light / Dark Mode</Text>
              <Text style={[styles.cardSub, { color: colors.textDim }]}>Currently: {theme.toUpperCase()}</Text>
            </View>
            <Ionicons name="repeat" size={24} color={colors.textDim} />
          </View>
        </TouchableOpacity>

        {/* Global Languages Section */}
        {languageGroups.map((group, groupIdx) => (
          <View key={group.category} style={{ marginTop: 24 }}>
            <Text style={[styles.sectionTitle, { color: colors.textDim }]}>{group.category.toUpperCase()} LANGUAGES</Text>
            <View style={styles.grid}>
              {group.items.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => handleLanguageSelect(lang.code)}
                    style={[
                      styles.langBtn, 
                      { 
                        backgroundColor: isSelected ? colors.primary + '22' : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border
                      }
                    ]}
                  >
                    <Text style={styles.langFlag}>{lang.flag}</Text>
                    <Text style={[styles.langName, { color: isSelected ? colors.primary : colors.text }]}>
                      {lang.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingVertical: 16, alignItems: 'center', borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 2, fontFamily: 'monospace' },
  scroll: { padding: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardTextContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardSub: { fontSize: 13, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  langBtn: { width: (width - 48) / 2, padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, alignItems: 'center', flexDirection: 'row' },
  langFlag: { fontSize: 24, marginRight: 12 },
  langName: { fontSize: 12, fontWeight: '700', flex: 1, flexWrap: 'wrap' }
});
