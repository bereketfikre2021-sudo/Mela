/**
 * Business-type configuration — Phase 9.
 *
 * Drives UI labels, dashboard priorities, and onboarding suggestions.
 * One shared app; type only affects copy and defaults.
 */
import {
  Scissors,
  ShoppingBag,
  Coffee,
  Croissant,
  Wrench,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'

export type BusinessType = 'retail' | 'fnb' | 'bakery' | 'service' | 'cosmetics' | 'salon'

export interface BusinessConfig {
  type:         BusinessType
  icon:         LucideIcon
  label:        string
  description:  string
  newSaleLabel:   string
  stockLabel:     string
  /** Page heading on the Stock/Services page */
  stockPageTitle: string
  /** Empty-state description on the Stock page */
  stockEmptyDesc: string
  customersLabel: string
  /** When true, products are services — no physical stock tracking needed.
   *  The stock quantity column, adjust button, and restock button are hidden. */
  isServiceBased: boolean
  /** Placeholder search text on the POS screen */
  posSearchPlaceholder: string
  /** Cart section label on the POS screen */
  posCartLabel: string
  starterProducts: { name: string; unit: string; defaultPrice: number }[]
}

const CONFIGS: Record<BusinessType, BusinessConfig> = {
  retail: {
    type:                 'retail',
    icon:                 ShoppingBag,
    label:                'Retail shop',
    description:          'General merchandise, grocery, stationery',
    newSaleLabel:         'New sale',
    stockLabel:           'Products',
    stockPageTitle:       'Products & Stock',
    stockEmptyDesc:       'Add products to start tracking your stock.',
    customersLabel:       'Customers',
    isServiceBased:       false,
    posSearchPlaceholder: 'Search products…',
    posCartLabel:         'Cart',
    starterProducts: [
      { name: 'Notebook',     unit: 'pcs', defaultPrice: 25 },
      { name: 'Pen',          unit: 'pcs', defaultPrice: 5  },
      { name: 'Water 500ml',  unit: 'pcs', defaultPrice: 15 },
    ],
  },
  cosmetics: {
    type:                 'cosmetics',
    icon:                 Sparkles,
    label:                'Cosmetics',
    description:          'Beauty products, skincare, makeup',
    newSaleLabel:         'New sale',
    stockLabel:           'Products',
    stockPageTitle:       'Products & Stock',
    stockEmptyDesc:       'Add beauty products to start tracking your stock.',
    customersLabel:       'Customers',
    isServiceBased:       false,
    posSearchPlaceholder: 'Search products…',
    posCartLabel:         'Cart',
    starterProducts: [
      { name: 'Face Cream', unit: 'pcs', defaultPrice: 150 },
      { name: 'Lipstick',   unit: 'pcs', defaultPrice: 80  },
      { name: 'Shampoo',    unit: 'pcs', defaultPrice: 120 },
    ],
  },
  fnb: {
    type:                 'fnb',
    icon:                 Coffee,
    label:                'Café / Coffee house',
    description:          'Coffee, drinks, light food',
    newSaleLabel:         'New order',
    stockLabel:           'Menu items',
    stockPageTitle:       'Menu',
    stockEmptyDesc:       'Add menu items to start taking orders.',
    customersLabel:       'Regulars',
    isServiceBased:       false,
    posSearchPlaceholder: 'Search menu…',
    posCartLabel:         'Order',
    starterProducts: [
      { name: 'Espresso',   unit: 'cup',   defaultPrice: 30 },
      { name: 'Macchiato',  unit: 'cup',   defaultPrice: 35 },
      { name: 'Cappuccino', unit: 'cup',   defaultPrice: 50 },
      { name: 'Juice',      unit: 'glass', defaultPrice: 45 },
    ],
  },
  bakery: {
    type:                 'bakery',
    icon:                 Croissant,
    label:                'Bakery / Pastry',
    description:          'Bread, pastries, cakes, injera',
    newSaleLabel:         'New sale',
    stockLabel:           'Baked goods',
    stockPageTitle:       'Baked Goods & Stock',
    stockEmptyDesc:       'Add baked goods to start tracking what you sell.',
    customersLabel:       'Customers',
    isServiceBased:       false,
    posSearchPlaceholder: 'Search baked goods…',
    posCartLabel:         'Cart',
    starterProducts: [
      { name: 'Bread (small)', unit: 'pcs', defaultPrice: 15 },
      { name: 'Bread (large)', unit: 'pcs', defaultPrice: 25 },
      { name: 'Croissant',     unit: 'pcs', defaultPrice: 35 },
      { name: 'Cake slice',    unit: 'pcs', defaultPrice: 60 },
    ],
  },
  service: {
    type:                 'service',
    icon:                 Wrench,
    label:                'Services',
    description:          'Repairs, professional services',
    newSaleLabel:         'Record service',
    stockLabel:           'Services',
    stockPageTitle:       'Services',
    stockEmptyDesc:       'Add your services and prices.',
    customersLabel:       'Clients',
    isServiceBased:       true,
    posSearchPlaceholder: 'Search services…',
    posCartLabel:         'Services',
    starterProducts: [
      { name: 'Basic service', unit: 'job',     defaultPrice: 100 },
      { name: 'Consultation',  unit: 'session', defaultPrice: 200 },
    ],
  },
  salon: {
    type:                 'salon',
    icon:                 Scissors,
    label:                'Salon / Beauty',
    description:          'Hair, nails, beauty treatments',
    newSaleLabel:         'Record service',
    stockLabel:           'Services',
    stockPageTitle:       'Services & Pricing',
    stockEmptyDesc:       'Add your services and prices.',
    customersLabel:       'Clients',
    isServiceBased:       true,
    posSearchPlaceholder: 'Search services…',
    posCartLabel:         'Services',
    starterProducts: [
      { name: 'Haircut (women)', unit: 'session', defaultPrice: 150 },
      { name: 'Haircut (men)',   unit: 'session', defaultPrice: 80  },
      { name: 'Hair colour',     unit: 'session', defaultPrice: 350 },
      { name: 'Manicure',        unit: 'session', defaultPrice: 120 },
      { name: 'Pedicure',        unit: 'session', defaultPrice: 150 },
    ],
  },
}

export function getBusinessConfig(type: string): BusinessConfig {
  return CONFIGS[type as BusinessType] ?? CONFIGS.retail
}

export const ALL_BUSINESS_TYPES = Object.values(CONFIGS)
