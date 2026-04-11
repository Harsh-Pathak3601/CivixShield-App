import { useState } from 'react'
import {
  View, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Image, Platform,
} from 'react-native'
import { TranslatedText as Text } from '../../lib/TranslatedText'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import { Video, ResizeMode } from 'expo-av'
import { usePreferences } from '../../lib/PreferencesContext'

// ─── Backend endpoint ────────────────────────────────────────────────────────
const DEEPFAKE_API = 'https://civix-shield-final.vercel.app/api/deepfake'

interface DeepfakeResult {
  score: number
  risk: 'Safe' | 'Suspicious' | 'High Risk'
  explanation: string
  frames_analyzed: number
  is_mock: boolean
}

// ─── Colour helpers (mirrors the web page logic) ─────────────────────────────
function riskColor(risk: string): string {
  if (risk === 'High Risk')  return '#DC2626'
  if (risk === 'Suspicious') return '#FFD700'
  return '#4CAF50'
}

export default function DeepfakeScreen() {
  const { colors } = usePreferences()
  const [mediaUri,   setMediaUri]   = useState<string | null>(null)
  const [mediaType,  setMediaType]  = useState<'image' | 'video' | null>(null)
  const [mimeType,   setMimeType]   = useState<string>('image/jpeg')
  const [isLoading,  setIsLoading]  = useState(false)
  const [result,     setResult]     = useState<DeepfakeResult | null>(null)
  const [error,      setError]      = useState<string | null>(null)

  // ── Pick media ──────────────────────────────────────────────────────────────
  async function pickMedia(mode: 'image' | 'video') {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!granted) {
      setError('Gallery permission is required to pick media.')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mode === 'image'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
      allowsMultipleSelection: false,
    })

    if (result.canceled || !result.assets?.length) return

    const asset = result.assets[0]
    setMediaUri(asset.uri)
    setMediaType(mode)
    setMimeType(asset.mimeType ?? (mode === 'image' ? 'image/jpeg' : 'video/mp4'))
    setResult(null)
    setError(null)
    await Haptics.selectionAsync()
  }

  // ── Analyze via backend ─────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!mediaUri) return
    setIsLoading(true)
    setError(null)
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      // Build multipart/form-data — mirrors what the web page does with FormData
      const formData = new FormData()
      const filename = mediaUri.split('/').pop() ?? 'upload'
      formData.append('file', {
        uri:  Platform.OS === 'ios' ? mediaUri.replace('file://', '') : mediaUri,
        name: filename,
        type: mimeType,
      } as any)

      const res = await fetch(DEEPFAKE_API, {
        method:  'POST',
        headers: { Accept: 'application/json' },
        body:    formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `Server error ${res.status}`)

      setResult(data)
      if (data.risk === 'High Risk') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } else if (data.risk === 'Suspicious') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
    } catch (err: any) {
      setError(err.message ?? 'Analysis failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Reset ───────────────────────────────────────────────────────────────────
  function handleReset() {
    setMediaUri(null)
    setMediaType(null)
    setResult(null)
    setError(null)
  }

  const color = result ? riskColor(result.risk) : colors.primary

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <Text style={[styles.title, { color: colors.primary }]}>&gt; DEEPFAKE DETECTOR</Text>
        <Text style={[styles.subtitle, { color: colors.textDim }]}>
          Upload a photo or video to detect AI-generated or manipulated media
        </Text>

        {/* Pick buttons */}
        {!mediaUri && (
          <View style={styles.pickRow}>
            <TouchableOpacity style={[styles.pickBtn, { borderColor: colors.primary }]} onPress={() => pickMedia('image')}>
              <Text style={[styles.pickBtnText, { color: colors.primary }]}>[ 🖼  PICK IMAGE ]</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickBtn, { borderColor: colors.warning }]} onPress={() => pickMedia('video')}>
              <Text style={[styles.pickBtnText, { color: colors.warning }]}>[ 🎥 PICK VIDEO ]</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Media preview */}
        {mediaUri && mediaType === 'image' && (
          <View style={[styles.previewBox, { backgroundColor: colors.card, borderColor: colors.primary + '33' }]}>
            <Image source={{ uri: mediaUri }} style={styles.previewImage} resizeMode="contain" />
          </View>
        )}
        {mediaUri && mediaType === 'video' && (
          <View style={[styles.previewBox, { backgroundColor: colors.card, borderColor: colors.primary + '33' }]}>
            <Video
              source={{ uri: mediaUri }}
              style={styles.previewImage}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              isLooping={false}
            />
          </View>
        )}

        {/* Scan button */}
        {mediaUri && !result && !isLoading && (
          <TouchableOpacity style={[styles.scanBtn, { borderColor: colors.primary }]} onPress={handleAnalyze}>
            <Text style={[styles.scanBtnText, { color: colors.primary }]}>[ SCAN FOR DEEPFAKE ]</Text>
          </TouchableOpacity>
        )}

        {/* Change / Reset button */}
        {mediaUri && !isLoading && (
          <TouchableOpacity style={[styles.resetBtn, { borderColor: colors.navBorder }]} onPress={handleReset}>
            <Text style={[styles.resetBtnText, { color: colors.textDim }]}>[ ↺  CHANGE FILE ]</Text>
          </TouchableOpacity>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.primary + '22' }]}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.primary }]}>EXECUTING NEURAL FORENSICS...</Text>
            <Text style={[styles.loadingSubtext, { color: colors.textDim }]}>
              Analyzing frames for synthetic manipulation signatures
            </Text>
          </View>
        )}

        {/* Result */}
        {result && !isLoading && (
          <View style={[styles.resultCard, { backgroundColor: colors.card, borderTopColor: color, borderColor: colors.navBorder }]}>

            {/* Risk label + score */}
            <View style={styles.resultHeader}>
              <View>
                <Text style={[styles.resultMeta, { color: colors.textDim }]}>DEEPFAKE RISK LEVEL</Text>
                <Text style={[styles.riskLabel, { color }]}>{result.risk.toUpperCase()}</Text>
              </View>
              <View style={styles.resultScoreBox}>
                <Text style={[styles.resultMeta, { color: colors.textDim }]}>AI MANIPULATION SCORE</Text>
                <Text style={[styles.scoreNum, { color }]}>{result.score}<Text style={styles.scorePct}>%</Text></Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
              <View style={[styles.progressFill, { width: `${result.score}%` as any, backgroundColor: color }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={[styles.progressLabel, { color: colors.textDim }]}>Safe (0%)</Text>
              <Text style={[styles.progressLabel, { color: colors.textDim }]}>High Risk (100%)</Text>
            </View>

            {/* Explanation */}
            <View style={[styles.explanationBox, { backgroundColor: colors.background }]}>
              <Text style={[styles.explanationTitle, { color: colors.primary }]}>ANALYSIS REPORT</Text>
              <Text style={[styles.explanationText, { color: colors.textDim }]}>&gt; {result.explanation}</Text>
              <Text style={[styles.framesText, { color: colors.textDim }]}>
                Frames analyzed: {result.frames_analyzed}
              </Text>
              {result.is_mock && (
                <Text style={styles.mockWarning}>
                  * Demo mode — Hive API not configured in environment.
                </Text>
              )}
            </View>

            {/* Scan another */}
            <TouchableOpacity style={[styles.scanAnotherBtn, { borderColor: colors.navBorder }]} onPress={handleReset}>
              <Text style={[styles.scanAnotherText, { color: colors.textDim }]}>[ ↺  SCAN OTHER VIDEO/PHOTO ]</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error */}
        {error && !isLoading && (
          <View style={[styles.errorBox, { backgroundColor: colors.danger + '11', borderColor: colors.danger + '44' }]}>
            <Text style={[styles.errorText, { color: colors.danger }]}>[ ERROR ] {error}</Text>
          </View>
        )}

        {/* Info chips */}
        {!result && (
          <View style={styles.infoRow}>
            <View style={[styles.infoChip, { backgroundColor: colors.card, borderTopColor: colors.primary }]}>
              <Text style={[styles.infoChipText, { color: colors.textDim }]}>IMAGES SUPPORTED</Text>
            </View>
            <View style={[styles.infoChip, { backgroundColor: colors.card, borderTopColor: colors.warning }]}>
              <Text style={[styles.infoChipText, { color: colors.textDim }]}>VIDEO SUPPORTED</Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#050505' },
  scroll:           { padding: 16, paddingBottom: 40 },

  title:            { color: '#00E5FF', fontSize: 18, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 3, marginBottom: 4 },
  subtitle:         { color: '#666', fontSize: 12, fontFamily: 'monospace', marginBottom: 24 },

  pickRow:          { gap: 12, marginBottom: 20 },
  pickBtn:          { borderWidth: 1, borderColor: '#00E5FF', borderRadius: 6, paddingVertical: 18, alignItems: 'center' },
  pickBtnText:      { color: '#00E5FF', fontFamily: 'monospace', fontWeight: '700', letterSpacing: 2 },

  previewBox:       { backgroundColor: '#0A0F14', borderColor: '#00E5FF22', borderWidth: 1, borderRadius: 8, overflow: 'hidden', marginBottom: 16, minHeight: 200, justifyContent: 'center', alignItems: 'center' },
  previewImage:     { width: '100%', height: 260 },
  videoPlaceholder: { fontSize: 40, marginBottom: 8 },
  videoName:        { color: '#888', fontSize: 12, fontFamily: 'monospace', paddingHorizontal: 16 },

  scanBtn:          { backgroundColor: 'transparent', borderColor: '#00E5FF', borderWidth: 2, borderRadius: 6, paddingVertical: 18, alignItems: 'center', marginBottom: 10 },
  scanBtnText:      { color: '#00E5FF', fontFamily: 'monospace', fontWeight: '900', fontSize: 14, letterSpacing: 2 },

  resetBtn:         { borderColor: '#333', borderWidth: 1, borderRadius: 6, paddingVertical: 12, alignItems: 'center', marginBottom: 20 },
  resetBtnText:     { color: '#555', fontFamily: 'monospace', fontSize: 12, letterSpacing: 1 },

  loadingBox:       { backgroundColor: '#0A0F14', borderColor: '#00E5FF22', borderWidth: 1, borderRadius: 8, padding: 40, alignItems: 'center', gap: 16, marginBottom: 16 },
  loadingText:      { color: '#00E5FF', fontFamily: 'monospace', fontWeight: '700', letterSpacing: 2, fontSize: 13, textAlign: 'center' },
  loadingSubtext:   { color: '#444', fontFamily: 'monospace', fontSize: 11, textAlign: 'center' },

  resultCard:       { backgroundColor: '#0A0F14', borderWidth: 1, borderColor: '#1a1a2e', borderTopWidth: 4, borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  resultHeader:     { flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  resultMeta:       { color: '#555', fontSize: 9, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 4 },
  riskLabel:        { fontSize: 26, fontWeight: '900', fontFamily: 'monospace' },
  resultScoreBox:   { alignItems: 'flex-end' },
  scoreNum:         { fontSize: 44, fontWeight: '900', fontFamily: 'monospace' },
  scorePct:         { fontSize: 28 },

  progressTrack:    { height: 10, backgroundColor: '#000', marginHorizontal: 20, borderRadius: 2, overflow: 'hidden' },
  progressFill:     { height: '100%', borderRadius: 2 },
  progressLabels:   { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 6, marginBottom: 16 },
  progressLabel:    { color: '#333', fontSize: 9, fontFamily: 'monospace' },

  explanationBox:   { backgroundColor: '#05080a', margin: 12, borderRadius: 6, padding: 16 },
  explanationTitle: { color: '#00E5FF', fontFamily: 'monospace', fontWeight: '700', fontSize: 11, letterSpacing: 2, marginBottom: 10 },
  explanationText:  { color: '#aaa', fontFamily: 'monospace', fontSize: 13, lineHeight: 20 },
  framesText:       { color: '#444', fontFamily: 'monospace', fontSize: 10, marginTop: 10 },
  mockWarning:      { color: '#b45309', fontFamily: 'monospace', fontSize: 10, marginTop: 8 },

  scanAnotherBtn:   { margin: 12, marginTop: 4, borderWidth: 1, borderColor: '#333', borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  scanAnotherText:  { color: '#666', fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 },

  errorBox:         { backgroundColor: '#1a0000', borderColor: '#DC262644', borderWidth: 1, borderRadius: 6, padding: 16, marginBottom: 16 },
  errorText:        { color: '#DC2626', fontFamily: 'monospace', fontSize: 12, fontWeight: '700', textAlign: 'center' },

  infoRow:          { flexDirection: 'row', gap: 12, marginTop: 20 },
  infoChip:         { flex: 1, backgroundColor: '#050505', borderTopWidth: 2, padding: 14 },
  infoChipText:     { color: '#555', fontFamily: 'monospace', fontSize: 9, letterSpacing: 2, fontWeight: '700' },
})
