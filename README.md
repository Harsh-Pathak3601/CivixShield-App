# CivixShield - Mobile Application

Welcome to the **CivixShield App**, the front-facing command center for the CivixShield digital security ecosystem. 

This React Native application empowers users to manually scan for threats and view automated alerts intercepted by the native background Sentinel (CivixLauncher). 

## 🚀 Key Features

*   **Deepfake Detector & Media Authenticator**
    Upload videos or images for immediate analysis. Utilizing an **XceptionNet + Random Forest** architectural pipeline, the app verifies facial artifacts, lighting anomalies, and frame blending to detect AI-generated and deepfake media.
*   **SMS & Social Threat Shield**
    Paste suspicious SMS, WhatsApp, or Instagram messages. The app performs an ultra-fast local heuristic check (<2ms) before querying the deep AI (Gemini 3.1 Pro/Flash) for advanced semantic intent analysis and scam pattern recognition.
*   **Malicious URL Scanner**
    Protect against phishing and zero-day malicious domains. The scanner integrates a dual-layer check: Google Safe Browsing and our custom AI forensic URL model.
*   **Decentralized Threat Vault**
    Absolute privacy. All intercepted threat logs are stored locally exclusively utilizing `AsyncStorage`. Your private data never permanently leaves your phone.

## 🛠 Tech Stack
*   **Framework:** React Native + Expo Router
*   **Language:** TypeScript
*   **Storage:** Local `AsyncStorage` (Zero-Trust Model)
*   **Styling:** Custom CSS/StyleSheet focusing on a dynamic, premium 'Cyber-Security' aesthetic.

## 🌐 Ecosystem Integration
This app is designed to work seamlessly alongside:
1.  **CivixLauncher (Native Edge Sentinel):** A native Android background service that intercepts Notification events and Clipboard changes with zero battery drain.
2.  **CivixShield Web (Cloud Backend):** A Vercel-hosted serverless backend running deep logic and Llama/Gemini threat models.

## ⚙️ How to Run Locally

### Prerequisites
*   Node.js installed
*   An Android Emulator or physical Android device.

### Setup Steps
1. Navigate to the project directory:
   ```bash
   cd CivixShieldApp
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the application:
   ```bash
   # Run the development server
   npx expo start

   # Or, to build precisely for Android with native modules:
   npx expo run:android
   ```

## 🔒 Security Philosophy
CivixShield prioritizes Edge-computing. Instead of sending sensitive information like text messages and clipboard contents to generic databases, interactions are anonymized and processed quickly, allowing real-time response to threats while maintaining complete user privacy.
