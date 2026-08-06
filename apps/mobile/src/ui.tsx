import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native'
import { colors, fonts, radius, space, typography } from './theme'

export function Screen({
  children,
  style,
}: {
  children: React.ReactNode
  style?: ViewStyle
}) {
  return <View style={[styles.screen, style]}>{children}</View>
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>
}

export function Field(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.faint}
      {...props}
      style={[styles.field, props.style]}
    />
  )
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  busy?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.primary,
        (disabled || busy) && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={colors.bgDeep} />
      ) : (
        <Text style={styles.primaryLabel}>{label}</Text>
      )}
    </Pressable>
  )
}

export function GhostButton({
  label,
  onPress,
}: {
  label: string
  onPress: () => void
}) {
  return (
    <Pressable onPress={onPress} style={styles.ghost} hitSlop={8}>
      <Text style={styles.ghostLabel}>{label}</Text>
    </Pressable>
  )
}

export function Card({
  children,
  onPress,
}: {
  children: React.ReactNode
  onPress?: () => void
}) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={styles.card}>
        {children}
      </Pressable>
    )
  }
  return <View style={styles.card}>{children}</View>
}

export function Badge({
  label,
  tone = 'hiking',
}: {
  label: string
  tone?: 'hiking' | 'camping'
}) {
  return (
    <View
      style={[
        styles.badge,
        tone === 'camping' ? styles.badgeCamping : styles.badgeHiking,
      ]}
    >
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  )
}

export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accentSoft} size="large" />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  title: {
    ...typography.title,
    color: colors.ink,
  },
  muted: {
    ...typography.body,
    color: colors.muted,
    marginTop: space.sm,
  },
  field: {
    marginTop: space.md,
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 16,
    fontFamily: fonts.sans,
  },
  primary: {
    marginTop: space.lg,
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    ...typography.button,
    color: colors.bgDeep,
  },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.88 },
  ghost: {
    marginTop: space.md,
    alignItems: 'center',
    paddingVertical: space.sm,
  },
  ghostLabel: {
    fontFamily: fonts.sans,
    color: colors.inkSoft,
    fontWeight: '500',
    fontSize: 15,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    marginBottom: space.md,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeHiking: { backgroundColor: 'rgba(127,168,118,0.18)' },
  badgeCamping: { backgroundColor: 'rgba(201,166,107,0.2)' },
  badgeLabel: {
    fontFamily: fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.06,
    textTransform: 'uppercase',
    color: colors.inkSoft,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
