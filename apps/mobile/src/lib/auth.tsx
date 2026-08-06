import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  apiEnabled,
  apiLogin,
  apiLogout,
  apiMe,
  apiRegister,
  type ApiProfile,
  type ApiUser,
} from './api'
import { setSessionToken } from './session'

type AuthState = {
  ready: boolean
  user: ApiUser | null
  profile: ApiProfile | null
  apiReady: boolean
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    username: string
    firstName: string
    email: string
    phone: string
    password: string
  }) => Promise<void>
  logout: () => Promise<void>
  /** Local-only demo session when API is offline — for UI iteration. */
  enterDemo: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<ApiUser | null>(null)
  const [profile, setProfile] = useState<ApiProfile | null>(null)
  const apiReady = apiEnabled()

  const refresh = useCallback(async () => {
    if (!apiEnabled()) {
      setReady(true)
      return
    }
    try {
      const result = await Promise.race([
        apiMe(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 8000),
        ),
      ])
      setUser(result.user)
      setProfile(result.profile ?? null)
    } catch {
      setUser(null)
      setProfile(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin({ email, password })
    setUser(result.user)
    try {
      const me = await apiMe()
      setUser(me.user ?? result.user)
      setProfile(me.profile ?? null)
    } catch {
      setProfile(null)
    }
  }, [])

  const register = useCallback(
    async (input: {
      username: string
      firstName: string
      email: string
      phone: string
      password: string
    }) => {
      const result = await apiRegister(input)
      setUser(result.user)
      try {
        const me = await apiMe()
        setUser(me.user ?? result.user)
        setProfile(me.profile ?? null)
      } catch {
        setProfile(null)
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    if (apiEnabled()) {
      try {
        await apiLogout()
      } catch {
        await setSessionToken(null)
      }
    } else {
      await setSessionToken(null)
    }
    setUser(null)
    setProfile(null)
  }, [])

  const enterDemo = useCallback(() => {
    setUser({
      id: 'demo-local',
      email: 'sam@fieldatlas.local',
      name: 'Sam',
      provider: 'email',
    })
    setProfile({
      handle: 'sam',
      status: 'Out on the hill',
      avatarUrl: null,
      isPublic: true,
      shareNotes: true,
      sharePhotos: true,
      name: 'Sam',
    })
    setReady(true)
  }, [])

  const value = useMemo(
    () => ({
      ready,
      user,
      profile,
      apiReady,
      refresh,
      login,
      register,
      logout,
      enterDemo,
    }),
    [
      ready,
      user,
      profile,
      apiReady,
      refresh,
      login,
      register,
      logout,
      enterDemo,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
