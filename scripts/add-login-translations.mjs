import { readFileSync, writeFileSync } from 'fs'

const enPath = new URL('../src/locales/en/translation.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const amPath = new URL('../src/locales/am/translation.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

const en = JSON.parse(readFileSync(enPath, 'utf8'))
const am = JSON.parse(readFileSync(amPath, 'utf8'))

// Magic link keys
en.auth.magicLink = {
  label:    'Sign in with email link',
  submit:   'Send me a sign-in link',
  sending:  'Sending…',
  sentTitle: 'Check your email',
  sentDesc:  'We sent a sign-in link to {{email}}. Click it to log in — no password needed.',
  tryAnother: 'Use a different email',
}
am.auth.magicLink = {
  label:    'በኢሜይል ሊንክ ግባ',
  submit:   'የመግቢያ ሊንክ ላክልኝ',
  sending:  'እየላከ ነው…',
  sentTitle: 'ኢሜይልዎን ይፈትሹ',
  sentDesc:  'ወደ {{email}} የመግቢያ ሊንክ ላክናል። ለመግባት ይጫኑት — ይለፍ ቃል አያስፈልግም።',
  tryAnother: 'ሌላ ኢሜይል ተጠቀም',
}

// Forgot password keys
en.auth.forgotPassword = {
  link:           'Forgot password?',
  enterEmailFirst: 'Enter your email address above first.',
  sent:           'Sign-in link sent — check your email.',
}
am.auth.forgotPassword = {
  link:           'የይለፍ ቃል ረሱ?',
  enterEmailFirst: 'አስቀድሞ የኢሜይል አድራሻዎን ያስገቡ።',
  sent:           'የመግቢያ ሊንክ ተልኳል — ኢሜይልዎን ይፈትሹ።',
}

// Password section toggle + show/hide
en.auth.login.usePassword   = 'Sign in with password instead'
en.auth.login.showPassword  = 'Show password'
en.auth.login.hidePassword  = 'Hide password'
am.auth.login.usePassword   = 'ይለፍ ቃል ተጠቀም'
am.auth.login.showPassword  = 'ይለፍ ቃልን አሳይ'
am.auth.login.hidePassword  = 'ይለፍ ቃልን ደብቅ'

writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8')
writeFileSync(amPath, JSON.stringify(am, null, 2) + '\n', 'utf8')
console.log('Locale files written.')

// Deep parity check
function check(a, b, path) {
  for (const k of Object.keys(a)) {
    if (!(k in b)) { console.error('MISSING in other:', path + k); process.exit(1) }
    if (typeof a[k] === 'object' && a[k] !== null) check(a[k], b[k], path + k + '.')
  }
}
const enF = JSON.parse(readFileSync(enPath, 'utf8'))
const amF = JSON.parse(readFileSync(amPath, 'utf8'))
check(enF, amF, '')
check(amF, enF, '')
console.log('Parity check passed.')
