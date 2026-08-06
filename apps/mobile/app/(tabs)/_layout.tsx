import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '@/src/lib/auth'
import { colors } from '@/src/theme'
import { Loading } from '@/src/ui'

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  feed: 'home-outline',
  map: 'map-outline',
  create: 'add-circle',
  tools: 'compass-outline',
  you: 'person-outline',
}

function FieldTabBar({
  state,
  descriptors,
  navigation,
}: {
  state: { routes: Array<{ key: string; name: string; params?: object }>; index: number }
  descriptors: Record<string, { options: { title?: string } }>
  navigation: {
    emit: (event: object) => { defaultPrevented: boolean }
    navigate: (name: string, params?: object) => void
  }
}) {
  const insets = useSafeAreaInsets()
  const padBottom = Math.max(insets.bottom, Platform.OS === 'web' ? 12 : 8)

  return (
    <View style={[styles.bar, { paddingBottom: padBottom }]}>
      {state.routes.map((route, index) => {
        if (route.name === 'index') return null
        const { options } = descriptors[route.key]

        const focused = state.index === index
        const label =
          typeof options.title === 'string' ? options.title : route.name
        const icon = TAB_ICONS[route.name] ?? 'ellipse-outline'
        const color = focused ? colors.ink : colors.faint

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params)
          }
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={focused ? { selected: true } : {}}
            onPress={onPress}
            style={styles.item}
          >
            <Ionicons
              name={icon}
              size={route.name === 'create' ? 26 : 22}
              color={color}
            />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export default function TabsLayout() {
  const { ready, user } = useAuth()
  if (!ready) return <Loading />
  if (!user) return <Redirect href="/(auth)/login" />

  return (
    <Tabs
      tabBar={(props) => <FieldTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="feed" options={{ title: 'Home' }} />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
        }}
      />
      <Tabs.Screen name="create" options={{ title: 'Create' }} />
      <Tabs.Screen name="tools" options={{ title: 'Tools' }} />
      <Tabs.Screen name="you" options={{ title: 'You' }} />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 48,
    paddingBottom: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    fontFamily: 'DM Sans, Avenir Next, Segoe UI, sans-serif',
    includeFontPadding: false,
  },
})
