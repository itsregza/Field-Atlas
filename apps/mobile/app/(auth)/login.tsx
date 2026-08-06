import { Link } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { HeroSlideshow } from '@/src/components/HeroSlideshow'
import { homeHeroShots } from '@/src/data/homeHero'
import { ApiError } from '@/src/lib/api'
import { useAuth } from '@/src/lib/auth'
import { colors, fonts, radius, space, typography } from '@/src/theme'
import { Field, PrimaryButton } from '@/src/ui'

export default function LoginScreen() {
  const { login, enterDemo } = useAuth()
  const insets = useSafeAreaInsets()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [heroIndex, setHeroIndex] = useState(0)
  const fade = useRef(new Animated.Value(0)).current
  const rise = useRef(new Animated.Value(18)).current
  const onHeroIndex = useCallback((i: number) => setHeroIndex(i), [])
  const shot = homeHeroShots[heroIndex] ?? homeHeroShots[0]

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: false,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 700,
        useNativeDriver: false,
      }),
    ]).start()
  }, [fade, rise])

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.root}>
      <HeroSlideshow onIndexChange={onHeroIndex} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 24) + 28,
              paddingBottom: Math.max(insets.bottom, 20) + 24,
            },
          ]}
          bounces={false}
        >
          <Animated.View
            style={{
              opacity: fade,
              transform: [{ translateY: rise }],
            }}
          >
            <Text style={styles.brand}>Field Atlas</Text>
            <Text style={styles.tagline}>Built for the hills.</Text>
            <View style={styles.placeChip}>
              <Text style={styles.place}>{shot.place}</Text>
            </View>
          </Animated.View>

          <View style={styles.spacer} />

          <Animated.View style={{ opacity: fade }}>
            <Text style={styles.formLabel}>Log in</Text>

            <Field
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Email or username"
              value={email}
              onChangeText={setEmail}
              style={styles.field}
            />
            <Field
              secureTextEntry
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              style={styles.field}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <PrimaryButton
              label="Log in"
              onPress={() => void submit()}
              busy={busy}
              disabled={!email || password.length < 8}
            />

            <View style={styles.links}>
              <Link href="/(auth)/register" asChild>
                <Pressable hitSlop={8}>
                  <Text style={styles.link}>Create an account</Text>
                </Pressable>
              </Link>
              <Text style={styles.dot}>·</Text>
              <Pressable onPress={enterDemo} hitSlop={8}>
                <Text style={styles.link}>Try demo</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    justifyContent: 'space-between',
  },
  brand: {
    ...typography.brand,
    color: colors.ink,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  tagline: {
    marginTop: space.sm,
    fontFamily: fonts.sans,
    fontSize: 17,
    fontWeight: '400',
    color: colors.inkSoft,
    letterSpacing: 0.1,
  },
  placeChip: {
    alignSelf: 'flex-start',
    marginTop: space.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
  },
  place: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
    letterSpacing: 0.02,
  },
  spacer: {
    minHeight: 80,
    flexGrow: 1,
  },
  formLabel: {
    fontFamily: fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.16,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: space.md,
  },
  field: {
    backgroundColor: 'rgba(8, 10, 7, 0.55)',
    borderColor: 'rgba(244, 240, 230, 0.16)',
    borderRadius: radius.md,
  },
  error: {
    marginTop: space.md,
    color: colors.danger,
    fontFamily: fonts.sans,
    fontSize: 14,
  },
  links: {
    marginTop: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  link: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.inkSoft,
    fontWeight: '500',
  },
  dot: {
    color: colors.faint,
    fontSize: 15,
  },
})
