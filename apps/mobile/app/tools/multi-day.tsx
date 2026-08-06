import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts, radius, space } from '@/src/theme'

const SITE = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://fieldatlas.co.uk').replace(
  /\/+$/,
  '',
)

export default function MultiDayToolScreen() {
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>Multi-day</Text>
      <Text style={styles.body}>
        Long trails and corridors are on Field Atlas web for now.
      </Text>
      <Pressable
        style={styles.btn}
        onPress={() => void Linking.openURL(`${SITE}/multi-day`)}
      >
        <Text style={styles.btnLabel}>Open multi-day</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.xl,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.display,
    color: colors.ink,
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.sans,
    color: colors.muted,
    marginTop: space.md,
    lineHeight: 22,
    textAlign: 'center',
  },
  btn: {
    marginTop: space.xl,
    minHeight: 52,
    paddingHorizontal: space.xl,
    borderRadius: radius.md,
    backgroundColor: colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    fontFamily: fonts.sans,
    color: colors.bgDeep,
    fontWeight: '700',
  },
})
