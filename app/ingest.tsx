import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

/**
 * Ingest Route Handler
 *
 * This file exists to handle the 'civix://ingest' deep link route.
 * Without this file, Expo Router throws an "Unmatched Route" error.
 *
 * The actual data processing happens in app/_layout.tsx, so this
 * component simply redirects the user back to the home screen.
 */
export default function Ingest() {
  return <Redirect href="/(tabs)" />;
}
