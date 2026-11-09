import { readFileSync, writeFileSync } from 'fs'

const enPath = new URL('../src/locales/en/translation.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
const amPath = new URL('../src/locales/am/translation.json', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

const en = JSON.parse(readFileSync(enPath, 'utf8'))
const am = JSON.parse(readFileSync(amPath, 'utf8'))

// nav
en.nav.staff = 'Staff'
am.nav.staff = 'ሰራተኞች'

// profileMenu
en.profileMenu.switchStaff = 'Switch staff'
en.profileMenu.staffActive = 'Active: {{name}}'
am.profileMenu.switchStaff = 'ሰራተኛ ቀይር'
am.profileMenu.staffActive = 'ንቁ: {{name}}'

// staff namespace EN
en.staff = {
  title: 'Staff',
  subtitle: '{{count}} active staff member',
  subtitle_other: '{{count}} active staff members',
  addStaff: 'Add staff',
  premiumRequired: 'Premium required',
  premiumRequiredDesc: 'Staff management is available on the Premium plan. Upgrade to add staff members.',
  accessRestricted: 'Access restricted',
  accessRestrictedDesc: 'You do not have permission to manage staff.',
  deactivate: 'Deactivate',
  reactivate: 'Reactivate',
  remove: 'Remove',
  editPermissions: 'Edit permissions',
  role: {
    manager: 'Manager',
    cashier: 'Cashier',
    inventory: 'Inventory Staff',
    accountant: 'Accountant',
  },
  status: {
    active: 'Active',
    deactivated: 'Deactivated',
  },
  permission: {
    pos: 'Point of Sale',
    cancel_sale: 'Cancel / refund sales',
    manage_products: 'Manage products',
    stock_adjustments: 'Stock adjustments',
    receive_purchases: 'Receive purchases',
    manage_customers: 'Manage customers',
    manage_suppliers: 'Manage suppliers',
    manage_expenses: 'Manage expenses',
    view_reports: 'View reports',
    manage_staff: 'Manage staff',
    manage_subscription: 'Subscription and billing',
    manage_business_settings: 'Business settings',
  },
  form: {
    titleAdd: 'Add staff member',
    titleEditPerms: 'Edit permissions for {{name}}',
    name: 'Full name',
    role: 'Role',
    permissions: 'Permissions',
    pin: '4-digit PIN',
    pinHelper: 'Staff will use this PIN to switch to their account.',
    pinError: 'PIN must be exactly 4 digits.',
    showPin: 'Show PIN',
    hidePin: 'Hide PIN',
    submit: 'Add staff member',
  },
  delete: {
    title: 'Remove staff member',
    desc: 'Remove "{{name}}"? Their account will be permanently deleted.',
  },
  empty: {
    title: 'No staff members yet',
    desc: 'Add staff members to let others help manage your business.',
  },
  notifications: {
    added: 'Staff member added',
    updated: 'Permissions updated',
    deleted: 'Staff member removed',
    deactivated: 'Staff member deactivated',
    reactivated: 'Staff member reactivated',
  },
  switcher: {
    title: 'Switch account',
    ownerRole: 'Owner (full access)',
    enterPin: 'Enter PIN for {{name}}',
    wrongPin: 'Incorrect PIN. Try again.',
    deleteDigit: 'Delete digit',
    noStaff: 'No active staff members.',
  },
  activityLog: {
    title: 'Recent activity',
    empty: 'No activity recorded yet.',
    owner: 'Owner',
    unknownStaff: 'Unknown staff',
    action: {
      sale: 'Recorded a sale',
      expense: 'Added an expense',
      stock_adjustment: 'Adjusted stock',
      purchase: 'Received a purchase',
      sale_cancellation: 'Cancelled a sale',
      staff_created: 'Added a staff member',
      staff_deactivated: 'Deactivated a staff member',
      staff_deleted: 'Removed a staff member',
    },
  },
}

// staff namespace AM
am.staff = {
  title: 'ሰራተኞች',
  subtitle: '{{count}} ንቁ ሰራተኛ',
  subtitle_other: '{{count}} ንቁ ሰራተኞች',
  addStaff: 'ሰራተኛ ጨምር',
  premiumRequired: 'ፕሪሚየም ያስፈልጋል',
  premiumRequiredDesc: 'የሰራተኛ አስተዳደር በፕሪሚየም እቅድ ላይ ይገኛል። ሰራተኞችን ለማከል አዘምን።',
  accessRestricted: 'መዳረሻ ተገድቧል',
  accessRestrictedDesc: 'ሰራተኞችን ለማስተዳደር ፈቃድ የለዎትም።',
  deactivate: 'አቦ',
  reactivate: 'ንቁ አድርግ',
  remove: 'አስወግድ',
  editPermissions: 'ፈቃዶችን አርትዕ',
  role: {
    manager: 'ስራ አስኪያጅ',
    cashier: 'ካሽ',
    inventory: 'የዕቃ ሰራተኛ',
    accountant: 'አካውንታንት',
  },
  status: {
    active: 'ንቁ',
    deactivated: 'ተሰናክሏል',
  },
  permission: {
    pos: 'የሽያጭ ነጥብ',
    cancel_sale: 'ሽያጭ ሰርዝ / መልስ ስጥ',
    manage_products: 'ምርቶችን አስተዳድር',
    stock_adjustments: 'የዕቃ ክምችት ማስተካከያ',
    receive_purchases: 'ግዢዎችን ተቀበል',
    manage_customers: 'ደንበኞችን አስተዳድር',
    manage_suppliers: 'አቅራቢዎችን አስተዳድር',
    manage_expenses: 'ወጪዎችን አስተዳድር',
    view_reports: 'ሪፖርቶችን ይመልከቱ',
    manage_staff: 'ሰራተኞችን አስተዳድር',
    manage_subscription: 'ደንበኝነት እና ክፍያ',
    manage_business_settings: 'የንግድ ቅንብሮች',
  },
  form: {
    titleAdd: 'ሰራተኛ ጨምር',
    titleEditPerms: 'ለ {{name}} ፈቃዶችን አርትዕ',
    name: 'ሙሉ ስም',
    role: 'ሚና',
    permissions: 'ፈቃዶች',
    pin: '4-አሃዝ ፒን',
    pinHelper: 'ሰራተኛው ወደ ሂሳቡ ለመቀየር ይህን ፒን ይጠቀማል።',
    pinError: 'ፒን ትክክለኛ 4 አሃዞች መሆን አለበት።',
    showPin: 'ፒን አሳይ',
    hidePin: 'ፒን ደብቅ',
    submit: 'ሰራተኛ ጨምር',
  },
  delete: {
    title: 'ሰራተኛ አስወግድ',
    desc: '"{{name}}" ያስወግዱ? ሂሳባቸው ቋሚ ይሰረዛል።',
  },
  empty: {
    title: 'እስካሁን ሰራተኞች የሉም',
    desc: 'ሌሎች የንግድዎን ጉዳዮች እንዲያስተዳድሩ ሰራተኞችን ያክሉ።',
  },
  notifications: {
    added: 'ሰራተኛ ታክሏል',
    updated: 'ፈቃዶች ተዘምነዋል',
    deleted: 'ሰራተኛ ተወግዷል',
    deactivated: 'ሰራተኛ ተሰናክሏል',
    reactivated: 'ሰራተኛ ንቁ ሆኗል',
  },
  switcher: {
    title: 'መለያ ቀይር',
    ownerRole: 'ባለቤት (ሙሉ መዳረሻ)',
    enterPin: 'ለ {{name}} ፒን ያስገቡ',
    wrongPin: 'ፒን ትክክል አይደለም። እንደገና ይሞክሩ።',
    deleteDigit: 'አሃዝ ሰርዝ',
    noStaff: 'ምንም ንቁ ሰራተኞች የሉም።',
  },
  activityLog: {
    title: 'የቅርብ ጊዜ እንቅስቃሴ',
    empty: 'እስካሁን ምንም እንቅስቃሴ አልተመዘገበም።',
    owner: 'ባለቤት',
    unknownStaff: 'ያልታወቀ ሰራተኛ',
    action: {
      sale: 'ሽያጭ ተመዝግቧል',
      expense: 'ወጪ ታክሏል',
      stock_adjustment: 'ዕቃ ተስተካክሏል',
      purchase: 'ግዢ ተቀብሏል',
      sale_cancellation: 'ሽያጭ ተሰርዟል',
      staff_created: 'ሰራተኛ ታክሏል',
      staff_deactivated: 'ሰራተኛ ተሰናክሏል',
      staff_deleted: 'ሰራተኛ ተወግዷል',
    },
  },
}

writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8')
writeFileSync(amPath, JSON.stringify(am, null, 2) + '\n', 'utf8')
console.log('Locale files written.')

// Parity check
function check(a, b, path) {
  for (const k of Object.keys(a)) {
    if (!(k in b)) { console.error('MISSING in other:', path + k); process.exit(1) }
    if (typeof a[k] === 'object' && a[k] !== null) check(a[k], b[k], path + k + '.')
  }
}
const enFinal = JSON.parse(readFileSync(enPath, 'utf8'))
const amFinal = JSON.parse(readFileSync(amPath, 'utf8'))
check(enFinal, amFinal, '')
check(amFinal, enFinal, '')
console.log('Parity check passed.')
