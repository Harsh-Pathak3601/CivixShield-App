export const languageGroups = [
  {
    category: "Global",
    items: [
      { code: "en", name: "English", country: "us", flag: "🇺🇸" },
      { code: "zh-CN", name: "中文 (Chinese)", country: "cn", flag: "🇨🇳" },
      { code: "es", name: "Español (Spanish)", country: "es", flag: "🇪🇸" },
      { code: "ar", name: "العربية (Arabic)", country: "sa", flag: "🇸🇦" },
      { code: "fr", name: "Français (French)", country: "fr", flag: "🇫🇷" },
      { code: "ru", name: "Русский (Russian)", country: "ru", flag: "🇷🇺" },
      { code: "pt", name: "Português", country: "br", flag: "🇧🇷" },
      { code: "de", name: "Deutsch (German)", country: "de", flag: "🇩🇪" },
      { code: "ja", name: "日本語 (Japanese)", country: "jp", flag: "🇯🇵" },
      { code: "ko", name: "한국어 (Korean)", country: "kr", flag: "🇰🇷" },
    ]
  },
  {
    category: "Indian",
    items: [
      { code: "hi", name: "हिन्दी (Hindi)", country: "in", flag: "🇮🇳" },
      { code: "bn", name: "বাংলা (Bengali)", country: "in", flag: "🇮🇳" },
      { code: "te", name: "తెలుగు (Telugu)", country: "in", flag: "🇮🇳" },
      { code: "mr", name: "मराठी (Marathi)", country: "in", flag: "🇮🇳" },
      { code: "ta", name: "தமிழ் (Tamil)", country: "in", flag: "🇮🇳" },
      { code: "ur", name: "اردو (Urdu)", country: "in", flag: "🇮🇳" },
      { code: "gu", name: "ગુજરાતી (Gujarati)", country: "in", flag: "🇮🇳" },
      { code: "kn", name: "ಕನ್ನಡ (Kannada)", country: "in", flag: "🇮🇳" },
      { code: "ml", name: "മലയാളം (Malayalam)", country: "in", flag: "🇮🇳" },
      { code: "or", name: "ଓଡ଼ିଆ (Odia)", country: "in", flag: "🇮🇳" },
      { code: "pa", name: "ਪੰਜਾਬੀ (Punjabi)", country: "in", flag: "🇮🇳" },
    ]
  }
];

const dictionaries: Record<string, Record<string, string>> = {
  en: {
    advanced_interception: "ADVANCED THREAT INTERCEPTION ALIVE",
    system_active: "CENTRAL SYSTEM ACTIVE",
    system_degraded: "SYSTEM DEGRADED",
    system_secured: "Secured natively on device via Local Storage",
    total_threats: "TOTAL THREATS",
    calls_blocked: "CALLS BLOCKED",
    links_scanned: "LINKS SCANNED",
    cmd_interface: "COMMAND INTERFACE",
    recent_activity: "RECENT ACTIVITY",
    sms_engine: "SMS ENGINE",
    url_scanner: "URL SCANNER",
    deepfake_detect: "DEEPFAKE DETECT",
    live_monitor: "LIVE MONITOR",
    whatsapp_bot: "WHATSAPP BOT",
    whatsapp_sub: "Instantly analyze suspicious messages and links directly from WhatsApp",
    vault_title: "ACCESS THREAT FEED",
    vault_sub: "View full interception feed",
    settings: "SETTINGS",
    theme: "APPEARANCE MODE",
  },
  hi: {
    advanced_interception: "उन्नत खतरा अवरोधन सक्रिय",
    system_active: "केंद्रीय प्रणाली सक्रिय",
    system_degraded: "प्रणाली अवक्रमित",
    system_secured: "स्थानीय संग्रहण के माध्यम से डिवाइस पर सुरक्षित",
    total_threats: "कुल खतरे",
    calls_blocked: "अवरुद्ध कॉल",
    links_scanned: "स्कैन किए गए लिंक",
    cmd_interface: "कमांड इंटरफ़ेस",
    recent_activity: "हाल की गतिविधि",
    sms_engine: "एसएमएस इंजन",
    url_scanner: "यूआरएल स्कैनर",
    deepfake_detect: "डीपफेक डिटेक्ट",
    live_monitor: "लाइव मॉनिटर",
    whatsapp_bot: "व्हाट्सएप बॉट",
    whatsapp_sub: "व्हाट्सएप से सीधे संदिग्ध संदेशों और लिंक का विश्लेषण करें",
    vault_title: "थ्रेट फीड तक पहुंचें",
    vault_sub: "पूर्ण अवरोधन फीड देखें",
    settings: "सेटिंग्स",
    theme: "उपस्थिति मोड",
  },
  es: {
    advanced_interception: "INTERCEPCIÓN AVANZADA DE AMENAZAS",
    system_active: "SISTEMA CENTRAL ACTIVO",
    system_degraded: "SISTEMA DEGRADADO",
    system_secured: "Protegido de forma nativa en el dispositivo",
    total_threats: "AMENAZAS TOTALES",
    calls_blocked: "LLAMADAS BLOQUEADAS",
    links_scanned: "ENLACES ESCANEADOS",
    cmd_interface: "INTERFAZ DE COMANDOS",
    recent_activity: "ACTIVIDAD RECIENTE",
    sms_engine: "MOTOR DE SMS",
    url_scanner: "ESCÁNER DE URL",
    deepfake_detect: "DETECTAR DEEPFAKE",
    live_monitor: "MONITOR EN VIVO",
    whatsapp_bot: "BOT DE WHATSAPP",
    whatsapp_sub: "Analiza instantáneamente mensajes de texto y enlaces sospechosos desde WhatsApp",
    vault_title: "ACCEDER AL FEED",
    vault_sub: "Ver feed completo",
    settings: "CONFIGURACIONES",
    theme: "MODO DE APARIENCIA",
  }
};

/**
 * Universal translation hook
 * Fallbacks to English automatically if the string is missing in the target language.
 */
export function t(key: string, languageCode: string): string {
  if (dictionaries[languageCode] && dictionaries[languageCode][key]) {
    return dictionaries[languageCode][key];
  }
  
  const baseCode = languageCode.split('-')[0];
  if (dictionaries[baseCode] && dictionaries[baseCode][key]) {
    return dictionaries[baseCode][key];
  }

  return dictionaries['en'][key] || key;
}
