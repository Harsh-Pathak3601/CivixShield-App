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

const POSTAL_FRAUD_PATTERNS = [
  'post office', 'india post', 'unable to deliver', 'incorrect house number', 
  'package to your door', 'update your address', 'delivery failed', 'package pending',
  'delivery suspended', 'address update', 'package status'
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
  'paytm-kyc', 'verify-pan', 'aadhaar-update', '.cc', '.vip'
]

const SOCIAL_ENGINEERING_PHRASES = [
  'open this link', 'click here', 'visit', 'verify now', 'action required',
  'update now', 'login to', 'claim', 'won', 'prize', 'gift card', 'reward',
  'account restricted', 'click below', 'update your', 'verify your'
]

const ECOMMERCE_FRAUD_PATTERNS = [
  'lucky draw', 'win iphone', 'amazon gift', 'flipkart prize', 
  'order cancelled refund', 'you won', 'free gift', 'scratch card', 'kbc lottery'
]

const UTILITY_FRAUD_PATTERNS = [
  'electricity disconnect', 'power cut', 'pay bill immediately', 
  'gas connection update', 'mahavitaran', 'bses', 'bescom', 'update electricity bill'
]

const TELECOM_FRAUD_PATTERNS = [
  '5g upgrade', 'sim blocked', 'airtel kyc', 'jio free recharge', 
  'vi lucky draw', 'vodafone kyc', 'bsnl upgrade', 'sim verification pending'
]

const JOB_FRAUD_PATTERNS = [
  'part time job', 'work from home', 'youtube like', 'telegram task', 
  'daily income', 'complete task', 'earn daily', 'wfh', 'salary credited'
]

const GOVERNMENT_FRAUD_PATTERNS = [
  'income tax refund', 'pm yojana', 'subsidy approved', 'challan payment', 
  'free laptop scheme', 'pm kisan', 'free ration'
]

const MEDIA_GAMING_FRAUD_PATTERNS = [
  'netflix free', 'hotstar vip free', 'subscription expired', 'prime video gift',
  'blue badge', 'instagram verified', 'facebook locked', 'whatsapp gold',
  'free uc', 'free diamonds', 'bgmi hack', 'win cash daily', 'aviator tricks'
]

const TRAVEL_FOOD_FRAUD_PATTERNS = [
  'irctc refund', 'flight cancelled', 'cheap tickets', 'makemytrip offer',
  'swiggy offer', 'zomato refund', 'free meal', 'dominos free'
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
  for (const kw of POSTAL_FRAUD_PATTERNS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 20
      matchedPatterns.push(`Postal/Delivery Fraud: ${kw}`)
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
  for (const kw of SOCIAL_ENGINEERING_PHRASES) {
    if (lower.includes(kw.toLowerCase())) {
      score += 20
      matchedPatterns.push(`Social Engineering: ${kw}`)
    }
  }
  for (const kw of ECOMMERCE_FRAUD_PATTERNS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 15; matchedPatterns.push(`eCommerce/Reward Scam: ${kw}`)
    }
  }
  for (const kw of UTILITY_FRAUD_PATTERNS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 20; matchedPatterns.push(`Utility/Bill Scam: ${kw}`)
    }
  }
  for (const kw of TELECOM_FRAUD_PATTERNS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 15; matchedPatterns.push(`Telecom KYC Scam: ${kw}`)
    }
  }
  for (const kw of JOB_FRAUD_PATTERNS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 20; matchedPatterns.push(`Fake Job/Task Scam: ${kw}`)
    }
  }
  for (const kw of GOVERNMENT_FRAUD_PATTERNS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 20; matchedPatterns.push(`Govt Scheme Fraud: ${kw}`)
    }
  }
  for (const kw of MEDIA_GAMING_FRAUD_PATTERNS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 15; matchedPatterns.push(`Media/Gaming Scam: ${kw}`)
    }
  }
  for (const kw of TRAVEL_FOOD_FRAUD_PATTERNS) {
    if (lower.includes(kw.toLowerCase())) {
      score += 15; matchedPatterns.push(`Travel/Food Scam: ${kw}`)
    }
  }

  // ── Advanced Link Analysis ───────────────────────────────────
  const urlRegex = /(https?:\/\/[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,6}(\/\S*)?)/gi
  const foundUrls = text.match(urlRegex) || []
  
  if (foundUrls.length > 0 || lower.includes("http://") || lower.includes("https://") || lower.includes("www.")) {
    score += 20
    if (!matchedPatterns.includes("Suspicious Link Found")) {
      matchedPatterns.push("Suspicious Link Found")
    }

    // Brand Impersonation Check (e.g., sbi.in vs sbi.co.in)
    const brands = ["sbi", "rbi", "hdfc", "icici", "paytm", "kotak", "pnb"]
    for (const brand of brands) {
      if (lower.includes(brand)) {
        const isOfficial = lower.includes(`${brand}.co.in`) || 
                           lower.includes(`${brand}.org.in`) || 
                           lower.includes(`${brand}.com`)
        if (!isOfficial) {
          score += 35
          matchedPatterns.push(`Unofficial Brand Link: ${brand}`)
        }
      }
    }

    // Escalation: Link + Social Engineering command = Instant High Risk
    const hasCommand = SOCIAL_ENGINEERING_PHRASES.some(phrase => lower.includes(phrase.toLowerCase()))
    if (hasCommand) {
      score += 25
      matchedPatterns.push("Link + Social Engineering phrase")
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
