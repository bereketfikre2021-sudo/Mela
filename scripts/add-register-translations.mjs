import { readFileSync, writeFileSync } from 'fs'

const enPath = new URL('../src/locales/en/translation.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const amPath = new URL('../src/locales/am/translation.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

const en = JSON.parse(readFileSync(enPath, 'utf8'))
const am = JSON.parse(readFileSync(amPath, 'utf8'))

en.auth.register.usePassword = 'Register with email & password'
am.auth.register.usePassword = 'በኢሜይልና ይለፍ ቃል ተመዝገብ'

writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8')
writeFileSync(amPath, JSON.stringify(am, null, 2) + '\n', 'utf8')
console.log('Locale files written.')

function check(a, b, path) {
  for (const k of Object.keys(a)) {
    if (!(k in b)) { console.error('MISSING:', path + k); process.exit(1) }
    if (typeof a[k] === 'object' && a[k] !== null) check(a[k], b[k], path + k + '.')
  }
}
const enF = JSON.parse(readFileSync(enPath, 'utf8'))
const amF = JSON.parse(readFileSync(amPath, 'utf8'))
check(enF, amF, '')
check(amF, enF, '')
console.log('Parity check passed.')
