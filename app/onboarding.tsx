import { useState, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, ViewToken } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Onboarding Screen — Missing Feature #1
 *
 * This addresses the missing.md gap:
 * "There is no localized onboarding state management. CivixShield mobile uses
 *  AsyncStorage to track if a user has seen the tutorial."
 */

const { width, height } = Dimensions.get('window')

const SLIDES = [
  {
    id: '1',
    icon: '🛡️',
    title: 'Welcome to CivixShield',
    subtitle: "India's AI-Powered Cybersecurity Shield",
    body: 'Protect yourself from Digital Arrest scams, UPI fraud, and phishing attacks — all in real time.',
    color: '#00E5FF',
  },
  {
    id: '2',
    icon: '📱',
    title: 'Install CivixLauncher',
    subtitle: 'Your Home Screen Becomes Your Shield',
    body: 'Set CivixLauncher as your default Android home screen for automatic background interception of all suspicious messages and calls.',
    color: '#4CAF50',
  },
  {
    id: '3',
    icon: '🧠',
    title: 'AI + Offline Detection',
    subtitle: 'Zero-Latency India Rules Engine',
    body: 'Threats are detected in <2ms on your device — no internet needed. Then verified by Gemini AI for deep analysis.',
    color: '#FFD700',
  },
  {
    id: '4',
    icon: '🗄️',
    title: 'Your Private Vault',
    subtitle: 'All Data Stays on Your Device',
    body: 'Every threat is saved locally in your Threat Vault — accessible offline, no account required.',
    color: '#FF6B35',
  },
  {
    id: '5',
    icon: '🚨',
    title: 'Digital Arrest Alerts',
    subtitle: 'Stop Scams Before They Happen',
    body: 'CivixShield auto-silences scam calls and shows an instant warning — stopping Digital Arrest fraudsters before they can manipulate you.',
    color: '#DC2626',
  },
]

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const listRef = useRef<FlatList>(null)

  function handleNext() {
    Haptics.selectionAsync()
    if (currentIndex < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true })
    } else {
      completeOnboarding()
    }
  }

  async function completeOnboarding() {
    await AsyncStorage.setItem('onboarding_complete', 'true')
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.replace('/(tabs)')
  }

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index !== null && viewableItems[0]?.index !== undefined) {
      setCurrentIndex(viewableItems[0].index!)
    }
  }).current

  const currentSlide = SLIDES[currentIndex]

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <LinearGradient
              colors={[item.color + '11', '#050505']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.slideIcon}>{item.icon}</Text>
            <Text style={[styles.slideTitle, { color: item.color }]}>{item.title}</Text>
            <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
            <Text style={styles.slideBody}>{item.body}</Text>
          </View>
        )}
      />

      {/* Pagination Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === currentIndex ? currentSlide.color : '#333',
                width: i === currentIndex ? 24 : 8 }
            ]}
          />
        ))}
      </View>

      {/* CTA Button */}
      <TouchableOpacity
        style={[styles.nextBtn, { borderColor: currentSlide.color }]}
        onPress={handleNext}>
        <Text style={[styles.nextBtnText, { color: currentSlide.color }]}>
          {currentIndex < SLIDES.length - 1
            ? '[ NEXT ]'
            : '[ GET PROTECTED ]'
          }
        </Text>
      </TouchableOpacity>

      {currentIndex < SLIDES.length - 1 && (
        <TouchableOpacity onPress={completeOnboarding} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#050505' },
  slide:         { width, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center', flex: 1 },
  slideIcon:     { fontSize: 72, marginBottom: 32 },
  slideTitle:    { fontSize: 24, fontWeight: '900', fontFamily: 'monospace', textAlign: 'center', marginBottom: 8, letterSpacing: 1 },
  slideSubtitle: { color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 20, fontFamily: 'monospace' },
  slideBody:     { color: '#ccc', fontSize: 15, textAlign: 'center', lineHeight: 24 },
  dots:          { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 24 },
  dot:           { height: 8, borderRadius: 4 },
  nextBtn:       { marginHorizontal: 32, borderWidth: 1, borderRadius: 6, paddingVertical: 18,
                   alignItems: 'center', marginBottom: 12 },
  nextBtnText:   { fontFamily: 'monospace', fontWeight: '700', letterSpacing: 3, fontSize: 14 },
  skipBtn:       { alignItems: 'center', paddingBottom: 16 },
  skipText:      { color: '#444', fontSize: 12, fontFamily: 'monospace' },
})
