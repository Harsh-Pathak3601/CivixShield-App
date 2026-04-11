# CivixShieldApp - Context Document

## Overview
**CivixShieldApp** is the primary mobile interface for the CivixShield ecosystem, built using React Native and Expo (with Expo Router). It serves as the user-facing digital security companion on mobile devices, providing a comprehensive dashboard, threat alerts, and deeper analysis tools.

## Key Features & Responsibilities
- **Threat Ingestion Pipeline:** Receives threat data directly from the native **CivixLauncher** app via deep linking (`civix://ingest`). It decodes these payloads to render timely scam alerts.
- **Real-Time Dashboards:** Displays a history of detected threats, blocked notifications, and overall device security posture through a rich, modern React Native UI.
- **Scam Detection Tools:** Features built-in capabilities (like a deepfake scanner or text/URL analyzer) leveraging backend cloud functions or direct API calls.
- **Community & History:** allows users to view community-reported scams, educational alerts, and past forensic reports.

## Technical Stack
- **Framework**: React Native with Expo (~54.0.33)
- **Routing**: Expo Router (~6.0.23)
- **Navigation**: React Navigation (Native Stack, Bottom Tabs)
- **Storage**: Uses local device storage (`AsyncStorage`) to persist threat history safely without external backend syncing.
- **Media/Hardware**: Uses `expo-image-picker`, `expo-av` (and migrating to video/audio equivalents), `expo-blur`, and `expo-haptics` for interactive experiences.

## Role in the Ecosystem
The **CivixShieldApp** operates as the interactive hub on a user's smartphone. While the **CivixLauncher** silently monitors the system in the background, this app consumes those findings and presents them cleanly to the user, allowing them to manage their security settings, view real-time analyses of ongoing deepfakes or calls, and learn how to better protect themselves from digital fraud.
