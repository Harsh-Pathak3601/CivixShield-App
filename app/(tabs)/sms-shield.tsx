import { useState, useRef } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { TranslatedText as Text } from '../../lib/TranslatedText'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { analyzeThreat } from '../../lib/rulesEngine'
import { saveThreatLocally } from '../../lib/database'
import { showThreatAlert } from '../../lib/threatAlert'
import { usePreferences } from '../../lib/PreferencesContext'

const CIVIX_API = 'https://civix-shield-final.vercel.app/api/analyze'

export default function SMSShieldScreen() {
  const { colors } = usePreferences()
  const [inputText,  setInputText]  = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [result,     setResult]     = useState<any>(null)

  async function handleScan() {
    if (!inputText.trim()) return
    setIsScanning(true)
    setResult(null)
    await Haptics.selectionAsync()

    // ── Step 1: Instant local analysis (offline, <2ms) ────────────────────
    const localResult = analyzeThreat(inputText)
    setResult({ ...localResult, source: 'local', loading: true })

    try {
      // ── Step 2: Deep AI analysis via Gemini backend ───────────────────
      const res = await fetch(CIVIX_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: inputText, contentType: 'text' }),
      })
      const data = await res.json()

      const finalResult = { ...data, localScore: localResult.riskScore, loading: false }
      setResult(finalResult)

      // Save to local vault
      await saveThreatLocally({
        sourceType:  'SMS',
        sourceApp:   'manual_scan',
        content:     inputText,
        riskScore:   data.risk_score,
        riskLevel:   data.risk_level,
        redFlags:    data.red_flags ?? localResult.matchedPatterns,
        intercepted: false,
        synced:      true,
      })

      if (data.risk_score > 40) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }

    } catch (err) {
      setResult({ ...localResult, loading: false, risk_score: localResult.riskScore,
        risk_level: localResult.riskLevel, red_flags: localResult.matchedPatterns })
    } finally {
      setIsScanning(false)
    }
  }

  const riskScore = result?.risk_score ?? result?.riskScore ?? 0
  const riskColor = riskScore >= 80 ? colors.danger : riskScore >= 50 ? '#FF6B35' : riskScore >= 30 ? colors.warning : colors.success

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Text style={[styles.title, { color: colors.primary }]}>{'>'} SMS SHIELD</Text>
        <Text style={[styles.subtitle, { color: colors.textDim }]}>Paste a suspicious SMS, WhatsApp message, or email</Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.primary + '33', color: colors.text }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Paste suspicious message here..."
          placeholderTextColor={colors.textDim}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          onFocus={() => Haptics.selectionAsync()}
        />

        <TouchableOpacity
          style={[styles.scanBtn, { borderColor: colors.primary }, isScanning && styles.scanBtnDisabled]}
          onPress={handleScan}
          disabled={isScanning}>
          {isScanning
            ? <ActivityIndicator color={colors.primary} />
            : <Text style={[styles.scanBtnText, { color: colors.primary }]}>[ ANALYZE THREAT ]</Text>
          }
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, { borderColor: riskColor, backgroundColor: colors.card }]}>
            <Text style={[styles.scoreText, { color: riskColor }]}>
              {riskScore}/100
            </Text>
            <Text style={[styles.levelText, { color: riskColor }]}>
              {(result.risk_level ?? result.riskLevel ?? 'unknown').toUpperCase()} RISK
            </Text>

            {/* Local pre-score indicator */}
            {result.localScore !== undefined && (
              <Text style={[styles.localScore, { color: colors.textDim }]}>
                Local Pre-Score: {result.localScore}/100  |  AI Score: {result.risk_score ?? 'N/A'}/100
              </Text>
            )}

            {/* Red Flags */}
            {(result.red_flags ?? result.matchedPatterns ?? []).length > 0 && (
              <View style={[styles.flagsContainer, { backgroundColor: colors.danger + '11' }]}>
                <Text style={styles.flagsTitle}>RED FLAGS DETECTED:</Text>
                {(result.red_flags ?? result.matchedPatterns).map((flag: string, i: number) => (
                  <Text key={i} style={styles.flagItem}>⚑ {flag}</Text>
                ))}
              </View>
            )}

            {result.scam_type && (
              <Text style={[styles.scamType, { color: colors.textDim }]}>Scam Type: {result.scam_type}</Text>
            )}

            <TouchableOpacity style={styles.scanAnotherBtn} onPress={() => { setInputText(''); setResult(null); }}>
              <Text style={styles.scanAnotherText}>[ ↺  SCAN ANOTHER MESSAGE ]</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#050505' },
  scroll:          { padding: 16 },
  title:           { color: '#00E5FF', fontSize: 18, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 3, marginBottom: 4 },
  subtitle:        { color: '#666', fontSize: 12, fontFamily: 'monospace', marginBottom: 20 },
  input:           { backgroundColor: '#0A0F14', borderColor: '#00E5FF33', borderWidth: 1, borderRadius: 8,
                     color: '#fff', padding: 14, fontSize: 14, minHeight: 120, marginBottom: 16 },
  scanBtn:         { backgroundColor: 'transparent', borderColor: '#00E5FF', borderWidth: 1, borderRadius: 6,
                     paddingVertical: 16, alignItems: 'center', marginBottom: 24 },
  scanBtnDisabled: { borderColor: '#333' },
  scanBtnText:     { color: '#00E5FF', fontFamily: 'monospace', fontWeight: '700', letterSpacing: 2 },
  resultCard:      { borderWidth: 1, borderRadius: 8, padding: 20, backgroundColor: '#0A0F14' },
  scoreText:       { fontSize: 52, fontWeight: '900', fontFamily: 'monospace', textAlign: 'center' },
  levelText:       { fontSize: 16, fontFamily: 'monospace', fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  localScore:      { color: '#666', fontSize: 11, fontFamily: 'monospace', textAlign: 'center', marginBottom: 12 },
  flagsContainer:  { backgroundColor: '#1a0a00', borderRadius: 6, padding: 12, marginBottom: 12 },
  flagsTitle:      { color: '#FF6B35', fontSize: 11, fontFamily: 'monospace', fontWeight: '700', marginBottom: 8 },
  flagItem:        { color: '#ffaa66', fontSize: 12, fontFamily: 'monospace', marginBottom: 4 },
  scamType:        { color: '#666', fontSize: 12, fontFamily: 'monospace', textAlign: 'center', marginBottom: 12 },
  scanAnotherBtn:  { marginTop: 16, borderWidth: 1, borderColor: '#333', borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  scanAnotherText: { color: '#666', fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 },
})
