import type { ReactNode } from 'react'
import { LoginGatePage } from './LoginGatePage'
import { loadUser } from '../data/auth'

type ChecklistAuthGateProps = {
  returnTo: string
  children: ReactNode
}

export function ChecklistAuthGate({
  returnTo,
  children,
}: ChecklistAuthGateProps) {
  const user = loadUser()
  if (user) return children

  return <LoginGatePage returnTo={returnTo} />
}
