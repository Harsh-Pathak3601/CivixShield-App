import { Alert, Vibration } from 'react-native'
import * as Haptics from 'expo-haptics'

/**
 * threatAlert.ts — Native Threat Alert System
 *
 * Shows the full-screen Digital Arrest warning when a high-risk
 * threat is detected from the CivixLauncher deep link or live analysis.
 */

export interface ThreatAlertData {
  risk_score:  number
  risk_level?: string
  red_flags?:  string[]
  [key: string]: any
}

export function showThreatAlert(
  result:     ThreatAlertData,
  sourceType: string,
  sourceApp:  string
): void {
  const score    = result.risk_score ?? 0
  const level    = result.risk_level ?? (score >= 80 ? 'critical' : score >= 40 ? 'high' : 'safe')
  const redFlags = result.red_flags ?? []
  const isCritical = score >= 80
  const isSuspicious = score >= 40

  // Vibration pattern based on threat
  if (isCritical) {
    Vibration.vibrate([0, 500, 200, 500, 200, 1000])
  } else if (isSuspicious) {
    Vibration.vibrate([0, 300, 100, 300])
  } else {
    Vibration.vibrate([0, 100]) // Short tick for safe
  }

  const icon  = isCritical ? '🚨' : isSuspicious ? '⚠️' : '✅'
  const title = isCritical
    ? `${icon} DIGITAL ARREST SCAM DETECTED`
    : isSuspicious
      ? `${icon} SUSPICIOUS ${sourceType} DETECTED`
      : `${icon} ${sourceType} SCANNED & SAFE`

  const flagsText = redFlags.length > 0
    ? `\n\nRed Flags:\n• ${redFlags.slice(0, 3).join('\n• ')}`
    : ''

  const message = isSuspicious ? [
    `Risk Score: ${score}/100 (${level.toUpperCase()})`,
    `Source: ${sourceType} from ${sourceApp}`,
    flagsText,
    '\nDo NOT share OTPs, transfer money, or stay on a video call with strangers.',
    '\nReport this scam to cybercrime.gov.in',
  ].join('\n') : [
    `Risk Score: ${score}/100 (SAFE)`,
    `Source: ${sourceType} from ${sourceApp}`,
    '\nNo scam patterns detected. You are safe to proceed.'
  ].join('\n')

  const buttons = isSuspicious ? [
    { text: 'Report Scam', style: 'destructive',
      onPress: () => { /* Navigate to report screen */ } },
    { text: 'Dismiss',     style: 'cancel' },
  ] : [
    { text: 'Okay',     style: 'cancel' },
  ]

  Alert.alert(title, message, buttons as any)
}
