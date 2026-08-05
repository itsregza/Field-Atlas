import { useAuthModal } from './AuthModal'

type LoginPromptProps = {
  returnTo: string
  title?: string
  description?: string
  className?: string
}

export function LoginPrompt({
  returnTo,
  title = 'Account required',
  description,
  className = 'login-prompt',
}: LoginPromptProps) {
  const { openAuth } = useAuthModal()

  return (
    <div className={className}>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
      <button
        className="account-lock__button login-prompt__button"
        type="button"
        onClick={() => openAuth('login', returnTo)}
      >
        Log in / sign up for free
      </button>
    </div>
  )
}
