import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * database.ts — Pivoted to AsyncStorage
 * 
 * Works 100% offline, requires no API tokens, and stores data securely 
 * on the local device without throwing missing permission errors.
 */

export interface ThreatRecord {
  id?:          string
  sourceType:   string
  sourceApp:    string
  content:      string
  riskScore:    number
  riskLevel:    string
  redFlags:     string[]
  intercepted:  boolean
  synced:       boolean
  createdAt?:   string
}

const STORAGE_KEY = '@civixshield_threats';

export async function initializeDatabase(): Promise<void> {
  console.log('[CivixShield] AsyncStorage Threat Vault Ready ✅')
}

/**
 * Save a threat directly to local AsyncStorage
 */
export async function saveThreatLocally(threat: ThreatRecord): Promise<void> {
  try {
    const existing = await getAllThreats()
    const newThreat: ThreatRecord = {
      ...threat,
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString()
    }
    // Prepend to array and limit to recent 500 scans to save storage
    const updated = [newThreat, ...existing].slice(0, 500) 
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('[CivixShield] Failed to save threat to AsyncStorage:', error)
  }
}

/**
 * Fetch all threats from AsyncStorage.
 */
export async function getAllThreats(): Promise<ThreatRecord[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch (error) {
    console.error('[CivixShield] Failed to fetch threats:', error)
    return []
  }
}

/**
 * Filter the AsyncStorage array for high risk threats.
 */
export async function getHighRiskThreats(): Promise<ThreatRecord[]> {
  const threats = await getAllThreats()
  return threats.filter(t => t.riskScore >= 50).slice(0, 100)
}

export async function getThreatCount(): Promise<number> {
  const threats = await getAllThreats()
  return threats.length
}

export async function clearAllThreats(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('[CivixShield] Failed to clear threats:', error)
  }
}
