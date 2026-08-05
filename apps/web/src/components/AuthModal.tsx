import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  ApiError,
  apiCheckUsername,
  apiDemoGoogle,
  apiEnabled,
  apiLogin,
  apiRegister,
} from '../data/api'
import {
  cacheApiUser,
  loadUser,
  startSession,
} from '../data/auth'
import { hydrateLogsFromApi } from '../data/logs'
import {
  normalizeUkPhone,
  normalizeUsername,
  usernameBlockReason,
} from '../lib/registration'

export type AuthModalMode = 'login' | 'register'

type AuthModalContextValue = {
  openAuth: (mode?: AuthModalMode, returnTo?: string) => void
  closeAuth: () => void
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null)
const STORAGE_KEY = 'fa_auth_modal'

function safePath(path: string | undefined, fallback = '/account') {
  if (!path) return fallback
  return path.startsWith('/') && !path.startsWith('//') ? path : fallback
}

function nameFromEmail(email: string) {
  const name = email.split('@')[0].replace(/[._-]+/g, ' ')
  return name.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function isNetworkFailure(err: unknown) {
  return (
    err instanceof TypeError ||
    (err instanceof Error &&
      /failed to fetch|networkerror|load failed/i.test(err.message))
  )
}

const registerSteps = [
  {
    id: 'username',
    title: 'Choose a username',
    hint: 'How other walkers will find you.',
  },
  {
    id: 'firstName',
    title: 'Your first name',
    hint: 'Shown on your profile.',
  },
  {
    id: 'email',
    title: 'Email address',
    hint: 'For signing in and account recovery.',
  },
  {
    id: 'phone',
    title: 'UK phone number',
    hint: 'Mobile or landline — UK only.',
  },
  {
    id: 'password',
    title: 'Create a password',
    hint: 'At least 8 characters.',
  },
] as const

type StepId = (typeof registerSteps)[number]['id']

export function useAuthModal() {
  const value = useContext(AuthModalContext)
  if (!value) {
    throw new Error('useAuthModal must be used within AuthModalProvider')
  }
  return value
}

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AuthModalMode>('login')
  const [returnTo, setReturnTo] = useState('/account')

  const openAuth = useCallback((nextMode: AuthModalMode = 'login', nextReturnTo = '/account') => {
    if (loadUser()) {
      window.location.href = safePath(nextReturnTo)
      return
    }
    setMode(nextMode)
    setReturnTo(safePath(nextReturnTo))
    setOpen(true)
  }, [])

  const closeAuth = useCallback(() => setOpen(false), [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      sessionStorage.removeItem(STORAGE_KEY)
      const parsed = JSON.parse(raw) as {
        mode?: AuthModalMode
        returnTo?: string
      }
      openAuth(parsed.mode === 'register' ? 'register' : 'login', parsed.returnTo)
    } catch {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [openAuth])

  const value = useMemo(
    () => ({ openAuth, closeAuth }),
    [openAuth, closeAuth],
  )

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      {open ? (
        <AuthModal
          mode={mode}
          returnTo={returnTo}
          onModeChange={setMode}
          onClose={closeAuth}
        />
      ) : null}
    </AuthModalContext.Provider>
  )
}

export function queueAuthModal(mode: AuthModalMode, returnTo = '/account') {
  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ mode, returnTo: safePath(returnTo) }),
  )
}

type AuthModalProps = {
  mode: AuthModalMode
  returnTo: string
  onModeChange: (mode: AuthModalMode) => void
  onClose: () => void
}

function AuthModal({ mode, returnTo, onModeChange, onClose }: AuthModalProps) {
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [stepIndex, setStepIndex] = useState(0)
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'invalid'
  >('idle')
  const [usernameReason, setUsernameReason] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const usingApi = apiEnabled()
  const step = registerSteps[stepIndex]
  const progress = ((stepIndex + 1) / registerSteps.length) * 100

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  useEffect(() => {
    setError('')
    setStepIndex(0)
  }, [mode])

  useEffect(() => {
    const handle = normalizeUsername(username)
    if (!handle) {
      setUsernameStatus('idle')
      setUsernameReason('')
      return
    }
    const blocked = usernameBlockReason(handle)
    if (blocked) {
      setUsernameStatus('invalid')
      setUsernameReason(blocked)
      return
    }
    if (!usingApi) {
      setUsernameStatus('available')
      setUsernameReason('Available')
      return
    }
    setUsernameStatus('checking')
    setUsernameReason('Checking…')
    const timer = window.setTimeout(() => {
      void apiCheckUsername(handle)
        .then((result) => {
          if (normalizeUsername(username) !== handle) return
          setUsernameStatus(result.available ? 'available' : 'taken')
          setUsernameReason(
            result.available
              ? 'Available'
              : result.reason || 'That username is taken',
          )
        })
        .catch((err) => {
          if (normalizeUsername(username) !== handle) return
          if (isNetworkFailure(err)) {
            setUsernameStatus('available')
            setUsernameReason('Available')
            return
          }
          setUsernameStatus('invalid')
          setUsernameReason(
            err instanceof Error ? err.message : 'Could not check username',
          )
        })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [username, usingApi])

  const finish = async (user: {
    id: string
    name: string
    email: string
    provider: 'email' | 'google'
  }) => {
    cacheApiUser(user)
    if (usingApi) {
      try {
        await hydrateLogsFromApi()
      } catch {
        // continue
      }
    }
    window.location.assign(returnTo)
  }

  const finishOffline = (name: string, nextEmail: string, provider: 'email' | 'google') => {
    startSession({ name, email: nextEmail, provider })
    window.location.assign(returnTo)
  }

  const onPhoneChange = (value: string) => {
    const next = value.slice(0, 16)
    setPhone(next)
    if (!next.trim()) {
      setPhoneError('')
      return
    }
    try {
      normalizeUkPhone(next)
      setPhoneError('')
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Invalid UK phone number')
    }
  }

  const validateStep = (id: StepId): string | null => {
    if (id === 'username') {
      const handle = normalizeUsername(username)
      const blocked = usernameBlockReason(handle)
      if (blocked) return blocked
      if (usernameStatus === 'taken') return 'That username is taken'
      if (usernameStatus === 'checking') return 'Still checking that username…'
      return null
    }
    if (id === 'firstName') return firstName.trim() ? null : 'Enter your first name'
    if (id === 'email') {
      if (!email.trim()) return 'Enter your email'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return 'Enter a valid email address'
      }
      return null
    }
    if (id === 'phone') {
      try {
        normalizeUkPhone(phone)
        setPhoneError('')
        return null
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Enter a valid UK phone number'
        setPhoneError(message)
        return message
      }
    }
    if (id === 'password') {
      return password.length < 8 ? 'Password must be at least 8 characters' : null
    }
    return null
  }

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!usingApi) {
      const nextEmail = loginId.includes('@') ? loginId : `${loginId}@example.com`
      finishOffline(nameFromEmail(nextEmail), nextEmail, 'email')
      return
    }
    setPending(true)
    try {
      const { user } = await apiLogin({ email: loginId, password: loginPassword })
      await finish(user)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid username/email or password.')
        setPending(false)
        return
      }
      if (isNetworkFailure(err)) {
        const nextEmail = loginId.includes('@') ? loginId : `${loginId}@example.com`
        finishOffline(nameFromEmail(nextEmail), nextEmail, 'email')
        return
      }
      setError(err instanceof Error ? err.message : 'Sign in failed')
      setPending(false)
    }
  }

  const continueWithGoogle = async () => {
    setError('')
    if (!usingApi) {
      finishOffline('Demo Walker', 'walker@example.com', 'google')
      return
    }
    setPending(true)
    try {
      const { user } = await apiDemoGoogle()
      await finish(user)
    } catch (err) {
      if (isNetworkFailure(err)) {
        finishOffline('Demo Walker', 'walker@example.com', 'google')
        return
      }
      setError(err instanceof Error ? err.message : 'Sign in failed')
      setPending(false)
    }
  }

  const submitRegisterStep = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (step.id !== 'password') {
      const problem = validateStep(step.id)
      if (problem) {
        setError(problem)
        return
      }
      setStepIndex((current) => current + 1)
      return
    }

    for (const entry of registerSteps) {
      const problem = validateStep(entry.id)
      if (problem) {
        setError(problem)
        setStepIndex(registerSteps.findIndex((item) => item.id === entry.id))
        return
      }
    }

    const handle = normalizeUsername(username)
    const normalisedPhone = normalizeUkPhone(phone)

    if (!usingApi) {
      finishOffline(firstName.trim() || nameFromEmail(email), email, 'email')
      return
    }

    setPending(true)
    try {
      const { user } = await apiRegister({
        username: handle,
        firstName: firstName.trim(),
        email,
        phone: normalisedPhone,
        password,
      })
      await finish(user)
    } catch (err) {
      if (isNetworkFailure(err)) {
        finishOffline(firstName.trim() || nameFromEmail(email), email, 'email')
        return
      }
      setError(err instanceof Error ? err.message : 'Could not create account')
      setPending(false)
    }
  }

  return (
    <div className="auth-sheet" role="presentation" onClick={onClose}>
      <div
        className="auth-sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="auth-sheet__top">
          <div className="auth-sheet__tabs" role="tablist" aria-label="Account">
            <button
              type="button"
              role="tab"
              className={mode === 'login' ? 'is-active' : ''}
              aria-selected={mode === 'login'}
              onClick={() => onModeChange('login')}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              className={mode === 'register' ? 'is-active' : ''}
              aria-selected={mode === 'register'}
              onClick={() => onModeChange('register')}
            >
              Sign up
            </button>
          </div>
          <button
            className="auth-sheet__close"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {mode === 'login' ? (
          <>
            <h2 id="auth-sheet-title">Welcome back</h2>
            <p className="auth-sheet__lead">
              Log in to keep your summits, hikes and lists with you.
            </p>
            <button
              className="google-button"
              type="button"
              disabled={pending}
              onClick={() => void continueWithGoogle()}
            >
              <span aria-hidden="true">G</span>
              Continue with Google
            </button>
            <div className="auth-divider">
              <span>or use email / username</span>
            </div>
            <form className="auth-sheet__form" onSubmit={(event) => void submitLogin(event)}>
              <label>
                Email or username
                <input
                  type="text"
                  required
                  autoComplete="username"
                  autoFocus
                  value={loginId}
                  onChange={(event) => setLoginId(event.target.value)}
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
              </label>
              {error ? <p className="auth-error">{error}</p> : null}
              <button className="auth-submit" type="submit" disabled={pending}>
                {pending ? 'Signing in…' : 'Log in'}
              </button>
            </form>
            <p className="auth-sheet__aside">
              New here?{' '}
              <button type="button" onClick={() => onModeChange('register')}>
                Create a free account
              </button>
            </p>
          </>
        ) : (
          <>
            <div className="auth-sheet__progress" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
            <p className="auth-sheet__step">
              Step {stepIndex + 1} of {registerSteps.length}
            </p>
            <h2 id="auth-sheet-title">{step.title}</h2>
            <p className="auth-sheet__lead">{step.hint}</p>
            <form
              className="auth-sheet__form"
              onSubmit={(event) => void submitRegisterStep(event)}
            >
              {step.id === 'username' ? (
                <label>
                  Username
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={32}
                    autoComplete="username"
                    spellCheck={false}
                    autoFocus
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                  {usernameStatus !== 'idle' ? (
                    <span className={`auth-field-hint is-${usernameStatus}`}>
                      {usernameReason}
                    </span>
                  ) : null}
                </label>
              ) : null}
              {step.id === 'firstName' ? (
                <label>
                  First name
                  <input
                    type="text"
                    required
                    autoComplete="given-name"
                    autoFocus
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                  />
                </label>
              ) : null}
              {step.id === 'email' ? (
                <label>
                  Email
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
              ) : null}
              {step.id === 'phone' ? (
                <label>
                  UK phone
                  <input
                    type="tel"
                    required
                    maxLength={16}
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="07123 456789"
                    autoFocus
                    value={phone}
                    onChange={(event) => onPhoneChange(event.target.value)}
                  />
                  {phoneError ? (
                    <span className="auth-field-hint is-invalid">{phoneError}</span>
                  ) : (
                    <span className="auth-field-hint is-idle">
                      UK mobile or landline only
                    </span>
                  )}
                </label>
              ) : null}
              {step.id === 'password' ? (
                <label>
                  Password
                  <input
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    autoFocus
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
              ) : null}

              {error ? <p className="auth-error">{error}</p> : null}

              <div className="auth-sheet__actions">
                {stepIndex > 0 ? (
                  <button
                    className="auth-sheet__back"
                    type="button"
                    onClick={() => {
                      setError('')
                      setStepIndex((current) => Math.max(0, current - 1))
                    }}
                  >
                    Back
                  </button>
                ) : (
                  <button
                    className="auth-sheet__back"
                    type="button"
                    onClick={() => onModeChange('login')}
                  >
                    Log in instead
                  </button>
                )}
                <button className="auth-submit" type="submit" disabled={pending}>
                  {pending
                    ? 'Creating account…'
                    : step.id === 'password'
                      ? 'Create account'
                      : 'Continue'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
