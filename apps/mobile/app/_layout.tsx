import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { AuthProvider, useAuth } from '@/src/lib/auth'
import { Loading } from '@/src/ui'
import { colors } from '@/src/theme'

export { ErrorBoundary } from 'expo-router'

SplashScreen.preventAutoHideAsync()

const queryClient = new QueryClient()

function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    void SplashScreen.hideAsync()

    const inAuth = segments[0] === '(auth)'
    if (!user && !inAuth) {
      router.replace('/(auth)/login')
    } else if (user && inAuth) {
      router.replace('/(tabs)/feed')
    }
  }, [ready, user, segments, router])

  if (!ready) return <Loading />
  return <>{children}</>
}

export default function RootLayout() {
  const [client] = useState(() => queryClient)

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <StatusBar style="light" />
        <AuthGate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.ink,
              headerTitleStyle: { fontWeight: '700' },
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="post/[id]"
              options={{ title: 'Post', presentation: 'card' }}
            />
            <Stack.Screen
              name="u/[handle]"
              options={{ title: 'Profile', presentation: 'card' }}
            />
            <Stack.Screen
              name="tools/checklists/index"
              options={{ title: 'Checklists' }}
            />
            <Stack.Screen
              name="tools/checklists/[area]"
              options={{ title: 'Area' }}
            />
            <Stack.Screen name="tools/hikes" options={{ title: 'Hikes' }} />
            <Stack.Screen
              name="tools/forecasts"
              options={{ title: 'Forecasts' }}
            />
            <Stack.Screen name="tools/bothies" options={{ title: 'Bothies' }} />
            <Stack.Screen
              name="tools/pitching"
              options={{ title: 'Pitching' }}
            />
            <Stack.Screen
              name="tools/multi-day"
              options={{ title: 'Multi-day' }}
            />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  )
}
