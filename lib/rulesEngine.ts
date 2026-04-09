/**
 * rulesEngine.ts — Local-First Rules Engine (Missing Feature #2)
 *
 * An on-device, zero-latency deterministic rules engine for instant threat
 * detection without any server round-trips. Mirrors CivixScamPatterns.kt
 * on the Kotlin side but runs entirely in TypeScript/JavaScript.
 *
 * This addresses the missing.md gap:
 * "The web app is missing a dedicated, on-device deterministic rules engine
 *  for instant, zero-latency parsing of URLs and SMS payloads."
 */

export interface LocalAnalysisResult {
  riskScore:       number
  riskLevel:       'low' | 'medium' | 'high' | 'critical'
  matchedPatterns: string[]
  isHighPriority:  boolean
  isCritical:      boolean
}

// ── India-Specific Pattern Dictionaries ─────────────────────────────────────

const INDIAN_AUTHORITY_KEYWORDS = [
  'CBI', 'ED', 'TRAI', 'RBI', 'Cyber Cell', 'Supreme Court',
  'High Court', 'Customs', 'Income Tax', 'NARCOTICS', 'NCB',
  'FedEx', 'DHL parcel', 'money laundering', 'arrest warrant',
  'IPS officer', 'Enforcement Directorate', 'Central Bureau',
  'Delhi Police', 'Mumbai Police', 'Cyber Crime',
]

const UPI_FRAUD_PATTERNS = [
  'collect request', 'UPI PIN', 'approve payment', 'cashback credited',
  'KYC update', 'link Aadhaar', 'verify PAN', 'SIM blocked',
  'OTP share', 're-KYC', 'account blocked', 'wallet suspended',
  'MPIN', 'UPI request', 'bank suspended', 'NEFT failed',
  'PhonePe request', 'Google Pay collected',
]

const DIGITAL_ARREST_PHRASES = [
  'do not disconnect', 'stay on the call', 'video call verification',
  'you are under observation', 'legal action will be taken',
  'your account is frozen', 'transfer to safe account',
  'digital arrest', 'you are arrested', 'warrant issued',
  'Supreme Court summons', 'do not tell anyone', 'keep this confidential',
  'police is outside your house', 'you will be detained',
]

const URGENCY_AMPLIFIERS = [
  'turant', 'abhi', 'immediately', '2 ghante mein', 'court order',
  'last warning', 'final notice', '24 hours', '48 hours',
  'urgent', 'jaldi', 'kal subah tak', 'last chance',
]

const PHISHING_URL_PATTERNS = [
  'bit.ly', 'tinyurl', 't.me', 'wa.me',
  '-secure-', '-verify-', '-login-', 'secure-sbi', 'rbi-alert',
  'paytm-kyc', 'verify-pan', 'aadhaar-update',
]

/**
 * Analyzes text locally — runs in <2ms, no internet required.
 * Call this BEFORE hitting the /api/analyze backend to give instant UX feedback.
 */
export function analyzeThreat(text: string): LocalAnalysisResult {
  const lower           = text.toLowerCase()
  let   score           = 0
  const matchedPatterns: string[] = []

  for (const kw of INDIAN_AUTHORITY_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 20
      matchedPatterns.push(`Authority Impersonation: ${kw}`)
    }
  }
  for (const kw of UPI_FRAUD_PATTERNS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 15
      matchedPatterns.push(`UPI/Banking Fraud: ${kw}`)
    }
  }
  for (const kw of DIGITAL_ARREST_PHRASES) {
    if (lower.includes(kw.toLowerCase())) {
      score += 25
      matchedPatterns.push(`Digital Arrest: ${kw}`)
    }
  }
  for (const kw of URGENCY_AMPLIFIERS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 10
      matchedPatterns.push(`Urgency Amplifier: ${kw}`)
    }
  }
  for (const kw of PHISHING_URL_PATTERNS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 12
      matchedPatterns.push(`Phishing URL: ${kw}`)
    }
  }

  const riskScore = Math.min(100, score)

  const riskLevel: LocalAnalysisResult['riskLevel'] =
    riskScore >= 80 ? 'critical' :
    riskScore >= 50 ? 'high'     :
    riskScore >= 30 ? 'medium'   : 'low'

  return {
    riskScore,
    riskLevel,
    matchedPatterns,
    isHighPriority: riskScore >= 40,
    isCritical:     riskScore >= 80,
  }
}

/**
 * Hybrid scoring: combines local score with backend Gemini score.
 * Uses local score as floor — if Gemini is unavailable, local score stands.
 */
export function computeHybridScore(localScore: number, geminiScore: number | null): number {
  if (geminiScore === null) return localScore
  // Weighted average: 40% local (deterministic) + 60% AI (probabilistic)
  return Math.round(localScore * 0.4 + geminiScore * 0.6)
}
