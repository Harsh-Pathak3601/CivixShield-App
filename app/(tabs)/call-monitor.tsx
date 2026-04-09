import { useState, useRef, useEffect, useCallback } from 'react'
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Animated, Platform } from 'react-native'
import { TranslatedText as Text } from '../../lib/TranslatedText'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import * as Haptics from 'expo-haptics'
import { analyzeThreat } from '../../lib/rulesEngine'
import { saveThreatLocally } from '../../lib/database'
import { usePreferences } from '../../lib/PreferencesContext'

const CIVIX_API     = 'https://civix-shield-final.vercel.app/api/analyze'
const CHUNK_MS      = 6000   // 6-second chunks — enough speech for meaningful analysis
const MAX_LOG_ITEMS = 10

type Verdict = 'SAFE' | 'SUSPICIOUS' | 'HIGH RISK' | 'CRITICAL'

interface ChunkResult {
  score:     number
  verdict:   Verdict
  flags:     string[]
  transcript:string
  explanation:string
  time:      string
}

function scoreToVerdict(score: number): Verdict {
  if (score >= 80) return 'CRITICAL'
  if (score >= 50) return 'HIGH RISK'
  if (score >= 30) return 'SUSPICIOUS'
  return 'SAFE'
}

function verdictColor(verdict: Verdict, colors: any): string {
  switch (verdict) {
    case 'CRITICAL':   return colors.danger
    case 'HIGH RISK':  return '#FF6B35'
    case 'SUSPICIOUS': return colors.warning
    default:           return colors.success
  }
}

export default function CallMonitorScreen() {
  const { colors } = usePreferences()

  const [isListening,    setIsListening]    = useState(false)
  const [isAnalyzing,    setIsAnalyzing]    = useState(false)
  const [statusText,     setStatusText]     = useState('Ready')
  const [sessionScore,   setSessionScore]   = useState(0)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [currentVerdict, setCurrentVerdict] = useState<ChunkResult | null>(null)
  const [log,            setLog]            = useState<ChunkResult[]>([])

  const [fullTranscript, setFullTranscript] = useState('')
  const fullTranscriptRef = useRef('')

  const recordingRef  = useRef<Audio.Recording | null>(null)
  const chunkTimer    = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedTimer  = useRef<ReturnType<typeof setInterval> | null>(null)
  const pulseAnim     = useRef(new Animated.Value(1)).current
  const pulseAnimRef  = useRef<Animated.CompositeAnimation | null>(null)

  // ── Pulse animation ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isListening) {
      pulseAnimRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
        ])
      )
      pulseAnimRef.current.start()
    } else {
      pulseAnimRef.current?.stop()
      pulseAnim.setValue(1)
    }
  }, [isListening])

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => { return () => { cleanupAll() } }, [])

  function formatTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  }

  // ── Start monitoring ───────────────────────────────────────────────────────
  async function startListening() {
    const { granted } = await Audio.requestPermissionsAsync()
    if (!granted) {
      alert('Microphone permission is required for live call analysis.')
      return
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })

    setIsListening(true)
    setLog([])
    setCurrentVerdict(null)
    setSessionScore(0)
    setElapsedSeconds(0)
    setFullTranscript('')
    fullTranscriptRef.current = ''
    setStatusText('Listening...')
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

    // Elapsed-time counter
    elapsedTimer.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)

    // Start first chunk then rotate every CHUNK_MS
    await beginChunk()
    chunkTimer.current = setInterval(rotateAndAnalyze, CHUNK_MS)
  }

  // ── Begin a new audio chunk ────────────────────────────────────────────────
  async function beginChunk() {
    try {
      const rec = new Audio.Recording()
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      await rec.startAsync()
      recordingRef.current = rec
      setStatusText('Recording...')
    } catch (err) {
      console.warn('[LiveCall] Failed to start chunk:', err)
      setStatusText('Mic error — retry')
    }
  }

  // ── Stop current chunk, analyze it, start next ─────────────────────────────
  const rotateAndAnalyze = useCallback(async () => {
    if (!recordingRef.current) return

    setStatusText('Analyzing...')
    setIsAnalyzing(true)

    const prev = recordingRef.current
    recordingRef.current = null

    let uri: string | null = null
    try {
      await prev.stopAndUnloadAsync()
      uri = prev.getURI() ?? null
    } catch (err) {
      console.warn('[LiveCall] Could not stop chunk:', err)
    }

    // Start the next chunk immediately (parallel to analysis)
    await beginChunk()

    if (!uri) {
      setIsAnalyzing(false)
      setStatusText('Recording...')
      return
    }

    await analyzeChunk(uri)
    setIsAnalyzing(false)
  }, [])

  // ── Core analysis: local rules + optional API ──────────────────────────────
  async function analyzeChunk(uri: string) {
    let transcript  = ''
    let apiScore    = 0
    let apiFlags: string[] = []
    let apiLevel    = ''
    let apiExplanation = ''

    // ── Try sending audio to backend ──────────────────────────────────────────
    try {
      // expo-file-system works on Android file:// URIs — FileReader does NOT.
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      })

      const res = await fetch(CIVIX_API, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content:     (fullTranscriptRef.current ? fullTranscriptRef.current + '\n' : '') + '[LIVE_CALL_AUDIO]',
          contentType: 'audio',
          mediaBase64: base64,
          mediaType:   'audio/m4a',
        }),
      })

      if (res.ok) {
        const data  = await res.json()
        transcript  = data.transcript  ?? ''
        apiScore    = data.risk_score   ?? 0
        apiFlags    = data.red_flags    ?? []
        apiLevel    = data.risk_level   ?? ''
        apiExplanation = data.explanation ?? ''
      }
    } catch (err) {
      console.warn('[LiveCall] API unavailable, falling back to local engine:', err)
    }

    // Append new speech to the global transcript state
    if (transcript.trim().length > 0) {
      fullTranscriptRef.current += (fullTranscriptRef.current ? ' ' : '') + transcript
      setFullTranscript(fullTranscriptRef.current)
    }

    // ── Always run local rules engine ─────────────────────────────────────────
    // If the API returned a transcript, run rules on it; otherwise mark 0.
    const localResult = transcript
      ? analyzeThreat(transcript)
      : { riskScore: 0, matchedPatterns: [] as string[], riskLevel: 'low' as const }

    // Combine: take maximum of API score and local score
    const finalScore  = Math.max(apiScore, localResult.riskScore)
    const finalFlags  = apiFlags.length > 0 ? apiFlags : localResult.matchedPatterns
    const verdict     = scoreToVerdict(finalScore)

    const chunk: ChunkResult = {
      score:      finalScore,
      verdict,
      flags:      finalFlags,
      transcript,
      explanation:apiExplanation,
      time:       new Date().toLocaleTimeString(),
    }

    // Update highest session score
    setSessionScore(prev => Math.max(prev, finalScore))

    // Only add to the log if speech was actually detected OR it's a threat.
    // This prevents the log from being spammed with 'No speech detected' every 6 seconds.
    if (transcript.trim().length > 0 || finalScore >= 30) {
      setLog(prev => [chunk, ...prev.slice(0, MAX_LOG_ITEMS - 1)])
    }

    // Show current verdict prominently at top
    setCurrentVerdict(chunk)
    setStatusText(isListening ? 'Recording...' : 'Done')

    // Haptic feedback for threats
    if (finalScore >= 60) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } else if (finalScore >= 30) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    }

    // Persist high-risk results
    if (finalScore >= 50) {
      await saveThreatLocally({
        sourceType:  'CALL',
        sourceApp:   'live_call_monitor',
        content:     transcript || '[Live audio chunk]',
        riskScore:   finalScore,
        riskLevel:   apiLevel || localResult.riskLevel,
        redFlags:    finalFlags,
        intercepted: true,
        synced:      false,
      })
    }

    // Clean up temp file
    try { await FileSystem.deleteAsync(uri, { idempotent: true }) } catch {}
  }

  // ── Stop monitoring ────────────────────────────────────────────────────────
  async function stopListening() {
    cleanupAll()
    setIsListening(false)
    setStatusText('Stopped')
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  function cleanupAll() {
    if (chunkTimer.current)   { clearInterval(chunkTimer.current);   chunkTimer.current   = null }
    if (elapsedTimer.current) { clearInterval(elapsedTimer.current); elapsedTimer.current = null }
    if (recordingRef.current) {
      recordingRef.current.stopAndUnloadAsync().catch(() => {})
      recordingRef.current = null
    }
  }

  // ── Derived colors ─────────────────────────────────────────────────────────
  const sessionVerdict  = scoreToVerdict(sessionScore)
  const sessionColor    = verdictColor(sessionVerdict, colors)
  const currentColor    = currentVerdict ? verdictColor(currentVerdict.verdict, colors) : colors.textDim

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={[styles.title, { color: colors.primary }]}>{`>`} LIVE CALL MONITOR</Text>
        <Text style={[styles.subtitle, { color: colors.textDim }]}>Real-time AI analysis of active call audio</Text>

        {/* ── Header row: timer + pulse ── */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.timerLabel, { color: colors.textDim }]}>MONITORING TIME</Text>
            <Text style={[styles.timerValue, { color: isListening ? colors.success : colors.textDim }]}>
              {formatTime(elapsedSeconds)}
            </Text>
          </View>
          <View style={styles.statusPill}>
            {isAnalyzing && <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: 6 }} />}
            <Text style={[styles.statusText, { color: isListening ? colors.primary : colors.textDim }]}>
              {statusText.toUpperCase()}
            </Text>
            {isListening && (
              <Animated.View style={[styles.pulseDot, { backgroundColor: colors.success, transform: [{ scale: pulseAnim }] }]} />
            )}
          </View>
        </View>

        {/* ── Current verdict (big card) ── */}
        <View style={[styles.verdictCard, { borderColor: currentColor, backgroundColor: colors.card }]}>
          <Text style={[styles.verdictScore, { color: currentColor }]}>
            {currentVerdict ? currentVerdict.score : sessionScore}
          </Text>
          <Text style={[styles.verdictLabel, { color: currentColor }]}>
            {currentVerdict ? currentVerdict.verdict : (isListening ? 'LISTENING...' : 'WAITING')}
          </Text>
          {currentVerdict?.flags && currentVerdict.flags.length > 0 && (
            <View style={styles.flagsWrap}>
              {currentVerdict.flags.slice(0, 3).map((f, i) => (
                <View key={i} style={[styles.flagChip, { backgroundColor: currentColor + '22' }]}>
                  <Text style={[styles.flagText, { color: currentColor }]}>{f}</Text>
                </View>
              ))}
            </View>
          )}
          {fullTranscript ? (
            <Text style={[styles.transcriptText, { color: colors.textDim }]} numberOfLines={4}>
              "{fullTranscript}"
            </Text>
          ) : isListening ? (
            <Text style={[styles.transcriptText, { color: colors.textDim }]}>
              Waiting for next chunk analysis…
            </Text>
          ) : null}
        </View>

        {/* ── Forensic Report ── */}
        {currentVerdict?.explanation && isListening && (
          <View style={[styles.forensicCard, { borderColor: currentColor, backgroundColor: colors.card }]}>
            <Text style={[styles.forensicTitle, { color: currentColor }]}>LIVE FORENSIC ANALYSIS</Text>
            <Text style={[styles.forensicText, { color: colors.textDim }]}>{currentVerdict.explanation}</Text>
          </View>
        )}

        {/* ── Final Session Report ── */}
        {!isListening && sessionScore > 0 && currentVerdict && (
          <View style={[styles.forensicCard, { borderColor: sessionColor, backgroundColor: colors.card, borderWidth: 2 }]}>
            <Text style={[styles.forensicTitle, { color: sessionColor, fontSize: 13 }]}>FINAL SESSION FORENSIC REPORT</Text>
            <Text style={[styles.forensicText, { color: colors.textDim }]}>
              {currentVerdict.explanation || "No advanced threats detected during this call."}
            </Text>
            <Text style={[styles.sectionTitle, { color: sessionColor, marginTop: 12 }]}>FULL TRANSCRIPT:</Text>
            <Text style={{ fontFamily: 'monospace', fontSize: 10, color: colors.textDim, marginTop: 4 }}>
              {fullTranscript}
            </Text>
          </View>
        )}

        {/* ── Session score ── */}
        <View style={[styles.sessionRow, { backgroundColor: colors.card }]}>
          <Text style={[styles.sessionLabel, { color: colors.textDim }]}>SESSION PEAK</Text>
          <Text style={[styles.sessionScore, { color: sessionColor }]}>{sessionScore}/100</Text>
          <Text style={[styles.sessionVerdict, { color: sessionColor }]}>{sessionVerdict}</Text>
        </View>

        {/* ── Control button ── */}
        <TouchableOpacity
          style={[styles.btn, { borderColor: isListening ? colors.danger : colors.success }]}
          onPress={isListening ? stopListening : startListening}>
          <Text style={[styles.btnText, { color: isListening ? colors.danger : colors.success }]}>
            {isListening ? '[ ■  STOP MONITORING ]' : '[ ▶  START MONITORING ]'}
          </Text>
        </TouchableOpacity>

        {!isListening && !currentVerdict && (
          <View style={styles.hintBox}>
            <Text style={[styles.hintText, { color: colors.textDim }]}>
              Press Start, then answer your call.{'\n'}
              Every 6 seconds a new chunk is analyzed and a SAFE / HIGH RISK verdict is shown.
            </Text>
            <View style={[styles.warningBox, { backgroundColor: colors.warning + '11', borderColor: colors.warning + '33' }]}>
              <Text style={[styles.warningTitle, { color: colors.warning }]}>⚠️ Native Call Warning</Text>
              <Text style={[styles.warningText, { color: colors.warning }]}>
                Android OS restricts background microphone access during standard phone calls. To monitor a native call here, you must turn on Speakerphone.
              </Text>
            </View>
          </View>
        )}

        {/* ── Chunk log ── */}
        {log.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>{`>`} ANALYSIS LOG</Text>
            {log.map((item, i) => {
              const c = verdictColor(item.verdict, colors)
              return (
                <View key={i} style={[styles.logRow, { backgroundColor: colors.card, borderLeftColor: c }]}>
                  <View style={styles.logLeft}>
                    <Text style={[styles.logVerdict, { color: c }]}>{item.verdict}</Text>
                    <Text style={[styles.logTime, { color: colors.textDim }]}>{item.time}</Text>
                  </View>
                  <Text style={[styles.logScore, { color: c }]}>{item.score}</Text>
                  <Text style={[styles.logFlag, { color: colors.textDim }]} numberOfLines={1}>
                    {item.flags[0] || (item.transcript ? `"${item.transcript.slice(0, 40)}…"` : 'No speech detected')}
                  </Text>
                </View>
              )
            })}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1 },
  scroll:         { padding: 16, paddingBottom: 40 },
  title:          { fontSize: 18, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 3, marginBottom: 4 },
  subtitle:       { fontSize: 12, fontFamily: 'monospace', marginBottom: 24 },

  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  timerLabel:     { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, marginBottom: 2 },
  timerValue:     { fontSize: 30, fontFamily: 'monospace', fontWeight: '700' },
  statusPill:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText:     { fontSize: 11, fontFamily: 'monospace', fontWeight: '700' },
  pulseDot:       { width: 8, height: 8, borderRadius: 4 },

  verdictCard:    { borderWidth: 1, borderRadius: 10, padding: 24, alignItems: 'center', marginBottom: 16 },
  verdictScore:   { fontSize: 72, fontWeight: '900', fontFamily: 'monospace', lineHeight: 80 },
  verdictLabel:   { fontSize: 18, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 3, marginBottom: 12 },
  flagsWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 10 },
  flagChip:       { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 4 },
  flagText:       { fontSize: 10, fontFamily: 'monospace', fontWeight: '700' },
  transcriptText: { fontSize: 12, fontFamily: 'monospace', textAlign: 'center', lineHeight: 18, marginTop: 8, paddingHorizontal: 8 },

  sessionRow:     { flexDirection: 'row', alignItems: 'center', borderRadius: 8, padding: 14, marginBottom: 20, gap: 12 },
  sessionLabel:   { fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, flex: 1 },
  sessionScore:   { fontSize: 22, fontFamily: 'monospace', fontWeight: '900' },
  sessionVerdict: { fontSize: 11, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 1 },

  btn:            { borderWidth: 1, borderRadius: 6, paddingVertical: 18, alignItems: 'center', marginBottom: 12 },
  btnText:        { fontFamily: 'monospace', fontWeight: '700', letterSpacing: 2, fontSize: 14 },
  
  hintBox:        { marginBottom: 24 },
  hintText:       { fontSize: 11, fontFamily: 'monospace', textAlign: 'center', lineHeight: 18, marginBottom: 16, paddingHorizontal: 10 },
  warningBox:     { padding: 12, borderRadius: 6, borderWidth: 1 },
  warningTitle:   { fontSize: 11, fontFamily: 'monospace', fontWeight: '700', marginBottom: 4 },
  warningText:    { fontSize: 11, fontFamily: 'monospace', lineHeight: 16 },

  forensicCard:   { borderWidth: 1, borderRadius: 8, padding: 16, marginBottom: 16 },
  forensicTitle:  { fontSize: 11, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  forensicText:   { fontSize: 12, fontFamily: 'monospace', lineHeight: 18 },

  sectionTitle:   { fontSize: 11, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 10, marginTop: 8 },
  logRow:         { borderRadius: 6, padding: 12, marginBottom: 8, borderLeftWidth: 3, flexDirection: 'row', alignItems: 'center', gap: 10 },
  logLeft:        { width: 90 },
  logVerdict:     { fontSize: 11, fontFamily: 'monospace', fontWeight: '800' },
  logTime:        { fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  logScore:       { fontSize: 20, fontFamily: 'monospace', fontWeight: '900', width: 44, textAlign: 'right' },
  logFlag:        { flex: 1, fontSize: 11, fontFamily: 'monospace' },
})
