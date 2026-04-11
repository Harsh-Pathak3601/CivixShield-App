import { Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import { usePreferences } from '../../lib/PreferencesContext'
import { t } from '../../lib/i18n'

export default function TabLayout() {
  const { colors, language } = usePreferences()
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor:  colors.navBg,
          borderTopColor:   colors.navBorder,
          borderTopWidth:   1,
          height:           Platform.OS === 'ios' ? 88 : 68,
          paddingBottom:    Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarActiveTintColor:   colors.navActive,
        tabBarInactiveTintColor: colors.navInactive,
        tabBarLabelStyle: {
          fontSize:    10,
          fontFamily:  'monospace',
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'DASHBOARD',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="sms-shield"
        options={{
          title: 'SMS SHIELD',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="url-scanner"
        options={{
          title: 'URL SCAN',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="link" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="deepfake"
        options={{
          title: 'DEEPFAKE',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="threat-feed"
        options={{
          title: 'FEED',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
