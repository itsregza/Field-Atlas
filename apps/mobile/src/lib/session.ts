import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

const SESSION_KEY = 'fa_session'
const COOKIE_NAME = 'fa_session'

function webGet() {
  try {
    return globalThis.localStorage?.getItem(SESSION_KEY) ?? null
  } catch {
    return null
  }
}

function webSet(token: string | null) {
  try {
    if (!token) globalThis.localStorage?.removeItem(SESSION_KEY)
    else globalThis.localStorage?.setItem(SESSION_KEY, token)
  } catch {
    // ignore
  }
}

export async function getSessionToken() {
  if (Platform.OS === 'web') return webGet()
  try {
    return (await SecureStore.getItemAsync(SESSION_KEY)) ?? null
  } catch {
    return webGet()
  }
}

export async function setSessionToken(token: string | null) {
  if (Platform.OS === 'web') {
    webSet(token)
    return
  }
  try {
    if (!token) await SecureStore.deleteItemAsync(SESSION_KEY)
    else await SecureStore.setItemAsync(SESSION_KEY, token)
  } catch {
    webSet(token)
  }
}

/** Pull fa_session from Set-Cookie header(s). */
export function extractSessionFromSetCookie(header: string | null) {
  if (!header) return null
  const match = header.match(new RegExp(`${COOKIE_NAME}=([^;]+)`, 'i'))
  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function cookieHeader(token: string | null) {
  return token ? `${COOKIE_NAME}=${token}` : undefined
}
