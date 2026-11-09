import { readFileSync, writeFileSync } from 'fs'

const enPath = new URL('../src/locales/en/translation.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const amPath = new URL('../src/locales/am/translation.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

const en = JSON.parse(readFileSync(enPath, 'utf8'))
const am = JSON.parse(readFileSync(amPath, 'utf8'))

// Remove magic link sign-in section (not needed)
delete en.auth.magicLink
delete am.auth.magicLink

// Ensure forgot password keys are correct
en.auth.forgotPassword = {
  link:           'Forgot password?',
  sending:        'Sending…',
  enterEmailFirst: 'Enter your email address first.',
  sentTitle:      'Check your email',
  sentDesc:       'We sent a sign-in link to {{email}}. Click it to log in — no password needed.',
}
am.auth.forgotPassword = {
  link:           'የይለፍ ቃል ረሱ?',
  sending:        'እየላከ ነው…',
  enterEmailFirst: 'አስቀድሞ የኢሜይል አድራሻዎን ያስገቡ።',
  sentTitle:      'ኢሜይልዎን ይፈትሹ',
  sentDesc:       'ወደ {{email}} የመግቢያ ሊንክ ላክናል። ለመግባት ይጫኑት — ይለፍ ቃል አያስፈልግም።',
}

// Show/hide password and collapsible toggle
en.auth.login.usePassword  = 'Sign in with email & password'
en.auth.login.showPassword = 'Show password'
en.auth.login.hidePassword = 'Hide password'
am.auth.login.usePassword  = 'በኢሜይልና ይለፍ ቃል ግባ'
am.auth.login.showPassword = 'ይለፍ ቃልን አሳይ'
am.auth.login.hidePassword = 'ይለፍ ቃልን ደብቅ'

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
