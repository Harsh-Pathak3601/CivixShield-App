import { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Linking } from 'react-native'
import { TranslatedText as Text } from '../../lib/TranslatedText'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { analyzeThreat } from '../../lib/rulesEngine'
import { saveThreatLocally } from '../../lib/database'
import { usePreferences } from '../../lib/PreferencesContext'

const CIVIX_API = 'https://civix-shield-final.vercel.app/api/analyze'

export default function URLScannerScreen() {
  const { colors } = usePreferences()
  const [url,        setUrl]        = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [result,     setResult]     = useState<any>(null)

  async function handleScan() {
    if (!url.trim()) return
    setIsScanning(true)
    setResult(null)
    await Haptics.selectionAsync()

    // Quick local pre-check
    const localResult = analyzeThreat(url)

    try {
      const res  = await fetch(CIVIX_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ content: url, contentType: 'url' }),
      })
      const data = await res.json()

      setResult({ ...data, localScore: localResult.riskScore })

      await saveThreatLocally({
        sourceType:  'URL',
        sourceApp:   'url_scanner',
        content:     url,
        riskScore:   data.risk_score,
        riskLevel:   data.risk_level,
        redFlags:    data.red_flags ?? [],
        intercepted: false,
        synced:      true,
      })

      if (data.risk_score >= 50) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      }
    } catch {
      setResult({ risk_score: localResult.riskScore, risk_level: localResult.riskLevel,
        red_flags: localResult.matchedPatterns, localScore: localResult.riskScore })
    } finally {
      setIsScanning(false)
    }
  }

  const score = result?.risk_score ?? 0
  const color = score >= 80 ? colors.danger : score >= 50 ? '#FF6B35' : score >= 30 ? colors.warning : colors.success

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <Text style={[styles.title, { color: colors.primary }]}>{'>'} URL SCANNER</Text>
        <Text style={[styles.subtitle, { color: colors.textDim }]}>Paste a suspicious link to check for phishing & malware</Text>

        <TextInput
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.primary + '33', color: colors.text }]}
          value={url}
          onChangeText={setUrl}
          placeholder="https://suspicious-link.com/verify..."
          placeholderTextColor={colors.textDim}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        <TouchableOpacity
          style={[styles.scanBtn, { borderColor: colors.primary }, isScanning && { borderColor: '#333' }]}
          onPress={handleScan}
          disabled={isScanning}>
          {isScanning
            ? <ActivityIndicator color={colors.primary} />
            : <Text style={[styles.scanBtnText, { color: colors.primary }]}>[ ANALYZE URL ]</Text>
          }
        </TouchableOpacity>

        {result && (
          <View style={[styles.resultCard, { borderColor: color, backgroundColor: colors.card }]}>
            <Text style={[styles.score, { color }]}>{score}/100</Text>
            <Text style={[styles.level, { color }]}>
              {(result.risk_level ?? 'unknown').toUpperCase()} RISK
            </Text>

            {result.safe_browsing_result && (
              <Text style={[styles.safeBrowsing, { color: colors.textDim }]}>
                Google Safe Browsing: {result.safe_browsing_result}
              </Text>
            )}

            {(result.red_flags ?? []).length > 0 && (
              <View style={[styles.flags, { backgroundColor: colors.danger + '11' }]}>
                <Text style={styles.flagsTitle}>RED FLAGS:</Text>
                {(result.red_flags).map((f: string, i: number) => (
                  <Text key={i} style={styles.flagItem}>⚑ {f}</Text>
                ))}
              </View>
            )}

            {score >= 50 && (
              <View style={[styles.warningBox, { backgroundColor: colors.danger + '11', borderColor: colors.danger + '44' }]}>
                <Text style={[styles.warningText, { color: colors.danger }]}>
                  ⚠️ DO NOT click this link. It may steal your personal information,
                  bank credentials, or OTPs.
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.scanAnotherBtn} onPress={() => { setUrl(''); setResult(null); }}>
              <Text style={styles.scanAnotherText}>[ ↺  SCAN ANOTHER LINK ]</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#050505' },
  scroll:      { padding: 16 },
  title:       { color: '#00E5FF', fontSize: 18, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 3, marginBottom: 4 },
  subtitle:    { color: '#666', fontSize: 12, fontFamily: 'monospace', marginBottom: 20 },
  input:       { backgroundColor: '#0A0F14', borderColor: '#00E5FF33', borderWidth: 1, borderRadius: 8,
                 color: '#fff', padding: 14, fontSize: 13, fontFamily: 'monospace', marginBottom: 16 },
  scanBtn:     { borderWidth: 1, borderColor: '#00E5FF', borderRadius: 6, paddingVertical: 16, alignItems: 'center', marginBottom: 24 },
  scanBtnText: { color: '#00E5FF', fontFamily: 'monospace', fontWeight: '700', letterSpacing: 2 },
  resultCard:  { borderWidth: 1, borderRadius: 8, padding: 20, backgroundColor: '#0A0F14' },
  score:       { fontSize: 52, fontWeight: '900', fontFamily: 'monospace', textAlign: 'center' },
  level:       { fontSize: 16, fontFamily: 'monospace', fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  safeBrowsing:{ color: '#888', fontSize: 12, fontFamily: 'monospace', textAlign: 'center', marginBottom: 12 },
  flags:       { backgroundColor: '#1a0a00', borderRadius: 6, padding: 12, marginBottom: 12 },
  flagsTitle:  { color: '#FF6B35', fontSize: 11, fontFamily: 'monospace', fontWeight: '700', marginBottom: 8 },
  flagItem:    { color: '#ffaa66', fontSize: 12, fontFamily: 'monospace', marginBottom: 4 },
  warningBox:  { backgroundColor: '#1a0000', borderRadius: 6, padding: 14, borderColor: '#DC262644', borderWidth: 1 },
  warningText: { color: '#DC2626', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  scanAnotherBtn:   { marginTop: 16, borderWidth: 1, borderColor: '#333', borderRadius: 6, paddingVertical: 14, alignItems: 'center' },
  scanAnotherText:  { color: '#666', fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 },
})
