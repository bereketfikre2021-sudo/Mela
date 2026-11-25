/**
 * Business-type configuration.
 *
 * Drives UI labels, dashboard priorities, and onboarding seeding.
 * One shared app; type only affects copy and defaults.
 */
import {
  Scissors,
  ShoppingBag,
  Coffee,
  Croissant,
  Wrench,
  MirrorRound,
  User,
  UtensilsCrossed,
  FlameKindling,
  type LucideIcon,
} from 'lucide-react'
import type { ExpenseCategory } from '../expenses/types'

export type BusinessType =
  | 'retail'
  | 'fnb'
  | 'fastfood'
  | 'bakery'
  | 'service'
  | 'cosmetics'
  | 'salon'
  | 'baltina'
  | 'personal'

export interface StarterExpense {
  title:    string
  category: ExpenseCategory
}

export interface BusinessConfig {
  type:         BusinessType
  icon:         LucideIcon
  label:        string
  description:  string
  newSaleLabel:   string
  stockLabel:     string
  /** i18n key for the stock/services nav label */
  stockLabelKey:  string
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
  starterProducts: { name: string; unit: string; defaultPrice: number; costPrice?: number }[]
  /** Expense category hints seeded at onboarding so the expenses list isn't empty */
  starterExpenses: StarterExpense[]
}

const CONFIGS: Record<BusinessType, BusinessConfig> = {
  // ── Retail ────────────────────────────────────────────────────────────
  retail: {
    type:                 'retail',
    icon:                 ShoppingBag,
    label:                'Retail shop',
    description:          'General merchandise, grocery, stationery',
    newSaleLabel:         'New sale',
    stockLabel:           'Products',
    stockLabelKey:        'nav.products',
    stockPageTitle:       'Products & Stock',
    stockEmptyDesc:       'Add products to start tracking your stock.',
    customersLabel:       'Customers',
    isServiceBased:       false,
    posSearchPlaceholder: 'Search products…',
    posCartLabel:         'Cart',
    starterProducts: [
      { name: 'Water 500ml',      unit: 'pcs',  defaultPrice: 15,  costPrice: 10  },
      { name: 'Water 1L',         unit: 'pcs',  defaultPrice: 20,  costPrice: 14  },
      { name: 'Soft Drink 330ml', unit: 'pcs',  defaultPrice: 25,  costPrice: 18  },
      { name: 'Juice 250ml',      unit: 'pcs',  defaultPrice: 20,  costPrice: 14  },
      { name: 'Notebook A4',      unit: 'pcs',  defaultPrice: 55,  costPrice: 35  },
      { name: 'Notebook A5',      unit: 'pcs',  defaultPrice: 35,  costPrice: 22  },
      { name: 'Pen (blue)',        unit: 'pcs',  defaultPrice: 5,   costPrice: 3   },
      { name: 'Pen (black)',       unit: 'pcs',  defaultPrice: 5,   costPrice: 3   },
      { name: 'Pencil',            unit: 'pcs',  defaultPrice: 3,   costPrice: 2   },
      { name: 'Eraser',            unit: 'pcs',  defaultPrice: 5,   costPrice: 3   },
      { name: 'Highlighter',       unit: 'pcs',  defaultPrice: 20,  costPrice: 12  },
      { name: 'Stapler',           unit: 'pcs',  defaultPrice: 80,  costPrice: 50  },
      { name: 'Tape roll',         unit: 'pcs',  defaultPrice: 15,  costPrice: 9   },
      { name: 'Sugar 1kg',         unit: 'kg',   defaultPrice: 70,  costPrice: 55  },
      { name: 'Vegetable oil 1L',  unit: 'L',    defaultPrice: 120, costPrice: 95  },
      { name: 'Pasta 500g',        unit: 'pcs',  defaultPrice: 45,  costPrice: 35  },
      { name: 'Tomato paste 400g', unit: 'pcs',  defaultPrice: 55,  costPrice: 42  },
      { name: 'Salt 1kg',          unit: 'kg',   defaultPrice: 20,  costPrice: 14  },
      { name: 'Soap bar',          unit: 'pcs',  defaultPrice: 25,  costPrice: 17  },
      { name: 'Detergent 500g',    unit: 'pcs',  defaultPrice: 50,  costPrice: 38  },
      { name: 'Tissue box',        unit: 'pcs',  defaultPrice: 45,  costPrice: 32  },
      { name: 'Candle',            unit: 'pcs',  defaultPrice: 10,  costPrice: 6   },
      { name: 'Matches',           unit: 'pcs',  defaultPrice: 5,   costPrice: 3   },
      { name: 'Battery AA (pair)', unit: 'pair', defaultPrice: 30,  costPrice: 20  },
    ],
    starterExpenses: [
      { title: 'Shop rent',           category: 'rent'         },
      { title: 'Electricity bill',    category: 'utilities'    },
      { title: 'Water bill',          category: 'utilities'    },
      { title: 'Staff salary',        category: 'salaries'     },
      { title: 'Stock purchase',      category: 'supplies'     },
      { title: 'Delivery / transport',category: 'transport'    },
      { title: 'Packaging bags',      category: 'packaging'    },
      { title: 'Shop maintenance',    category: 'maintenance'  },
      { title: 'Marketing / flyers',  category: 'marketing'    },
      { title: 'Bank charges',        category: 'bank_charges' },
    ],
  },

  // ── Cosmetics ─────────────────────────────────────────────────────────
  cosmetics: {
    type:                 'cosmetics',
    icon:                 MirrorRound,
    label:                'Cosmetics',
    description:          'Beauty products, skincare, makeup',
    newSaleLabel:         'New sale',
    stockLabel:           'Products',
    stockLabelKey:        'nav.products',
    stockPageTitle:       'Products & Stock',
    stockEmptyDesc:       'Add beauty products to start tracking your stock.',
    customersLabel:       'Customers',
    isServiceBased:       false,
    posSearchPlaceholder: 'Search products…',
    posCartLabel:         'Cart',
    starterProducts: [
      { name: 'Face Cream 50ml',       unit: 'pcs', defaultPrice: 180, costPrice: 110 },
      { name: 'Face Cream 100ml',      unit: 'pcs', defaultPrice: 300, costPrice: 185 },
      { name: 'Body Lotion 400ml',     unit: 'pcs', defaultPrice: 200, costPrice: 130 },
      { name: 'Sunscreen SPF50',       unit: 'pcs', defaultPrice: 350, costPrice: 220 },
      { name: 'Lipstick',              unit: 'pcs', defaultPrice: 100, costPrice: 60  },
      { name: 'Lip Gloss',             unit: 'pcs', defaultPrice: 80,  costPrice: 48  },
      { name: 'Foundation',            unit: 'pcs', defaultPrice: 350, costPrice: 210 },
      { name: 'Concealer',             unit: 'pcs', defaultPrice: 250, costPrice: 150 },
      { name: 'Mascara',               unit: 'pcs', defaultPrice: 200, costPrice: 120 },
      { name: 'Eyeliner',              unit: 'pcs', defaultPrice: 120, costPrice: 72  },
      { name: 'Eyeshadow palette',     unit: 'pcs', defaultPrice: 450, costPrice: 270 },
      { name: 'Blush',                 unit: 'pcs', defaultPrice: 200, costPrice: 120 },
      { name: 'Nail Polish',           unit: 'pcs', defaultPrice: 60,  costPrice: 36  },
      { name: 'Nail Polish Remover',   unit: 'pcs', defaultPrice: 50,  costPrice: 30  },
      { name: 'Shampoo 400ml',         unit: 'pcs', defaultPrice: 150, costPrice: 95  },
      { name: 'Conditioner 400ml',     unit: 'pcs', defaultPrice: 150, costPrice: 95  },
      { name: 'Hair Oil 200ml',        unit: 'pcs', defaultPrice: 120, costPrice: 75  },
      { name: 'Perfume 50ml',          unit: 'pcs', defaultPrice: 500, costPrice: 300 },
      { name: 'Perfume 100ml',         unit: 'pcs', defaultPrice: 850, costPrice: 510 },
      { name: 'Deodorant',             unit: 'pcs', defaultPrice: 130, costPrice: 80  },
      { name: 'Face Wash',             unit: 'pcs', defaultPrice: 180, costPrice: 110 },
      { name: 'Toner',                 unit: 'pcs', defaultPrice: 220, costPrice: 135 },
      { name: 'Sheet Mask',            unit: 'pcs', defaultPrice: 60,  costPrice: 36  },
      { name: 'Makeup Remover wipes',  unit: 'pcs', defaultPrice: 80,  costPrice: 48  },
    ],
    starterExpenses: [
      { title: 'Shop rent',           category: 'rent'         },
      { title: 'Electricity bill',    category: 'utilities'    },
      { title: 'Staff salary',        category: 'salaries'     },
      { title: 'Product restocking',  category: 'supplies'     },
      { title: 'Display & packaging', category: 'packaging'    },
      { title: 'Transport / delivery',category: 'transport'    },
      { title: 'Marketing / ads',     category: 'marketing'    },
      { title: 'Shop maintenance',    category: 'maintenance'  },
      { title: 'Bank charges',        category: 'bank_charges' },
    ],
  },

  // ── Café / Coffee ─────────────────────────────────────────────────────
  fnb: {
    type:                 'fnb',
    icon:                 Coffee,
    label:                'Café / Coffee',
    description:          'Coffee, drinks, juices & light snacks',
    newSaleLabel:         'New order',
    stockLabel:           'Menu items',
    stockLabelKey:        'nav.stock',
    stockPageTitle:       'Menu',
    stockEmptyDesc:       'Add menu items to start taking orders.',
    customersLabel:       'Regulars',
    isServiceBased:       false,
    posSearchPlaceholder: 'Search menu…',
    posCartLabel:         'Order',
    starterProducts: [
      // Espresso-based
      { name: 'Espresso',          unit: 'cup',   defaultPrice: 30,  costPrice: 10 },
      { name: 'Macchiato',         unit: 'cup',   defaultPrice: 35,  costPrice: 12 },
      { name: 'Cappuccino',        unit: 'cup',   defaultPrice: 55,  costPrice: 18 },
      { name: 'Latte',             unit: 'cup',   defaultPrice: 60,  costPrice: 20 },
      { name: 'Americano',         unit: 'cup',   defaultPrice: 40,  costPrice: 12 },
      { name: 'Flat White',        unit: 'cup',   defaultPrice: 60,  costPrice: 20 },
      { name: 'Mocha',             unit: 'cup',   defaultPrice: 70,  costPrice: 25 },
      { name: 'Cold Brew',         unit: 'cup',   defaultPrice: 65,  costPrice: 20 },
      { name: 'Iced Latte',        unit: 'cup',   defaultPrice: 70,  costPrice: 22 },
      // Tea & hot drinks
      { name: 'Tea (black)',       unit: 'cup',   defaultPrice: 25,  costPrice: 5  },
      { name: 'Spiced Tea (chai)', unit: 'cup',   defaultPrice: 35,  costPrice: 10 },
      { name: 'Hot Chocolate',     unit: 'cup',   defaultPrice: 60,  costPrice: 20 },
      // Juices & cold drinks
      { name: 'Fresh Orange Juice',unit: 'glass', defaultPrice: 70,  costPrice: 30 },
      { name: 'Mixed Fruit Juice', unit: 'glass', defaultPrice: 65,  costPrice: 25 },
      { name: 'Avocado Juice',     unit: 'glass', defaultPrice: 80,  costPrice: 35 },
      { name: 'Mango Juice',       unit: 'glass', defaultPrice: 65,  costPrice: 25 },
      { name: 'Lemon Juice',       unit: 'glass', defaultPrice: 55,  costPrice: 18 },
      { name: 'Smoothie',          unit: 'glass', defaultPrice: 90,  costPrice: 40 },
      // Soft drinks
      { name: 'Soft Drink (can)',  unit: 'can',   defaultPrice: 35,  costPrice: 22 },
      { name: 'Water bottle',      unit: 'pcs',   defaultPrice: 20,  costPrice: 12 },
      // Light snacks
      { name: 'Croissant',         unit: 'pcs',   defaultPrice: 55,  costPrice: 25 },
      { name: 'Muffin',            unit: 'pcs',   defaultPrice: 50,  costPrice: 22 },
      { name: 'Club Sandwich',     unit: 'pcs',   defaultPrice: 120, costPrice: 55 },
      { name: 'Cake slice',        unit: 'pcs',   defaultPrice: 80,  costPrice: 35 },
    ],
    starterExpenses: [
      { title: 'Shop / café rent',      category: 'rent'             },
      { title: 'Electricity bill',      category: 'utilities'        },
      { title: 'Water bill',            category: 'utilities'        },
      { title: 'Coffee beans',          category: 'food_ingredients' },
      { title: 'Milk',                  category: 'food_ingredients' },
      { title: 'Fruits & ingredients',  category: 'food_ingredients' },
      { title: 'Cups & packaging',      category: 'packaging'        },
      { title: 'Staff salary',          category: 'salaries'         },
      { title: 'Equipment maintenance', category: 'maintenance'      },
      { title: 'Marketing / ads',       category: 'marketing'        },
      { title: 'Bank charges',          category: 'bank_charges'     },
    ],
  },

  // ── Fast Food ─────────────────────────────────────────────────────────
  fastfood: {
    type:                 'fastfood',
    icon:                 UtensilsCrossed,
    label:                'Fast Food / Restaurant',
    description:          'Meals, local food, takeaway & delivery',
    newSaleLabel:         'New order',
    stockLabel:           'Menu items',
    stockLabelKey:        'nav.stock',
    stockPageTitle:       'Menu',
    stockEmptyDesc:       'Add menu items to start taking orders.',
    customersLabel:       'Customers',
    isServiceBased:       false,
    posSearchPlaceholder: 'Search menu…',
    posCartLabel:         'Order',
    starterProducts: [
      // Ethiopian staples
      { name: 'Injera (single)',        unit: 'pcs',   defaultPrice: 10,  costPrice: 4   },
      { name: 'Injera (plate)',         unit: 'plate', defaultPrice: 80,  costPrice: 30  },
      { name: 'Tibs (small)',           unit: 'plate', defaultPrice: 180, costPrice: 80  },
      { name: 'Tibs (large)',           unit: 'plate', defaultPrice: 280, costPrice: 120 },
      { name: 'Kitfo',                  unit: 'plate', defaultPrice: 200, costPrice: 90  },
      { name: 'Shiro (small)',          unit: 'plate', defaultPrice: 80,  costPrice: 30  },
      { name: 'Shiro (large)',          unit: 'plate', defaultPrice: 130, costPrice: 50  },
      { name: 'Misir Wot',              unit: 'plate', defaultPrice: 80,  costPrice: 28  },
      { name: 'Kategna',                unit: 'plate', defaultPrice: 60,  costPrice: 20  },
      { name: 'Firfir',                 unit: 'plate', defaultPrice: 90,  costPrice: 32  },
      { name: 'Beyaynetu (fasting)',    unit: 'plate', defaultPrice: 120, costPrice: 45  },
      // Grills & proteins
      { name: 'Chicken (quarter)',      unit: 'plate', defaultPrice: 180, costPrice: 80  },
      { name: 'Chicken (half)',         unit: 'plate', defaultPrice: 320, costPrice: 145 },
      { name: 'Fish (fillet)',          unit: 'plate', defaultPrice: 220, costPrice: 95  },
      { name: 'Burger',                 unit: 'pcs',   defaultPrice: 150, costPrice: 65  },
      { name: 'Sandwich',               unit: 'pcs',   defaultPrice: 80,  costPrice: 32  },
      // Sides
      { name: 'French Fries (small)',   unit: 'pcs',   defaultPrice: 50,  costPrice: 18  },
      { name: 'French Fries (large)',   unit: 'pcs',   defaultPrice: 80,  costPrice: 28  },
      { name: 'Rice (side)',            unit: 'pcs',   defaultPrice: 50,  costPrice: 18  },
      { name: 'Salad',                  unit: 'pcs',   defaultPrice: 60,  costPrice: 22  },
      // Drinks
      { name: 'Soft Drink',             unit: 'pcs',   defaultPrice: 25,  costPrice: 17  },
      { name: 'Water bottle',           unit: 'pcs',   defaultPrice: 20,  costPrice: 12  },
      { name: 'Fresh Juice',            unit: 'glass', defaultPrice: 65,  costPrice: 25  },
      // Breakfast / snacks
      { name: 'Full Breakfast',         unit: 'plate', defaultPrice: 120, costPrice: 48  },
      { name: 'Eggs (2 pcs)',           unit: 'plate', defaultPrice: 50,  costPrice: 18  },
      { name: 'Pasta (small)',          unit: 'plate', defaultPrice: 80,  costPrice: 28  },
      { name: 'Pasta (large)',          unit: 'plate', defaultPrice: 130, costPrice: 48  },
    ],
    starterExpenses: [
      { title: 'Restaurant rent',       category: 'rent'             },
      { title: 'Electricity bill',      category: 'utilities'        },
      { title: 'Water bill',            category: 'utilities'        },
      { title: 'Meat purchase',         category: 'food_ingredients' },
      { title: 'Vegetables & produce',  category: 'food_ingredients' },
      { title: 'Injera / flour',        category: 'food_ingredients' },
      { title: 'Cooking oil',           category: 'food_ingredients' },
      { title: 'Spices & seasoning',    category: 'food_ingredients' },
      { title: 'Staff salary',          category: 'salaries'         },
      { title: 'Packaging & takeaway',  category: 'packaging'        },
      { title: 'Transport / delivery',  category: 'transport'        },
      { title: 'Kitchen maintenance',   category: 'maintenance'      },
      { title: 'Marketing / ads',       category: 'marketing'        },
      { title: 'Bank charges',          category: 'bank_charges'     },
    ],
  },

  // ── Bakery ────────────────────────────────────────────────────────────
  bakery: {
    type:                 'bakery',
    icon:                 Croissant,
    label:                'Bakery / Pastry',
    description:          'Bread, pastries, cakes & injera',
    newSaleLabel:         'New sale',
    stockLabel:           'Baked goods',
    stockLabelKey:        'nav.stock',
    stockPageTitle:       'Baked Goods & Stock',
    stockEmptyDesc:       'Add baked goods to start tracking what you sell.',
    customersLabel:       'Customers',
    isServiceBased:       false,
    posSearchPlaceholder: 'Search baked goods…',
    posCartLabel:         'Cart',
    starterProducts: [
      { name: 'Injera (single)',      unit: 'pcs',  defaultPrice: 10,  costPrice: 3   },
      { name: 'Injera (pack of 5)',   unit: 'pack', defaultPrice: 45,  costPrice: 15  },
      { name: 'White Bread (small)',  unit: 'pcs',  defaultPrice: 15,  costPrice: 6   },
      { name: 'White Bread (large)',  unit: 'pcs',  defaultPrice: 25,  costPrice: 10  },
      { name: 'Whole Wheat Bread',    unit: 'pcs',  defaultPrice: 30,  costPrice: 13  },
      { name: 'Bun / Dinner Roll',    unit: 'pcs',  defaultPrice: 8,   costPrice: 3   },
      { name: 'Croissant',            unit: 'pcs',  defaultPrice: 40,  costPrice: 15  },
      { name: 'Chocolate Croissant',  unit: 'pcs',  defaultPrice: 50,  costPrice: 20  },
      { name: 'Muffin',               unit: 'pcs',  defaultPrice: 45,  costPrice: 18  },
      { name: 'Doughnut',             unit: 'pcs',  defaultPrice: 20,  costPrice: 7   },
      { name: 'Cake slice',           unit: 'pcs',  defaultPrice: 70,  costPrice: 28  },
      { name: 'Whole Cake (small)',   unit: 'pcs',  defaultPrice: 500, costPrice: 200 },
      { name: 'Whole Cake (large)',   unit: 'pcs',  defaultPrice: 900, costPrice: 360 },
      { name: 'Birthday Cake (1kg)',  unit: 'pcs',  defaultPrice: 700, costPrice: 280 },
      { name: 'Brownie',              unit: 'pcs',  defaultPrice: 40,  costPrice: 15  },
      { name: 'Cookie',               unit: 'pcs',  defaultPrice: 15,  costPrice: 5   },
      { name: 'Cheesecake slice',     unit: 'pcs',  defaultPrice: 90,  costPrice: 38  },
      { name: 'Sambusa (3 pcs)',      unit: 'pcs',  defaultPrice: 25,  costPrice: 9   },
      { name: 'Biscuit pack',         unit: 'pcs',  defaultPrice: 30,  costPrice: 11  },
    ],
    starterExpenses: [
      { title: 'Bakery rent',          category: 'rent'             },
      { title: 'Electricity (oven)',   category: 'utilities'        },
      { title: 'Water bill',           category: 'utilities'        },
      { title: 'Flour',                category: 'food_ingredients' },
      { title: 'Teff (injera)',        category: 'food_ingredients' },
      { title: 'Butter & margarine',   category: 'food_ingredients' },
      { title: 'Sugar',                category: 'food_ingredients' },
      { title: 'Eggs',                 category: 'food_ingredients' },
      { title: 'Yeast & baking powder',category: 'food_ingredients' },
      { title: 'Chocolate & cocoa',    category: 'food_ingredients' },
      { title: 'Packaging / boxes',    category: 'packaging'        },
      { title: 'Staff salary',         category: 'salaries'         },
      { title: 'Oven maintenance',     category: 'maintenance'      },
      { title: 'Transport / delivery', category: 'transport'        },
      { title: 'Marketing / flyers',   category: 'marketing'        },
    ],
  },

  // ── Services ──────────────────────────────────────────────────────────
  service: {
    type:                 'service',
    icon:                 Wrench,
    label:                'Services',
    description:          'Repairs, professional & skilled services',
    newSaleLabel:         'Record service',
    stockLabel:           'Services',
    stockLabelKey:        'nav.services',
    stockPageTitle:       'Services',
    stockEmptyDesc:       'Add your services and prices.',
    customersLabel:       'Clients',
    isServiceBased:       true,
    posSearchPlaceholder: 'Search services…',
    posCartLabel:         'Services',
    starterProducts: [
      { name: 'Phone screen repair',    unit: 'job',     defaultPrice: 400,  costPrice: 150 },
      { name: 'Phone battery replace',  unit: 'job',     defaultPrice: 250,  costPrice: 120 },
      { name: 'Laptop repair (basic)',  unit: 'job',     defaultPrice: 500,  costPrice: 100 },
      { name: 'Laptop repair (full)',   unit: 'job',     defaultPrice: 1200, costPrice: 300 },
      { name: 'TV repair',              unit: 'job',     defaultPrice: 600,  costPrice: 150 },
      { name: 'Electrical wiring',      unit: 'job',     defaultPrice: 800,  costPrice: 200 },
      { name: 'Plumbing repair',        unit: 'job',     defaultPrice: 500,  costPrice: 100 },
      { name: 'Painting (per room)',    unit: 'room',    defaultPrice: 1500, costPrice: 600 },
      { name: 'Welding (small job)',    unit: 'job',     defaultPrice: 300,  costPrice: 80  },
      { name: 'Welding (large job)',    unit: 'job',     defaultPrice: 1000, costPrice: 300 },
      { name: 'Photography session',    unit: 'session', defaultPrice: 1500, costPrice: 200 },
      { name: 'Printing (per page)',    unit: 'page',    defaultPrice: 3,    costPrice: 1   },
      { name: 'Lamination (per page)', unit: 'page',    defaultPrice: 15,   costPrice: 4   },
      { name: 'Photocopy (per page)',   unit: 'page',    defaultPrice: 2,    costPrice: 0   },
      { name: 'Consultation (1hr)',     unit: 'session', defaultPrice: 500,  costPrice: 0   },
      { name: 'Delivery service',       unit: 'trip',    defaultPrice: 200,  costPrice: 80  },
      { name: 'Car wash (basic)',       unit: 'job',     defaultPrice: 100,  costPrice: 20  },
      { name: 'Car wash (full)',        unit: 'job',     defaultPrice: 200,  costPrice: 40  },
      { name: 'Tailoring (simple)',     unit: 'job',     defaultPrice: 200,  costPrice: 50  },
      { name: 'Tailoring (full dress)', unit: 'job',     defaultPrice: 800,  costPrice: 200 },
    ],
    starterExpenses: [
      { title: 'Workshop / office rent', category: 'rent'         },
      { title: 'Electricity bill',       category: 'utilities'    },
      { title: 'Staff salary',           category: 'salaries'     },
      { title: 'Spare parts & supplies', category: 'supplies'     },
      { title: 'Transport',              category: 'transport'    },
      { title: 'Tool & equipment repair',category: 'maintenance'  },
      { title: 'New equipment',          category: 'equipment'    },
      { title: 'Marketing / ads',        category: 'marketing'    },
      { title: 'Bank charges',           category: 'bank_charges' },
    ],
  },

  // ── Salon, Spa & Beauty ───────────────────────────────────────────────
  salon: {
    type:                 'salon',
    icon:                 Scissors,
    label:                'Beauty Salon & Spa',
    description:          'Hair, nails, skin, massage & spa treatments',
    newSaleLabel:         'Record service',
    stockLabel:           'Services',
    stockLabelKey:        'nav.services',
    stockPageTitle:       'Services & Pricing',
    stockEmptyDesc:       'Add your services and prices.',
    customersLabel:       'Clients',
    isServiceBased:       true,
    posSearchPlaceholder: 'Search services…',
    posCartLabel:         'Services',
    starterProducts: [
      // ── Hair – women
      { name: 'Haircut (women)',          unit: 'session', defaultPrice: 150,  costPrice: 30  },
      { name: 'Hair wash & blow dry',     unit: 'session', defaultPrice: 120,  costPrice: 20  },
      { name: 'Hair colour (full)',        unit: 'session', defaultPrice: 500,  costPrice: 180 },
      { name: 'Hair colour (partial)',    unit: 'session', defaultPrice: 300,  costPrice: 100 },
      { name: 'Hair relaxer',             unit: 'session', defaultPrice: 350,  costPrice: 120 },
      { name: 'Hair treatment / mask',    unit: 'session', defaultPrice: 200,  costPrice: 60  },
      { name: 'Braiding (simple)',        unit: 'session', defaultPrice: 200,  costPrice: 30  },
      { name: 'Braiding (cornrows)',      unit: 'session', defaultPrice: 350,  costPrice: 50  },
      { name: 'Wig install',              unit: 'session', defaultPrice: 300,  costPrice: 50  },
      { name: 'Keratin treatment',        unit: 'session', defaultPrice: 800,  costPrice: 300 },
      // ── Hair – men
      { name: 'Haircut (men)',            unit: 'session', defaultPrice: 80,   costPrice: 15  },
      { name: 'Haircut + beard trim',     unit: 'session', defaultPrice: 120,  costPrice: 20  },
      { name: 'Beard trim',               unit: 'session', defaultPrice: 50,   costPrice: 10  },
      { name: 'Head shave',               unit: 'session', defaultPrice: 60,   costPrice: 10  },
      // ── Nails
      { name: 'Manicure (basic)',         unit: 'session', defaultPrice: 120,  costPrice: 25  },
      { name: 'Manicure + gel',           unit: 'session', defaultPrice: 200,  costPrice: 60  },
      { name: 'Pedicure (basic)',         unit: 'session', defaultPrice: 150,  costPrice: 30  },
      { name: 'Pedicure + gel',           unit: 'session', defaultPrice: 250,  costPrice: 75  },
      { name: 'Nail art',                 unit: 'session', defaultPrice: 80,   costPrice: 20  },
      { name: 'Acrylic nails (full set)', unit: 'session', defaultPrice: 400,  costPrice: 130 },
      // ── Skin & face
      { name: 'Facial (basic)',           unit: 'session', defaultPrice: 250,  costPrice: 60  },
      { name: 'Facial (deep clean)',      unit: 'session', defaultPrice: 400,  costPrice: 100 },
      { name: 'Eyebrow threading',        unit: 'session', defaultPrice: 50,   costPrice: 8   },
      { name: 'Eyebrow tint',             unit: 'session', defaultPrice: 80,   costPrice: 20  },
      { name: 'Waxing (legs)',            unit: 'session', defaultPrice: 200,  costPrice: 50  },
      { name: 'Waxing (underarm)',        unit: 'session', defaultPrice: 80,   costPrice: 20  },
      // ── Makeup
      { name: 'Makeup (bridal)',          unit: 'session', defaultPrice: 1500, costPrice: 300 },
      { name: 'Makeup (event)',           unit: 'session', defaultPrice: 500,  costPrice: 100 },
      // ── Spa & wellness
      { name: 'Full body massage (60min)',unit: 'session', defaultPrice: 600,  costPrice: 80  },
      { name: 'Full body massage (90min)',unit: 'session', defaultPrice: 900,  costPrice: 120 },
      { name: 'Back & shoulder massage',  unit: 'session', defaultPrice: 350,  costPrice: 50  },
      { name: 'Hot stone massage',        unit: 'session', defaultPrice: 800,  costPrice: 150 },
      { name: 'Aromatherapy massage',     unit: 'session', defaultPrice: 700,  costPrice: 120 },
      { name: 'Head & scalp massage',     unit: 'session', defaultPrice: 200,  costPrice: 25  },
      { name: 'Body scrub',               unit: 'session', defaultPrice: 500,  costPrice: 90  },
      { name: 'Body wrap',                unit: 'session', defaultPrice: 600,  costPrice: 110 },
      { name: 'Steam bath',               unit: 'session', defaultPrice: 150,  costPrice: 20  },
      { name: 'Sauna session',            unit: 'session', defaultPrice: 200,  costPrice: 30  },
      { name: 'Foot soak & massage',      unit: 'session', defaultPrice: 250,  costPrice: 40  },
      { name: 'Hydrotherapy',             unit: 'session', defaultPrice: 400,  costPrice: 60  },
    ],
    starterExpenses: [
      { title: 'Salon / spa rent',        category: 'rent'         },
      { title: 'Electricity bill',        category: 'utilities'    },
      { title: 'Water bill',              category: 'utilities'    },
      { title: 'Staff salary',            category: 'salaries'     },
      { title: 'Hair products & colour',  category: 'supplies'     },
      { title: 'Nail products',           category: 'supplies'     },
      { title: 'Skin & spa products',     category: 'supplies'     },
      { title: 'Massage oils & lotions',  category: 'supplies'     },
      { title: 'Equipment maintenance',   category: 'maintenance'  },
      { title: 'New equipment / tools',   category: 'equipment'    },
      { title: 'Towels & linens',         category: 'supplies'     },
      { title: 'Marketing / ads',         category: 'marketing'    },
      { title: 'Bank charges',            category: 'bank_charges' },
    ],
  },

  // ── Baltina (Spice & Food Processing) ────────────────────────────────
  baltina: {
    type:                 'baltina',
    icon:                 FlameKindling,
    label:                'Baltina / Spice Shop',
    description:          'Spice blends, shiro, berbere & flour mixes',
    newSaleLabel:         'New sale',
    stockLabel:           'Products',
    stockLabelKey:        'nav.products',
    stockPageTitle:       'Products & Stock',
    stockEmptyDesc:       'Add your spice products to start tracking stock.',
    customersLabel:       'Customers',
    isServiceBased:       false,
    posSearchPlaceholder: 'Search products…',
    posCartLabel:         'Cart',
    starterProducts: [
      // ── Berbere blends
      { name: 'Berbere (100g)',                          unit: 'pcs', defaultPrice: 40,  costPrice: 18  },
      { name: 'Berbere (250g)',                          unit: 'pcs', defaultPrice: 90,  costPrice: 40  },
      { name: 'Berbere (500g)',                          unit: 'pcs', defaultPrice: 170, costPrice: 75  },
      { name: 'Berbere (1kg)',                           unit: 'kg',  defaultPrice: 320, costPrice: 140 },
      // ── Shiro
      { name: 'Shiro (100g)',                            unit: 'pcs', defaultPrice: 25,  costPrice: 10  },
      { name: 'Shiro (250g)',                            unit: 'pcs', defaultPrice: 55,  costPrice: 22  },
      { name: 'Shiro (500g)',                            unit: 'pcs', defaultPrice: 100, costPrice: 42  },
      { name: 'Shiro (1kg)',                             unit: 'kg',  defaultPrice: 190, costPrice: 80  },
      { name: 'Shiro (spiced)',                          unit: 'pcs', defaultPrice: 60,  costPrice: 25  },
      // ── Mitmita & hot chili
      { name: 'Mitmita (50g)',                           unit: 'pcs', defaultPrice: 35,  costPrice: 14  },
      { name: 'Mitmita (100g)',                          unit: 'pcs', defaultPrice: 65,  costPrice: 26  },
      { name: 'Dried red chili peppers (100g)',          unit: 'pcs', defaultPrice: 30,  costPrice: 12  },
      { name: 'Dried red chili peppers (500g)',          unit: 'pcs', defaultPrice: 130, costPrice: 55  },
      { name: 'Awaze paste (100g)',                      unit: 'pcs', defaultPrice: 45,  costPrice: 18  },
      { name: 'Awaze paste (250g)',                      unit: 'pcs', defaultPrice: 100, costPrice: 42  },
      // ── Korarima (Ethiopian cardamom)
      { name: 'Korerima / Cardamom — whole (50g)',       unit: 'pcs', defaultPrice: 60,  costPrice: 25  },
      { name: 'Korerima / Cardamom — ground (50g)',      unit: 'pcs', defaultPrice: 50,  costPrice: 20  },
      // ── Fenugreek (Yetekola Abesh)
      { name: 'Fenugreek / Abesh — seeds (100g)',        unit: 'pcs', defaultPrice: 20,  costPrice: 8   },
      { name: 'Fenugreek / Abesh — ground (100g)',       unit: 'pcs', defaultPrice: 25,  costPrice: 10  },
      // ── Coriander (Dembelal)
      { name: 'Coriander / Dembelal — seeds (100g)',     unit: 'pcs', defaultPrice: 20,  costPrice: 8   },
      { name: 'Coriander / Dembelal — ground (100g)',    unit: 'pcs', defaultPrice: 25,  costPrice: 10  },
      // ── Garlic (Netch Shenqurt)
      { name: 'Garlic / Netch Shenqurt — fresh (250g)',  unit: 'pcs', defaultPrice: 30,  costPrice: 15  },
      { name: 'Garlic / Netch Shenqurt — powder (100g)', unit: 'pcs', defaultPrice: 35,  costPrice: 14  },
      // ── Ginger (Ziniibil)
      { name: 'Ginger / Ziniibil — fresh (250g)',        unit: 'pcs', defaultPrice: 25,  costPrice: 12  },
      { name: 'Ginger / Ziniibil — powder (100g)',       unit: 'pcs', defaultPrice: 30,  costPrice: 12  },
      // ── Cumin (Kemun)
      { name: 'Cumin / Kemun — seeds (100g)',            unit: 'pcs', defaultPrice: 25,  costPrice: 10  },
      { name: 'Cumin / Kemun — ground (100g)',           unit: 'pcs', defaultPrice: 30,  costPrice: 12  },
      // ── Black cumin (Tikur Azmud)
      { name: 'Black cumin / Tikur Azmud (50g)',         unit: 'pcs', defaultPrice: 25,  costPrice: 10  },
      { name: 'Black cumin / Tikur Azmud (100g)',        unit: 'pcs', defaultPrice: 45,  costPrice: 18  },
      // ── Ajwain / Bishop's weed (Nech Azmud)
      { name: 'Ajwain / Nech Azmud (50g)',               unit: 'pcs', defaultPrice: 20,  costPrice: 8   },
      { name: 'Ajwain / Nech Azmud (100g)',              unit: 'pcs', defaultPrice: 35,  costPrice: 14  },
      // ── Black pepper (K'undo Berebere)
      { name: "Black pepper / K'undo Berebere — whole (50g)",  unit: 'pcs', defaultPrice: 40, costPrice: 16 },
      { name: "Black pepper / K'undo Berebere — ground (50g)", unit: 'pcs', defaultPrice: 35, costPrice: 14 },
      // ── Turmeric
      { name: 'Turmeric — powder (100g)',                unit: 'pcs', defaultPrice: 25,  costPrice: 10  },
      { name: 'Turmeric — fresh root (250g)',            unit: 'pcs', defaultPrice: 20,  costPrice: 9   },
      // ── Cinnamon (Kerefa)
      { name: 'Cinnamon / Kerefa — sticks (50g)',        unit: 'pcs', defaultPrice: 35,  costPrice: 14  },
      { name: 'Cinnamon / Kerefa — ground (50g)',        unit: 'pcs', defaultPrice: 30,  costPrice: 12  },
      // ── Cloves (Kurenfud)
      { name: 'Cloves / Kurenfud — whole (50g)',         unit: 'pcs', defaultPrice: 50,  costPrice: 22  },
      { name: 'Cloves / Kurenfud — ground (50g)',        unit: 'pcs', defaultPrice: 45,  costPrice: 18  },
      // ── Nutmeg (Gewz)
      { name: 'Nutmeg / Gewz — whole (50g)',             unit: 'pcs', defaultPrice: 60,  costPrice: 28  },
      { name: 'Nutmeg / Gewz — ground (50g)',            unit: 'pcs', defaultPrice: 55,  costPrice: 24  },
      // ── Allspice
      { name: 'Allspice — whole (50g)',                  unit: 'pcs', defaultPrice: 40,  costPrice: 16  },
      { name: 'Allspice — ground (50g)',                 unit: 'pcs', defaultPrice: 35,  costPrice: 14  },
      // ── Ethiopian holy basil (Besobela)
      { name: 'Besobela / Holy basil — dried (50g)',     unit: 'pcs', defaultPrice: 30,  costPrice: 12  },
      { name: 'Besobela / Holy basil — ground (50g)',    unit: 'pcs', defaultPrice: 25,  costPrice: 10  },
      // ── Rue (Tena Adam)
      { name: 'Rue / Tena Adam — dried (50g)',           unit: 'pcs', defaultPrice: 25,  costPrice: 10  },
      // ── Salt
      { name: 'Salt — fine (500g)',                      unit: 'pcs', defaultPrice: 15,  costPrice: 8   },
      { name: 'Salt — coarse (1kg)',                     unit: 'kg',  defaultPrice: 25,  costPrice: 13  },
      // ── Flours & legume powders
      { name: 'Teff flour (500g)',                       unit: 'pcs', defaultPrice: 55,  costPrice: 35  },
      { name: 'Teff flour (1kg)',                        unit: 'kg',  defaultPrice: 100, costPrice: 65  },
      { name: 'Wheat flour (1kg)',                       unit: 'kg',  defaultPrice: 50,  costPrice: 32  },
      { name: 'Chickpea flour (500g)',                   unit: 'pcs', defaultPrice: 45,  costPrice: 28  },
      { name: 'Barley flour (500g)',                     unit: 'pcs', defaultPrice: 40,  costPrice: 24  },
      { name: 'Corn flour (500g)',                       unit: 'pcs', defaultPrice: 35,  costPrice: 20  },
      // ── Mixed / special blends
      { name: 'Niter kibbeh spice mix (100g)',           unit: 'pcs', defaultPrice: 55,  costPrice: 22  },
      { name: 'Tibs spice mix (100g)',                   unit: 'pcs', defaultPrice: 40,  costPrice: 16  },
      { name: 'Coffee spice / Yebuna Qurs (100g)',       unit: 'pcs', defaultPrice: 45,  costPrice: 18  },
    ],
    starterExpenses: [
      { title: 'Shop / stall rent',       category: 'rent'             },
      { title: 'Electricity bill',        category: 'utilities'        },
      { title: 'Raw spices purchase',     category: 'food_ingredients' },
      { title: 'Legumes & grains',        category: 'food_ingredients' },
      { title: 'Grinding machine fuel',   category: 'utilities'        },
      { title: 'Packaging (bags/jars)',   category: 'packaging'        },
      { title: 'Labels & printing',       category: 'packaging'        },
      { title: 'Staff / labour',          category: 'salaries'         },
      { title: 'Transport / delivery',    category: 'transport'        },
      { title: 'Grinding machine repair', category: 'maintenance'      },
      { title: 'New equipment',           category: 'equipment'        },
      { title: 'Market stall / display',  category: 'marketing'        },
      { title: 'Bank charges',            category: 'bank_charges'     },
    ],
  },

  // ── Personal ──────────────────────────────────────────────────────────
  personal: {
    type:                 'personal',
    icon:                 User,
    label:                'Personal',
    description:          'Track personal income, spending & budgets',
    newSaleLabel:         'Add income',
    stockLabel:           'Items',
    stockLabelKey:        'nav.stock',
    stockPageTitle:       'Items',
    stockEmptyDesc:       'Add items to start tracking.',
    customersLabel:       'Contacts',
    isServiceBased:       true,
    posSearchPlaceholder: 'Search items…',
    posCartLabel:         'Items',
    starterProducts: [
      { name: 'Monthly salary',      unit: 'month', defaultPrice: 10000, costPrice: 0 },
      { name: 'Freelance / side job', unit: 'job',  defaultPrice: 2000,  costPrice: 0 },
      { name: 'Business income',     unit: 'month', defaultPrice: 5000,  costPrice: 0 },
      { name: 'Rental income',       unit: 'month', defaultPrice: 3000,  costPrice: 0 },
      { name: 'Other income',        unit: 'entry', defaultPrice: 500,   costPrice: 0 },
    ],
    starterExpenses: [
      // Housing
      { title: 'House / room rent',       category: 'rent'             },
      // Utilities
      { title: 'Electricity bill',        category: 'utilities'        },
      { title: 'Water bill',              category: 'utilities'        },
      { title: 'Internet bill',           category: 'utilities'        },
      { title: 'Phone / airtime',         category: 'utilities'        },
      // Food & daily living
      { title: 'Groceries & food',        category: 'food_ingredients' },
      { title: 'Eating out / restaurant', category: 'food_ingredients' },
      // Transport
      { title: 'Daily transport (taxi/bus)', category: 'transport'    },
      { title: 'Fuel (if own vehicle)',    category: 'transport'       },
      { title: 'Vehicle maintenance',      category: 'maintenance'     },
      // Education
      { title: 'School / university fees', category: 'other'          },
      { title: 'Books & stationery',       category: 'supplies'        },
      { title: 'Course / training fees',   category: 'other'           },
      // Health
      { title: 'Medical / clinic',         category: 'other'           },
      { title: 'Pharmacy / medicine',      category: 'supplies'        },
      // Personal care & clothing
      { title: 'Clothing & shoes',         category: 'other'           },
      { title: 'Salon / personal care',    category: 'other'           },
      // Family & social
      { title: 'Family support',           category: 'other'           },
      { title: 'Church / charity',         category: 'other'           },
      { title: 'Social events / gifts',    category: 'other'           },
      // Savings & finance
      { title: 'Monthly savings',          category: 'bank_charges'    },
      { title: 'Equb contribution',        category: 'other'           },
      { title: 'Loan repayment',           category: 'other'           },
      { title: 'Bank charges',             category: 'bank_charges'    },
    ],
  },
}

export function getBusinessConfig(type: string): BusinessConfig {
  return CONFIGS[type as BusinessType] ?? CONFIGS.retail
}

export const ALL_BUSINESS_TYPES = Object.values(CONFIGS)
