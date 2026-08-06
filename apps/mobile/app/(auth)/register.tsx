import { Link } from 'expo-router'
import { useState } from 'react'
import {
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
import { ApiError } from '@/src/lib/api'
import { useAuth } from '@/src/lib/auth'
import { colors, fonts, radius, space, typography } from '@/src/theme'
import { Field, PrimaryButton } from '@/src/ui'

export default function RegisterScreen() {
  const { register } = useAuth()
  const insets = useSafeAreaInsets()
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      await register({
        username: username.trim(),
        firstName: firstName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not register.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.root}>
      <HeroSlideshow />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 24) + 16,
              paddingBottom: Math.max(insets.bottom, 20) + 24,
            },
          ]}
        >
          <Text style={styles.brand}>Field Atlas</Text>
          <Text style={styles.title}>Create account</Text>

          <Field
            placeholder="Username"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
            style={styles.field}
          />
          <Field
            placeholder="First name"
            value={firstName}
            onChangeText={setFirstName}
            style={styles.field}
          />
          <Field
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            style={styles.field}
          />
          <Field
            placeholder="UK phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.field}
          />
          <Field
            placeholder="Password (8+)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.field}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PrimaryButton
            label="Create account"
            onPress={() => void submit()}
            busy={busy}
            disabled={
              username.length < 3 ||
              !firstName ||
              !email ||
              phone.length < 7 ||
              password.length < 8
            }
          />

          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.back} hitSlop={8}>
              <Text style={styles.link}>Already have an account?</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: space.xl,
  },
  brand: {
    ...typography.brand,
    fontSize: 34,
    lineHeight: 38,
    color: colors.ink,
    marginBottom: space.lg,
  },
  title: {
    fontFamily: fonts.sans,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.14,
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
  back: {
    marginTop: space.xl,
    alignItems: 'center',
  },
  link: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.inkSoft,
    fontWeight: '500',
  },
})
