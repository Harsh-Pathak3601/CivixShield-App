import { useEffect, useState } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Animated, Image } from 'react-native'
import { TranslatedText as Text } from '../../lib/TranslatedText'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Linking } from 'react-native'
import { getThreatCount, getAllThreats, ThreatRecord } from '../../lib/database'
import { usePreferences } from '../../lib/PreferencesContext'
import { t } from '../../lib/i18n'

const { width } = Dimensions.get('window')

export default function DashboardScreen() {
  const router = useRouter()
  const { colors, language, theme } = usePreferences()
  const [totalThreats,     setTotalThreats]     = useState(0)
  const [recentThreats,    setRecentThreats]     = useState<ThreatRecord[]>([])
  const [protectionActive, setProtectionActive]  = useState(true)
  const [pulseAnim] = useState(new Animated.Value(1))

  useEffect(() => {
    loadStats()
    const interval = setInterval(loadStats, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  async function loadStats() {
    const count   = await getThreatCount()
    const threats = await getAllThreats()
    setTotalThreats(count)
    setRecentThreats(threats.slice(0, 5))
  }

  const handleNavigation = (path: any) => {
    Haptics.selectionAsync()
    router.push(path)
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <LinearGradient 
        colors={theme === 'dark' ? ['#02040A', '#050B14', '#02040A'] : [colors.background, colors.card, colors.background]} 
        style={StyleSheet.absoluteFillObject} 
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={[styles.tagline, { color: colors.textDim }]}>{t('advanced_interception', language)}</Text>
        </View>

        {/* Protection Status Banner */}
        <LinearGradient
          colors={protectionActive ? [colors.neonGlow, colors.card] : [colors.danger + '22', colors.card]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.statusBanner, { shadowColor: protectionActive ? colors.neon : colors.danger }]}
        >
          <Animated.View style={[styles.statusDotBox, { transform: [{ scale: pulseAnim }] }]}>
            <View style={[styles.statusDot, { backgroundColor: protectionActive ? colors.primary : colors.danger, shadowColor: protectionActive ? colors.primary : colors.danger }]} />
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusText, { color: protectionActive ? colors.primary : colors.danger }]}>
              {protectionActive ? t('system_active', language) : t('system_degraded', language)}
            </Text>
            <Text style={[styles.statusSub, { color: colors.textDim }]}>
              {t('system_secured', language)}
            </Text>
          </View>
        </LinearGradient>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard label={t('total_threats', language)} value={totalThreats} color={colors.danger} />
          <StatCard label={t('links_scanned', language)} value={recentThreats.filter(t => t.sourceType === 'URL').length} color={colors.primary} />
        </View>

        {/* Quick Actions Grid */}
        <Text style={[styles.sectionTitle, { color: colors.textDim }]}>{t('cmd_interface', language)}</Text>
        <View style={styles.actionsGrid}>
          <ActionButton label={t('sms_engine', language)} icon="chatbubble-ellipses" color={colors.primary} onPress={() => handleNavigation('/sms-shield')} />
          <ActionButton label={t('url_scanner', language)} icon="link" color={colors.primary} onPress={() => handleNavigation('/url-scanner')} />
          <ActionButton label={t('deepfake_detect', language)} icon="scan" color={colors.danger} onPress={() => handleNavigation('/deepfake')} />
        </View>

        {/* WhatsApp Bot Link */}
        <TouchableOpacity style={[styles.vaultBtn, { shadowColor: '#000' }]} onPress={() => {
          Haptics.selectionAsync()
          Linking.openURL('https://wa.me/15551818730')
        }}>
          <LinearGradient colors={[colors.success + '15', colors.background]} style={[styles.vaultGradient, { borderColor: colors.success + '33' }]}>
            <Ionicons name="logo-whatsapp" size={28} color={colors.success} style={{ marginRight: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.vaultText, { color: colors.success }]}>{t('whatsapp_bot', language)}</Text>
              <Text style={[styles.vaultSub, { color: colors.textDim }]}>{t('whatsapp_sub', language)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.success} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Threat Feed Link */}
        <TouchableOpacity style={[styles.vaultBtn, { shadowColor: '#000' }]} onPress={() => handleNavigation('/threat-feed')}>
          <LinearGradient colors={[colors.warning + '15', colors.background]} style={[styles.vaultGradient, { borderColor: colors.warning + '33' }]}>
            <Ionicons name="server" size={28} color={colors.warning} style={{ marginRight: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.vaultText, { color: colors.warning }]}>{t('vault_title', language)}</Text>
              <Text style={[styles.vaultSub, { color: colors.textDim }]}>{t('vault_sub', language)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.warning} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent Activity */}
        {recentThreats.length > 0 && (
          <View style={styles.threatsSection}>
            <Text style={[styles.sectionTitle, { color: colors.textDim }]}>{t('recent_activity', language)}</Text>
            {recentThreats.map((threat, idx) => (
              <ThreatCard key={threat.id ?? idx} threat={threat} />
            ))}
          </View>
        )}

        {/* CivixShield Website Link */}
        <Text style={[styles.sectionTitle, { color: colors.textDim, marginTop: 12 }]}>WEBSITE</Text>
        <TouchableOpacity style={[styles.vaultBtn, { shadowColor: '#000', marginTop: 4 }]} onPress={() => {
          Haptics.selectionAsync()
          Linking.openURL('https://civix-shield-final.vercel.app/')
        }}>
          <LinearGradient colors={[colors.primary + '15', colors.background]} style={[styles.vaultGradient, { borderColor: colors.primary + '33' }]}>
            <Ionicons name="globe-outline" size={28} color={colors.primary} style={{ marginRight: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.vaultText, { color: colors.primary }]}>Visit our CivixShield Website</Text>
              <Text style={[styles.vaultSub, { color: colors.textDim }]}>Explore our full suite of security tools, manage your account securely, and access enhanced threat feeds online.</Text>
            </View>
            <Ionicons name="open-outline" size={24} color={colors.primary} />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const { colors, theme } = usePreferences()
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.navBorder }]}>
      <BlurView intensity={theme === 'dark' ? 20 : 80} tint={theme} style={StyleSheet.absoluteFillObject} />
      <View style={[styles.statTopBar, { backgroundColor: color }]} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textDim }]}>{label}</Text>
    </View>
  )
}

function ActionButton({ label, icon, color, onPress }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; color: string; onPress: () => void
}) {
  const { colors, theme } = usePreferences()
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.actionBtn, { borderColor: colors.navBorder }]}>
      <BlurView intensity={theme === 'dark' ? 40 : 80} tint={theme} style={[StyleSheet.absoluteFillObject, styles.actionBlur]} />
      <View style={[styles.actionIconWrapper, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  )
}

function ThreatCard({ threat }: { threat: ThreatRecord }) {
  const { colors } = usePreferences()
  const levelColor =
    threat.riskLevel === 'critical' ? colors.danger :
    threat.riskLevel === 'high'     ? colors.danger :
    threat.riskLevel === 'medium'   ? colors.warning : colors.success

  return (
    <View style={[styles.threatCard, { backgroundColor: colors.card, borderColor: colors.navBorder }]}>
      <View style={[styles.threatLeftAccent, { backgroundColor: levelColor }]} />
      <View style={styles.threatHeader}>
        <Text style={[styles.threatLevel, { color: levelColor }]}>
          [ {threat.riskLevel?.toUpperCase()} ]
        </Text>
        <Text style={[styles.threatType, { color: colors.textDim }]}>{threat.sourceType}</Text>
      </View>
      <Text style={[styles.threatContent, { color: colors.text }]} numberOfLines={2}>{threat.content}</Text>
      {threat.redFlags && threat.redFlags.length > 0 && (
        <Text style={[styles.threatFlag, { color: colors.warning }]}>⚑ {threat.redFlags[0]}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#02040A' },
  scroll:          { paddingHorizontal: 18, paddingTop: 12 },
  header:          { alignItems: 'center', marginBottom: 24, marginTop: 10 },
  logoImage:       { width: width * 0.7, height: 60, marginBottom: 4 },
  tagline:         { color: '#8892B0', fontSize: 10, fontFamily: 'monospace', marginTop: 8, letterSpacing: 2 },
  
  statusBanner:    { flexDirection: 'row', padding: 18, borderRadius: 12, marginBottom: 24, alignItems: 'center', shadowColor: '#00E5FF', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  statusDotBox:    { marginRight: 16 },
  statusDot:       { width: 12, height: 12, borderRadius: 6, shadowColor: '#00E5FF', shadowOpacity: 1, shadowRadius: 8 },
  statusText:      { fontSize: 14, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1 },
  statusSub:       { color: '#A0B2C6', fontSize: 10, fontFamily: 'monospace', marginTop: 4 },
  
  statsRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  statCard:        { width: (width - 48) / 2, alignItems: 'center', paddingVertical: 18, borderRadius: 12, backgroundColor: 'rgba(10, 15, 25, 0.4)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 229, 255, 0.1)' },
  statTopBar:      { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  statValue:       { fontSize: 26, fontWeight: '900', fontFamily: 'monospace' },
  statLabel:       { color: '#8892B0', fontSize: 9, fontFamily: 'monospace', textAlign: 'center', marginTop: 6, letterSpacing: 1 },
  
  sectionTitle:    { color: '#A0B2C6', fontSize: 13, fontWeight: '700', letterSpacing: 1.5, marginBottom: 16, textTransform: 'uppercase' },
  
  actionsGrid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  actionBtn:       { width: (width - 48) / 2, padding: 16, borderRadius: 16, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)', backgroundColor: 'transparent' },
  actionBlur:      { borderRadius: 16 },
  actionIconWrapper: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionIcon:      { fontSize: 20 },
  actionLabel:     { fontSize: 11, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1 },

  vaultBtn:        { borderRadius: 16, overflow: 'hidden', marginBottom: 30, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  vaultGradient:   { flexDirection: 'row', alignItems: 'center', padding: 20, borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.2)', borderRadius: 16 },
  vaultIcon:       { fontSize: 28, marginRight: 16 },
  vaultText:       { color: '#FFD700', fontSize: 14, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1 },
  vaultSub:        { color: '#8892B0', fontSize: 11, fontFamily: 'monospace', marginTop: 4 },
  vaultArrow:      { color: '#FFD700', fontSize: 24, fontFamily: 'monospace', fontWeight: '300' },
  
  threatsSection:  { marginTop: 10 },
  threatCard:      { backgroundColor: 'rgba(10, 15, 25, 0.7)', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'column', position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  threatLeftAccent:{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  threatHeader:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingLeft: 8 },
  threatLevel:     { fontSize: 11, fontFamily: 'monospace', fontWeight: '800', letterSpacing: 1 },
  threatType:      { color: '#556677', fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, fontWeight: '700' },
  threatContent:   { color: '#C0D0E0', fontSize: 13, lineHeight: 20, marginBottom: 8, paddingLeft: 8 },
  threatFlag:      { color: '#FF6B35', fontSize: 11, fontFamily: 'monospace', paddingLeft: 8 },
})
