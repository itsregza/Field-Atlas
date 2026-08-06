import { useAuth } from '@/src/lib/auth'
import { colors, space } from '@/src/theme'
import { Muted, PrimaryButton, Screen, Title } from '@/src/ui'
import { Text } from 'react-native'

export default function SettingsScreen() {
  const { logout, user, profile, apiReady } = useAuth()

  return (
    <Screen>
      <Title>Settings</Title>
      <Muted>
        {user?.email}
        {'\n'}@{profile?.handle}
      </Muted>
      <Text style={{ color: colors.muted, marginTop: space.lg }}>
        API: {apiReady ? 'connected' : 'demo / offline'}
      </Text>
      <PrimaryButton label="Sign out" onPress={() => void logout()} />
    </Screen>
  )
}
