import '../lib/patchLinking' // ⚠️ MUST be first — patches RCTDeviceEventEmitter before Expo Router registers its URL listener
import { useEffect, useRef } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as Linking from 'expo-linking'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { initializeDatabase, saveThreatLocally } from '../lib/database'
import { analyzeThreat } from '../lib/rulesEngine'
import { showThreatAlert } from '../lib/threatAlert'
import { PreferencesProvider, usePreferences } from '../lib/PreferencesContext'

// ── CivixShield backend on Vercel ────────────────────────────────────────────
const CIVIX_API = 'https://civixshield.vercel.app/api/analyze'

export default function RootLayout() {

  // ── Initialize local SQLite database on first launch ─────────────────────
  useEffect(() => {
    initializeDatabase()
    checkOnboarding()
  }, [])

  // ── Handle deep links from CivixLauncher (civix://ingest?...) ────────────
  useEffect(() => {
    // Handle cold-start deep link
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url })
    })

    // Handle deep links when app is already running
    const subscription = Linking.addEventListener('url', handleDeepLink)
    return () => subscription.remove()
  }, [])

  /**
   * Core deep link handler — receives threat data from CivixLauncher.
   * Fires when the Android launcher sends: civix://ingest?sourcetype=SMS&label=...&content=...
   */
  async function handleDeepLink({ url }: { url: string }) {
    // Guard: reject obviously malformed URIs before Expo Router tries to decode them.
    // This prevents the native crash: "URIError: Malformed decodeURI input"
    try {
      decodeURIComponent(url.replace(/\+/g, ' '))
    } catch {
      console.warn('[CivixShield] Skipping malformed deep link (bad URI encoding):', url)
      return
    }

    let parsed: Linking.ParsedURL;
    try {
      parsed = Linking.parse(url);
    } catch (err) {
      console.error('[CivixShield] Failed to parse deep link URL:', url, err);
      return;
    }

    // Only handle civix://ingest deep links from the launcher
    // Check hostname and multiple path variations to be as robust as possible
    const hostname = parsed.hostname?.replace(/\//g, '')
    const path = parsed.path?.replace(/\//g, '')
    const isIngest = hostname === 'ingest' || path === 'ingest'
    
    if (parsed.scheme !== 'civix' || !isIngest) return

    // Extract query params (Note: launcher might send 'score' and 'reasons' for live calls)
    const { 
      sourcetype, 
      label, 
      content, 
      score: launcherScore, 
      reasons: launcherReasons 
    } = parsed.queryParams as Record<string, string>

    if (!content) return

    const finalLabel = label || 'Civix Monitor'
    const finalType  = sourcetype || 'CALL'

    console.log(`[CivixShield] Ingesting ${finalType} from ${finalLabel}`)

    // ── Step 1: Run local rules engine first (zero-latency, offline) ────────
    const localResult = analyzeThreat(content)

    let finalScore     = localResult.riskScore
    let finalLevel     = localResult.riskLevel
    let finalRedFlags  = localResult.matchedPatterns

    // ── Step 2: Optimized Analysis Tier ───────────────────────────────────
    // If the launcher (Edge AI) already provided a score, we trust it to 
    // avoid redundant network latency during a live call.
    if (launcherScore) {
      console.log('[CivixShield] Using Edge AI score from launcher:', launcherScore)
      finalScore    = Math.max(localResult.riskScore, parseInt(launcherScore, 10))
      finalLevel    = finalScore >= 80 ? 'critical' : finalScore >= 50 ? 'high' : 'medium'
      
      if (launcherReasons) {
        finalRedFlags = [...new Set([...localResult.matchedPatterns, launcherReasons])]
      }
    } else {
      // Otherwise, hit the Gemini backend for deep analysis
      try {
        const res = await fetch(CIVIX_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content:     content,
            contentType: 'text',
            source:      finalLabel,
          })
        })

        if (res.ok) {
          const result = await res.json()
          finalScore    = Math.max(localResult.riskScore, result.risk_score ?? 0)
          finalLevel    = result.risk_level ?? localResult.riskLevel
          finalRedFlags = result.red_flags?.length ? result.red_flags : localResult.matchedPatterns
        }
      } catch (err) {
        console.warn('[CivixShield] Backend unavailable, using local score:', err)
      }
    }

    // ── Step 3: Persistence for Dashboard ────────────────────────────────
    await saveThreatLocally({
      sourceType:  finalType,
      sourceApp:   finalLabel,
      content:     content,
      riskScore:   finalScore,
      riskLevel:   finalLevel,
      redFlags:    finalRedFlags,
      intercepted: true,
      synced:      false,
    })

    // ── Step 4: Sensory Feedback ─────────────────────────────────────────
    if (finalScore >= 40) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }

    // ── Step 5: Decision UI ──────────────────────────────────────────────
    showThreatAlert(
      { risk_score: finalScore, risk_level: finalLevel, red_flags: finalRedFlags },
      finalType,
      finalLabel
    )
  }

  async function checkOnboarding() {
    const seen = await AsyncStorage.getItem('onboarding_complete')
    // Onboarding state is handled by the router via onboarding screen
  }

  return (
    <PreferencesProvider>
      <RootStackContent />
    </PreferencesProvider>
  )
}

function RootStackContent() {
  const { theme } = usePreferences()
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor={theme === 'dark' ? '#050505' : '#FFFFFF'} />
        <Stack
          screenOptions={{
            headerShown:       false,
            contentStyle:      { backgroundColor: theme === 'dark' ? '#050505' : '#FFFFFF' },
            animation:         'slide_from_right',
            animationDuration: 250,
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
