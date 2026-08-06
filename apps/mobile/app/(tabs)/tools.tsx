import { useRouter } from 'expo-router'
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts, radius, space } from '@/src/theme'

const SITE = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://fieldatlas.co.uk').replace(
  /\/+$/,
  '',
)

const TOOLS = [
  {
    href: '/tools/checklists',
    title: 'Checklists',
    hint: 'Check summits and rate pitch + peak',
    icon: 'checkbox-outline' as const,
    kind: 'app' as const,
  },
  {
    href: '/tools/hikes',
    title: 'Hikes',
    hint: 'Unfinished peaks and day ideas',
    icon: 'trail-sign-outline' as const,
    kind: 'app' as const,
  },
  {
    href: '/tools/forecasts',
    title: 'Forecasts',
    hint: 'Hill weather for any summit',
    icon: 'cloudy-outline' as const,
    kind: 'app' as const,
  },
  {
    href: `${SITE}/bothies`,
    title: 'Bothies',
    hint: 'MBA bothy map on Field Atlas',
    icon: 'home-outline' as const,
    kind: 'web' as const,
  },
  {
    href: `${SITE}/pitching`,
    title: 'Pitching',
    hint: 'Flatter overnight ground finder',
    icon: 'navigate-outline' as const,
    kind: 'web' as const,
  },
  {
    href: `${SITE}/multi-day`,
    title: 'Multi-day',
    hint: 'Long trails and corridors',
    icon: 'map-outline' as const,
    kind: 'web' as const,
  },
]

export default function ToolsHubScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 12),
        paddingBottom: Math.max(insets.bottom, 48) + 24,
        paddingHorizontal: space.lg,
      }}
    >
      {TOOLS.map((tool) => (
        <Pressable
          key={tool.href}
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.88 }]}
          onPress={() => {
            if (tool.kind === 'web') {
              void Linking.openURL(tool.href)
              return
            }
            router.push(tool.href as never)
          }}
        >
          <View style={styles.icon}>
            <Ionicons name={tool.icon} size={22} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{tool.title}</Text>
            <Text style={styles.cardHint}>{tool.hint}</Text>
          </View>
          <Ionicons
            name={tool.kind === 'web' ? 'open-outline' : 'chevron-forward'}
            size={18}
            color={colors.faint}
          />
        </Pressable>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    marginBottom: space.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontWeight: '700',
    fontSize: 16,
  },
  cardHint: {
    fontFamily: fonts.sans,
    color: colors.muted,
    marginTop: 4,
    fontSize: 13,
  },
})
