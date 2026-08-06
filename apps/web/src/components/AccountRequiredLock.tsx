import type { ReactNode } from 'react'
import { loadUser } from '../data/auth'
import { useAuthModal } from './AuthModal'

type AccountRequiredLockProps = {
  returnTo: string
  children: ReactNode
  unlocked?: boolean
  label?: string
}

export function AccountRequiredLock({
  returnTo,
  children,
  unlocked,
  label = 'Account required',
}: AccountRequiredLockProps) {
  const user = unlocked ?? Boolean(loadUser())
  const { openAuth } = useAuthModal()
  if (user) return children

  return (
    <div className="account-lock">
      <div className="account-lock__blur" aria-hidden="true">
        {children}
      </div>
      <div className="account-lock__overlay">
        <div className="account-lock__card">
          <strong>{label}</strong>
          <button
            className="account-lock__button"
            type="button"
            onClick={() => openAuth('login', returnTo)}
          >
            Log in / sign up
          </button>
        </div>
      </div>
    </div>
  )
}
