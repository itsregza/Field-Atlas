/** Shared registration checks used by the register form. */

const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{2,31}$/

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'api',
  'auth',
  'bothies',
  'checklists',
  'explore',
  'fieldatlas',
  'field-atlas',
  'help',
  'hikes',
  'login',
  'logout',
  'map',
  'me',
  'mod',
  'moderator',
  'null',
  'official',
  'owner',
  'pitching',
  'profile',
  'register',
  'root',
  'settings',
  'staff',
  'support',
  'system',
  'undefined',
  'user',
  'username',
  'walker',
  'weather',
  'www',
])

const BLOCKED_USERNAME_TERMS = [
  'anal',
  'anus',
  'arse',
  'asshole',
  'bastard',
  'bitch',
  'bollock',
  'boner',
  'boob',
  'chink',
  'clit',
  'cock',
  'coon',
  'crap',
  'cunt',
  'dick',
  'dildo',
  'dyke',
  'fag',
  'faggot',
  'feck',
  'felch',
  'fellate',
  'fuck',
  'fudgepacker',
  'gaysex',
  'goddamn',
  'homo',
  'horny',
  'jizz',
  'kike',
  'labia',
  'muff',
  'nazi',
  'nigga',
  'nigger',
  'nonce',
  'nude',
  'orgasm',
  'penis',
  'piss',
  'porn',
  'prick',
  'pube',
  'pussy',
  'queer',
  'rape',
  'rapist',
  'retard',
  'scrotum',
  'sex',
  'shit',
  'slut',
  'smegma',
  'spastic',
  'spunk',
  'tit',
  'tosser',
  'turd',
  'twat',
  'vagina',
  'wank',
  'whore',
]

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function usernameBlockReason(username: string): string | null {
  const handle = normalizeUsername(username)
  if (!USERNAME_RE.test(handle)) {
    return 'Username must be 3–32 characters: letters, numbers, _ or -'
  }
  if (RESERVED_USERNAMES.has(handle)) {
    return 'That username is reserved'
  }
  const compact = handle.replace(/[_-]+/g, '')
  for (const term of BLOCKED_USERNAME_TERMS) {
    if (term.length <= 3) {
      if (compact === term) return 'That username is not allowed'
    } else if (compact.includes(term)) {
      return 'That username is not allowed'
    }
  }
  return null
}

/** Normalise to +44… or throw with a user-facing message. */
export function normalizeUkPhone(value: string): string {
  const raw = value.trim()
  if (raw.length > 16) {
    throw new Error('UK phone numbers can’t be longer than 16 characters')
  }

  let cleaned = raw.replace(/[\s().-]/g, '')
  if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`

  let national: string
  if (cleaned.startsWith('+44')) {
    national = cleaned.slice(3)
  } else if (cleaned.startsWith('44') && cleaned.length >= 12) {
    national = cleaned.slice(2)
  } else if (cleaned.startsWith('0')) {
    national = cleaned.slice(1)
  } else {
    throw new Error('Use a UK number, e.g. 07123 456789 or +44 7123 456789')
  }

  if (!/^\d{10}$/.test(national)) {
    throw new Error('Enter a valid 11-digit UK number (including the leading 0)')
  }
  if (!'1235789'.includes(national[0]!)) {
    throw new Error('Enter a valid UK mobile or landline number')
  }

  return `+44${national}`
}

export function isValidUkPhoneInput(value: string): boolean {
  try {
    normalizeUkPhone(value)
    return true
  } catch {
    return false
  }
}
