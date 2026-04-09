import { useState, useEffect } from 'react'
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { TranslatedText as Text } from '../../lib/TranslatedText'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { getAllThreats, clearAllThreats, ThreatRecord } from '../../lib/database'
import { usePreferences } from '../../lib/PreferencesContext'

/**
 * ThreatVaultScreen — Offline-Persistent Local Threat History (Missing Feature #4)
 *
 * This addresses the missing.md gap:
 * "No offline-accessible threat log that retains history unconditionally
 *  without a cloud login."
 *
 * All data comes from the local SQLite database — works completely offline.
 */
export default function ThreatFeedScreen() {
  const { colors } = usePreferences()
  const [threats,       setThreats]       = useState<ThreatRecord[]>([])
  const [filterLevel,   setFilterLevel]   = useState<string | null>(null)
  const [isLoading,     setIsLoading]     = useState(true)

  useEffect(() => { loadThreats() }, [])

  async function loadThreats() {
    setIsLoading(true)
    const all = await getAllThreats()
    setThreats(all)
    setIsLoading(false)
  }

  async function handleClear() {
    await clearAllThreats()
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    loadThreats()
  }

  const filtered = filterLevel
    ? threats.filter(t => t.riskLevel === filterLevel)
    : threats

  const criticalCount = threats.filter(t => t.riskLevel === 'critical').length
  const highCount     = threats.filter(t => t.riskLevel === 'high').length

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>{'>'} THREAT FEED</Text>
        <Text style={[styles.subtitle, { color: colors.textDim }]}>Offline-persistent threat feed — {threats.length} records</Text>

        {/* Stats summary */}
        <View style={styles.statsRow}>
          <Text style={[styles.criticalBadge, { color: colors.danger }]}>Critical: {criticalCount}</Text>
          <Text style={[styles.highBadge, { color: '#FF6B35' }]}>High: {highCount}</Text>
          <Text style={[styles.totalBadge, { color: colors.textDim }]}>Total: {threats.length}</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {[null, 'critical', 'high', 'medium', 'low'].map(level => (
            <TouchableOpacity
              key={String(level)}
              style={[styles.filterBtn, { borderColor: colors.border }, filterLevel === level && { borderColor: colors.primary, backgroundColor: colors.primary + '11' }]}
              onPress={() => { setFilterLevel(level); Haptics.selectionAsync() }}>
              <Text style={[styles.filterText, { color: colors.textDim }, filterLevel === level && { color: colors.primary }]}>
                {level === null ? 'ALL' : level.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id ?? Math.random())}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ThreatFeedCard threat={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.success }]}>
              {isLoading ? 'Loading feed...' : '✅ No threats recorded yet.\nAll clear.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          threats.length > 0 ? (
            <TouchableOpacity style={[styles.clearBtn, { borderColor: colors.danger + '44' }]} onPress={handleClear}>
              <Text style={[styles.clearBtnText, { color: colors.danger }]}>[ CLEAR FEED ]</Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </SafeAreaView>
  )
}

function ThreatFeedCard({ threat }: { threat: ThreatRecord }) {
  const { colors } = usePreferences()
  const levelColor =
    threat.riskLevel === 'critical' ? colors.danger :
    threat.riskLevel === 'high'     ? '#FF6B35' :
    threat.riskLevel === 'medium'   ? colors.warning : colors.success

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderLeftColor: levelColor }]}>

      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={[styles.levelBadge, { backgroundColor: levelColor + '22', borderColor: levelColor + '44' }]}>
          <Text style={[styles.levelText, { color: levelColor }]}>
            {threat.riskLevel?.toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.typeText, { color: colors.textDim }]}>{threat.sourceType}</Text>
        <Text style={[styles.scoreText, { color: colors.text }]}>{threat.riskScore}/100</Text>
      </View>

      {/* Source */}
      <Text style={[styles.sourceText, { color: colors.textDim }]}>
        From: {threat.sourceApp.length > 30 ? threat.sourceApp.slice(0, 30) + '...' : threat.sourceApp}
      </Text>

      {/* Content preview */}
      <Text style={[styles.contentText, { color: colors.text }]} numberOfLines={2}>{threat.content}</Text>

      {/* Red flags */}
      {threat.redFlags.slice(0, 2).map((flag, i) => (
        <Text key={i} style={[styles.flagText, { color: colors.warning }]}>⚑ {flag}</Text>
      ))}

      {/* Timestamp and intercepted badge */}
      <View style={styles.cardFooter}>
        <Text style={[styles.timeText, { color: colors.textDim }]}>{threat.createdAt?.slice(0, 16) ?? ''}</Text>
        {threat.intercepted && (
          <Text style={[styles.interceptedBadge, { color: colors.success }]}>AUTO-INTERCEPTED</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#050505' },
  header:            { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title:             { color: '#00E5FF', fontSize: 18, fontFamily: 'monospace', fontWeight: '700', letterSpacing: 3 },
  subtitle:          { color: '#666', fontSize: 11, fontFamily: 'monospace', marginTop: 4, marginBottom: 12 },
  statsRow:          { flexDirection: 'row', gap: 12, marginBottom: 12 },
  criticalBadge:     { color: '#DC2626', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' },
  highBadge:         { color: '#FF6B35', fontSize: 12, fontFamily: 'monospace', fontWeight: '700' },
  totalBadge:        { color: '#666', fontSize: 12, fontFamily: 'monospace' },
  filterRow:         { flexDirection: 'row', gap: 8 },
  filterBtn:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: '#333' },
  filterBtnActive:   { borderColor: '#00E5FF', backgroundColor: '#00E5FF11' },
  filterText:        { color: '#666', fontSize: 10, fontFamily: 'monospace' },
  filterTextActive:  { color: '#00E5FF' },
  list:              { paddingHorizontal: 16, paddingBottom: 32 },
  card:              { backgroundColor: '#0A0F14', borderRadius: 8, padding: 14, marginBottom: 8, borderLeftWidth: 3 },
  cardHeader:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  levelBadge:        { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 },
  levelText:         { fontSize: 10, fontFamily: 'monospace', fontWeight: '700' },
  typeText:          { color: '#888', fontSize: 11, fontFamily: 'monospace', flex: 1 },
  scoreText:         { color: '#fff', fontSize: 13, fontFamily: 'monospace', fontWeight: '700' },
  sourceText:        { color: '#555', fontSize: 11, fontFamily: 'monospace', marginBottom: 6 },
  contentText:       { color: '#aaa', fontSize: 12, lineHeight: 18, marginBottom: 6 },
  flagText:          { color: '#FF6B35', fontSize: 11, fontFamily: 'monospace', marginBottom: 2 },
  cardFooter:        { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  timeText:          { color: '#444', fontSize: 10, fontFamily: 'monospace' },
  interceptedBadge:  { color: '#4CAF50', fontSize: 10, fontFamily: 'monospace', fontWeight: '700' },
  empty:             { alignItems: 'center', paddingTop: 80 },
  emptyText:         { color: '#4CAF50', fontSize: 14, fontFamily: 'monospace', textAlign: 'center', lineHeight: 24 },
  clearBtn:          { borderColor: '#DC262644', borderWidth: 1, borderRadius: 6, padding: 16, alignItems: 'center', marginTop: 16 },
  clearBtnText:      { color: '#DC2626', fontFamily: 'monospace', fontSize: 12, letterSpacing: 2 },
})
