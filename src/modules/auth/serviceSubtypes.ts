/**
 * Sub-type configuration for onboarding.
 *
 * When a user picks a parent type that has sub-types (service, fnb, retail,
 * fastfood) they see a second picker before the name step. The selected
 * sub-type drives the starter products & expenses seeded at the end.
 *
 * The business record always stores the parent BusinessType — sub-types are
 * onboarding-only and need no DB column.
 */
import type { BusinessType } from './businessConfig'
import type { ExpenseCategory } from '../expenses/types'
import {
  // service icons
  Wrench, PenTool, DraftingCompass, Sofa, Car, WashingMachine, Shirt,
  // fnb icons
  Coffee, UtensilsCrossed,
  // retail icons
  ShoppingBag, BookOpen, Cpu, HardHat, Shirt as ClothingIcon,
  // fastfood icons
  Wheat, Flame, Sandwich, ChefHat, Sunrise, LayoutGrid,
  type LucideIcon,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ServiceSubtype =
  | 'service_repairs'
  | 'service_creative'
  | 'service_architecture'
  | 'service_furniture'
  | 'service_carwash'
  | 'service_laundry'
  | 'service_tailoring'
  | 'service_general'

export type FnbSubtype =
  | 'fnb_coffeehouse'
  | 'fnb_cafe'

export type RetailSubtype =
  | 'retail_grocery'
  | 'retail_stationery'
  | 'retail_electronics'
  | 'retail_clothing'
  | 'retail_hardware'
  | 'retail_general'

export type FastfoodSubtype =
  | 'fastfood_ethiopian'
  | 'fastfood_shawarma'
  | 'fastfood_burgerandpizza'
  | 'fastfood_juice'
  | 'fastfood_breakfast'
  | 'fastfood_general'

export type Subtype = ServiceSubtype | FnbSubtype | RetailSubtype | FastfoodSubtype

export interface SubtypeConfig {
  subtype:     Subtype
  parentType:  'service' | 'fnb' | 'retail' | 'fastfood'
  icon:        LucideIcon
  label:       string
  description: string
  starterProducts: { name: string; unit: string; defaultPrice: number; costPrice?: number }[]
  starterExpenses: { title: string; category: ExpenseCategory }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// RETAIL SUB-TYPES
// ─────────────────────────────────────────────────────────────────────────────

const RETAIL_SUBTYPES: SubtypeConfig[] = [

  // ── Grocery / Supermarket ───────────────────────────────────────────────
  {
    subtype:     'retail_grocery',
    parentType:  'retail',
    icon:        ShoppingBag,
    label:       'Grocery & Supermarket',
    description: 'Food staples, drinks, household & daily essentials',
    starterProducts: [
      // Drinks
      { name: 'Water 500ml',           unit: 'pcs', defaultPrice: 15,  costPrice: 10  },
      { name: 'Water 1L',              unit: 'pcs', defaultPrice: 20,  costPrice: 14  },
      { name: 'Soft Drink 330ml',      unit: 'pcs', defaultPrice: 25,  costPrice: 18  },
      { name: 'Juice 250ml',           unit: 'pcs', defaultPrice: 20,  costPrice: 14  },
      { name: 'Milk 500ml',            unit: 'pcs', defaultPrice: 35,  costPrice: 25  },
      // Grains & staples
      { name: 'Teff 1kg',              unit: 'kg',  defaultPrice: 80,  costPrice: 60  },
      { name: 'Wheat flour 1kg',       unit: 'kg',  defaultPrice: 50,  costPrice: 35  },
      { name: 'Rice 1kg',              unit: 'kg',  defaultPrice: 70,  costPrice: 52  },
      { name: 'Pasta 500g',            unit: 'pcs', defaultPrice: 45,  costPrice: 35  },
      { name: 'Lentils 1kg',           unit: 'kg',  defaultPrice: 60,  costPrice: 44  },
      { name: 'Chickpeas 1kg',         unit: 'kg',  defaultPrice: 65,  costPrice: 48  },
      // Cooking essentials
      { name: 'Vegetable oil 1L',      unit: 'L',   defaultPrice: 120, costPrice: 95  },
      { name: 'Sugar 1kg',             unit: 'kg',  defaultPrice: 70,  costPrice: 55  },
      { name: 'Salt 1kg',              unit: 'kg',  defaultPrice: 20,  costPrice: 14  },
      { name: 'Tomato paste 400g',     unit: 'pcs', defaultPrice: 55,  costPrice: 42  },
      { name: 'Berbere 100g',          unit: 'pcs', defaultPrice: 40,  costPrice: 28  },
      { name: 'Shiro 250g',            unit: 'pcs', defaultPrice: 55,  costPrice: 38  },
      { name: 'Eggs (tray of 30)',     unit: 'tray',defaultPrice: 350, costPrice: 270 },
      // Household
      { name: 'Soap bar',              unit: 'pcs', defaultPrice: 25,  costPrice: 17  },
      { name: 'Detergent 500g',        unit: 'pcs', defaultPrice: 50,  costPrice: 38  },
      { name: 'Tissue box',            unit: 'pcs', defaultPrice: 45,  costPrice: 32  },
      { name: 'Toilet paper (4 rolls)',unit: 'pcs', defaultPrice: 60,  costPrice: 44  },
      { name: 'Candle',                unit: 'pcs', defaultPrice: 10,  costPrice: 6   },
      { name: 'Matches',               unit: 'pcs', defaultPrice: 5,   costPrice: 3   },
      { name: 'Battery AA (pair)',      unit: 'pair',defaultPrice: 30,  costPrice: 20  },
    ],
    starterExpenses: [
      { title: 'Shop rent',             category: 'rent'             },
      { title: 'Electricity bill',      category: 'utilities'        },
      { title: 'Water bill',            category: 'utilities'        },
      { title: 'Staff salary',          category: 'salaries'         },
      { title: 'Stock purchase',        category: 'supplies'         },
      { title: 'Transport / delivery',  category: 'transport'        },
      { title: 'Packaging bags',        category: 'packaging'        },
      { title: 'Shop maintenance',      category: 'maintenance'      },
      { title: 'Marketing / flyers',    category: 'marketing'        },
      { title: 'Bank charges',          category: 'bank_charges'     },
    ],
  },

  // ── Stationery & Office ─────────────────────────────────────────────────
  {
    subtype:     'retail_stationery',
    parentType:  'retail',
    icon:        BookOpen,
    label:       'Stationery & Office Supply',
    description: 'Notebooks, pens, paper, printing & office supplies',
    starterProducts: [
      // Writing
      { name: 'Pen (blue)',              unit: 'pcs', defaultPrice: 5,   costPrice: 3   },
      { name: 'Pen (black)',             unit: 'pcs', defaultPrice: 5,   costPrice: 3   },
      { name: 'Pen (red)',               unit: 'pcs', defaultPrice: 5,   costPrice: 3   },
      { name: 'Pencil',                  unit: 'pcs', defaultPrice: 3,   costPrice: 2   },
      { name: 'Mechanical pencil',       unit: 'pcs', defaultPrice: 20,  costPrice: 12  },
      { name: 'Highlighter',             unit: 'pcs', defaultPrice: 20,  costPrice: 12  },
      { name: 'Marker (permanent)',      unit: 'pcs', defaultPrice: 25,  costPrice: 15  },
      { name: 'Whiteboard marker',       unit: 'pcs', defaultPrice: 25,  costPrice: 15  },
      // Notebooks & paper
      { name: 'Notebook A4 (lined)',     unit: 'pcs', defaultPrice: 55,  costPrice: 35  },
      { name: 'Notebook A5',             unit: 'pcs', defaultPrice: 35,  costPrice: 22  },
      { name: 'Exercise book (100 pg)',  unit: 'pcs', defaultPrice: 25,  costPrice: 15  },
      { name: 'A4 paper (ream 500 pcs)', unit: 'ream',defaultPrice: 350, costPrice: 260 },
      { name: 'Sticky notes',            unit: 'pcs', defaultPrice: 25,  costPrice: 15  },
      { name: 'Sketch pad A4',           unit: 'pcs', defaultPrice: 60,  costPrice: 38  },
      // Desk supplies
      { name: 'Eraser',                  unit: 'pcs', defaultPrice: 5,   costPrice: 3   },
      { name: 'Ruler 30cm',              unit: 'pcs', defaultPrice: 15,  costPrice: 9   },
      { name: 'Scissors',                unit: 'pcs', defaultPrice: 35,  costPrice: 22  },
      { name: 'Stapler',                 unit: 'pcs', defaultPrice: 80,  costPrice: 50  },
      { name: 'Staples (box)',           unit: 'box', defaultPrice: 15,  costPrice: 9   },
      { name: 'Tape roll',               unit: 'pcs', defaultPrice: 15,  costPrice: 9   },
      { name: 'Glue stick',              unit: 'pcs', defaultPrice: 15,  costPrice: 9   },
      { name: 'Correction fluid (tipp)', unit: 'pcs', defaultPrice: 20,  costPrice: 12  },
      { name: 'Paper clip (box)',        unit: 'box', defaultPrice: 10,  costPrice: 6   },
      { name: 'Binder clip (set)',       unit: 'set', defaultPrice: 20,  costPrice: 12  },
      // Folders & filing
      { name: 'Plastic folder (A4)',     unit: 'pcs', defaultPrice: 15,  costPrice: 9   },
      { name: 'File folder',             unit: 'pcs', defaultPrice: 20,  costPrice: 12  },
      { name: 'Ring binder',             unit: 'pcs', defaultPrice: 55,  costPrice: 35  },
      // Printing & consumables
      { name: 'Printing (per page, B&W)',unit: 'page',defaultPrice: 3,   costPrice: 1   },
      { name: 'Printing (per page, colour)',unit:'page',defaultPrice: 8,  costPrice: 3   },
      { name: 'Lamination (per page)',   unit: 'page',defaultPrice: 15,  costPrice: 4   },
      { name: 'Photocopy (per page)',    unit: 'page',defaultPrice: 2,   costPrice: 0   },
    ],
    starterExpenses: [
      { title: 'Shop rent',              category: 'rent'         },
      { title: 'Electricity bill',       category: 'utilities'    },
      { title: 'Staff salary',           category: 'salaries'     },
      { title: 'Stock purchase',         category: 'supplies'     },
      { title: 'Printer ink / toner',    category: 'supplies'     },
      { title: 'Printer maintenance',    category: 'maintenance'  },
      { title: 'Transport',              category: 'transport'    },
      { title: 'Marketing / flyers',     category: 'marketing'    },
      { title: 'Bank charges',           category: 'bank_charges' },
    ],
  },

  // ── Electronics & Accessories ───────────────────────────────────────────
  {
    subtype:     'retail_electronics',
    parentType:  'retail',
    icon:        Cpu,
    label:       'Electronics & Accessories',
    description: 'Phone accessories, cables, batteries, earphones & small electronics',
    starterProducts: [
      // Phone accessories
      { name: 'Phone case (generic)',         unit: 'pcs', defaultPrice: 80,   costPrice: 35  },
      { name: 'Phone case (branded)',         unit: 'pcs', defaultPrice: 200,  costPrice: 90  },
      { name: 'Tempered glass screen guard',  unit: 'pcs', defaultPrice: 50,   costPrice: 20  },
      { name: 'USB-C charging cable',         unit: 'pcs', defaultPrice: 80,   costPrice: 35  },
      { name: 'Lightning cable (iPhone)',     unit: 'pcs', defaultPrice: 100,  costPrice: 45  },
      { name: 'Micro-USB cable',              unit: 'pcs', defaultPrice: 60,   costPrice: 25  },
      { name: 'Wall charger (5W)',            unit: 'pcs', defaultPrice: 80,   costPrice: 35  },
      { name: 'Wall charger (20W fast)',      unit: 'pcs', defaultPrice: 180,  costPrice: 85  },
      { name: 'Car charger',                  unit: 'pcs', defaultPrice: 100,  costPrice: 45  },
      { name: 'Power bank 10000mAh',          unit: 'pcs', defaultPrice: 500,  costPrice: 250 },
      { name: 'Power bank 20000mAh',          unit: 'pcs', defaultPrice: 800,  costPrice: 400 },
      // Audio
      { name: 'Earphones (wired)',            unit: 'pcs', defaultPrice: 100,  costPrice: 45  },
      { name: 'Earphones (in-ear, branded)',  unit: 'pcs', defaultPrice: 300,  costPrice: 150 },
      { name: 'Wireless earbuds',             unit: 'pcs', defaultPrice: 800,  costPrice: 400 },
      { name: 'Bluetooth speaker (small)',    unit: 'pcs', defaultPrice: 500,  costPrice: 250 },
      { name: 'Bluetooth speaker (large)',    unit: 'pcs', defaultPrice: 1200, costPrice: 600 },
      // Batteries & storage
      { name: 'Battery AA (pair)',             unit: 'pair',defaultPrice: 30,   costPrice: 18  },
      { name: 'Battery AAA (pair)',            unit: 'pair',defaultPrice: 25,   costPrice: 15  },
      { name: 'USB flash drive 32GB',         unit: 'pcs', defaultPrice: 200,  costPrice: 100 },
      { name: 'USB flash drive 64GB',         unit: 'pcs', defaultPrice: 300,  costPrice: 150 },
      { name: 'Memory card 32GB',             unit: 'pcs', defaultPrice: 180,  costPrice: 90  },
      { name: 'Memory card 64GB',             unit: 'pcs', defaultPrice: 280,  costPrice: 140 },
      // Accessories
      { name: 'OTG adapter',                  unit: 'pcs', defaultPrice: 60,   costPrice: 25  },
      { name: 'USB hub (4-port)',              unit: 'pcs', defaultPrice: 200,  costPrice: 100 },
      { name: 'Selfie stick',                 unit: 'pcs', defaultPrice: 150,  costPrice: 70  },
      { name: 'Phone ring holder',            unit: 'pcs', defaultPrice: 30,   costPrice: 12  },
      { name: 'Laptop bag',                   unit: 'pcs', defaultPrice: 400,  costPrice: 200 },
      { name: 'Mouse (wired)',                 unit: 'pcs', defaultPrice: 200,  costPrice: 100 },
      { name: 'Mouse (wireless)',              unit: 'pcs', defaultPrice: 350,  costPrice: 175 },
      { name: 'Keyboard (USB)',                unit: 'pcs', defaultPrice: 300,  costPrice: 150 },
    ],
    starterExpenses: [
      { title: 'Shop rent',              category: 'rent'         },
      { title: 'Electricity bill',       category: 'utilities'    },
      { title: 'Staff salary',           category: 'salaries'     },
      { title: 'Stock purchase',         category: 'supplies'     },
      { title: 'Transport / delivery',   category: 'transport'    },
      { title: 'Display & packaging',    category: 'packaging'    },
      { title: 'Shop maintenance',       category: 'maintenance'  },
      { title: 'Marketing / ads',        category: 'marketing'    },
      { title: 'Bank charges',           category: 'bank_charges' },
    ],
  },

  // ── Clothing & Fashion ──────────────────────────────────────────────────
  {
    subtype:     'retail_clothing',
    parentType:  'retail',
    icon:        ClothingIcon,
    label:       'Clothing & Fashion',
    description: 'Men\'s, women\'s & children\'s clothing, shoes & accessories',
    starterProducts: [
      // Men's
      { name: 'Men\'s T-shirt',           unit: 'pcs', defaultPrice: 200,  costPrice: 100 },
      { name: 'Men\'s shirt (formal)',     unit: 'pcs', defaultPrice: 350,  costPrice: 180 },
      { name: 'Men\'s trousers (casual)',  unit: 'pcs', defaultPrice: 400,  costPrice: 200 },
      { name: 'Men\'s trousers (formal)',  unit: 'pcs', defaultPrice: 600,  costPrice: 300 },
      { name: 'Men\'s jeans',              unit: 'pcs', defaultPrice: 500,  costPrice: 250 },
      { name: 'Men\'s suit (2-piece)',     unit: 'pcs', defaultPrice: 2500, costPrice: 1200},
      { name: 'Men\'s jacket',             unit: 'pcs', defaultPrice: 800,  costPrice: 400 },
      { name: 'Men\'s shorts',             unit: 'pcs', defaultPrice: 200,  costPrice: 100 },
      // Women's
      { name: 'Women\'s blouse',           unit: 'pcs', defaultPrice: 300,  costPrice: 150 },
      { name: 'Women\'s dress (casual)',   unit: 'pcs', defaultPrice: 500,  costPrice: 250 },
      { name: 'Women\'s dress (formal)',   unit: 'pcs', defaultPrice: 900,  costPrice: 450 },
      { name: 'Women\'s jeans',            unit: 'pcs', defaultPrice: 500,  costPrice: 250 },
      { name: 'Women\'s skirt',            unit: 'pcs', defaultPrice: 350,  costPrice: 175 },
      { name: 'Women\'s leggings',         unit: 'pcs', defaultPrice: 200,  costPrice: 100 },
      { name: 'Women\'s jacket',           unit: 'pcs', defaultPrice: 700,  costPrice: 350 },
      // Traditional
      { name: 'Habesha kemis (simple)',    unit: 'pcs', defaultPrice: 500,  costPrice: 250 },
      { name: 'Habesha kemis (embroidered)',unit:'pcs', defaultPrice: 1500, costPrice: 750 },
      { name: 'Netela / gabi',             unit: 'pcs', defaultPrice: 300,  costPrice: 150 },
      // Children's
      { name: 'Children\'s T-shirt',       unit: 'pcs', defaultPrice: 150,  costPrice: 75  },
      { name: 'Children\'s set (top+pant)',unit: 'pcs', defaultPrice: 300,  costPrice: 150 },
      { name: 'School uniform shirt',      unit: 'pcs', defaultPrice: 200,  costPrice: 100 },
      { name: 'School uniform trousers',   unit: 'pcs', defaultPrice: 200,  costPrice: 100 },
      // Shoes
      { name: 'Men\'s shoes (casual)',     unit: 'pair',defaultPrice: 800,  costPrice: 400 },
      { name: 'Men\'s shoes (formal)',     unit: 'pair',defaultPrice: 1200, costPrice: 600 },
      { name: 'Women\'s shoes (flats)',    unit: 'pair',defaultPrice: 600,  costPrice: 300 },
      { name: 'Women\'s heels',            unit: 'pair',defaultPrice: 900,  costPrice: 450 },
      { name: 'Sandals',                   unit: 'pair',defaultPrice: 300,  costPrice: 150 },
      { name: 'Children\'s shoes',         unit: 'pair',defaultPrice: 400,  costPrice: 200 },
      // Accessories
      { name: 'Belt',                      unit: 'pcs', defaultPrice: 200,  costPrice: 100 },
      { name: 'Scarf / shawl',             unit: 'pcs', defaultPrice: 150,  costPrice: 75  },
      { name: 'Socks (pair)',              unit: 'pair',defaultPrice: 50,   costPrice: 25  },
      { name: 'Handbag',                   unit: 'pcs', defaultPrice: 500,  costPrice: 250 },
    ],
    starterExpenses: [
      { title: 'Shop rent',              category: 'rent'         },
      { title: 'Electricity bill',       category: 'utilities'    },
      { title: 'Staff salary',           category: 'salaries'     },
      { title: 'Stock purchase',         category: 'supplies'     },
      { title: 'Display & hangers',      category: 'supplies'     },
      { title: 'Packaging bags',         category: 'packaging'    },
      { title: 'Transport',              category: 'transport'    },
      { title: 'Marketing / ads',        category: 'marketing'    },
      { title: 'Bank charges',           category: 'bank_charges' },
    ],
  },

  // ── Hardware & Building Materials ───────────────────────────────────────
  {
    subtype:     'retail_hardware',
    parentType:  'retail',
    icon:        HardHat,
    label:       'Hardware & Building Materials',
    description: 'Tools, paint, pipes, nails, cement & construction supplies',
    starterProducts: [
      // Cement & masonry
      { name: 'Cement (50kg bag)',         unit: 'bag', defaultPrice: 450,  costPrice: 360 },
      { name: 'Sand (per quintal)',         unit: 'qtl', defaultPrice: 200,  costPrice: 150 },
      { name: 'Gravel (per quintal)',       unit: 'qtl', defaultPrice: 180,  costPrice: 130 },
      { name: 'Hollow block (each)',        unit: 'pcs', defaultPrice: 20,   costPrice: 14  },
      { name: 'Red brick (each)',           unit: 'pcs', defaultPrice: 5,    costPrice: 3   },
      // Steel & metal
      { name: 'Iron rod 8mm (12m)',         unit: 'pcs', defaultPrice: 350,  costPrice: 270 },
      { name: 'Iron rod 10mm (12m)',        unit: 'pcs', defaultPrice: 500,  costPrice: 390 },
      { name: 'Corrugated iron sheet 2m',  unit: 'pcs', defaultPrice: 300,  costPrice: 230 },
      { name: 'Corrugated iron sheet 3m',  unit: 'pcs', defaultPrice: 450,  costPrice: 350 },
      // Wood & board
      { name: 'Plywood 4×8 (12mm)',        unit: 'pcs', defaultPrice: 500,  costPrice: 380 },
      { name: 'Timber (2×4, per metre)',    unit: 'm',   defaultPrice: 80,   costPrice: 55  },
      // Paint
      { name: 'Wall paint 4L (white)',      unit: 'can', defaultPrice: 500,  costPrice: 380 },
      { name: 'Wall paint 4L (colour)',     unit: 'can', defaultPrice: 550,  costPrice: 420 },
      { name: 'Oil paint 1L',               unit: 'can', defaultPrice: 200,  costPrice: 150 },
      { name: 'Paint brush (medium)',       unit: 'pcs', defaultPrice: 50,   costPrice: 32  },
      { name: 'Paint roller',               unit: 'pcs', defaultPrice: 80,   costPrice: 52  },
      // Plumbing
      { name: 'PVC pipe 1/2" (3m)',         unit: 'pcs', defaultPrice: 80,   costPrice: 55  },
      { name: 'PVC pipe 1" (3m)',           unit: 'pcs', defaultPrice: 120,  costPrice: 85  },
      { name: 'Pipe elbow 1/2"',            unit: 'pcs', defaultPrice: 15,   costPrice: 9   },
      { name: 'Tap / faucet',               unit: 'pcs', defaultPrice: 150,  costPrice: 100 },
      // Electrical
      { name: 'Electric cable (per metre)', unit: 'm',   defaultPrice: 25,   costPrice: 17  },
      { name: 'Switch (single)',            unit: 'pcs', defaultPrice: 50,   costPrice: 32  },
      { name: 'Socket outlet',              unit: 'pcs', defaultPrice: 60,   costPrice: 40  },
      { name: 'Circuit breaker',            unit: 'pcs', defaultPrice: 150,  costPrice: 100 },
      { name: 'LED bulb (9W)',              unit: 'pcs', defaultPrice: 80,   costPrice: 52  },
      // Fasteners & tools
      { name: 'Nails (500g)',               unit: 'pcs', defaultPrice: 60,   costPrice: 42  },
      { name: 'Screws (box 100pcs)',        unit: 'box', defaultPrice: 80,   costPrice: 55  },
      { name: 'Hammer',                     unit: 'pcs', defaultPrice: 150,  costPrice: 100 },
      { name: 'Hand saw',                   unit: 'pcs', defaultPrice: 200,  costPrice: 130 },
      { name: 'Measuring tape 5m',          unit: 'pcs', defaultPrice: 100,  costPrice: 65  },
      { name: 'Padlock (medium)',            unit: 'pcs', defaultPrice: 120,  costPrice: 80  },
    ],
    starterExpenses: [
      { title: 'Shop / yard rent',       category: 'rent'         },
      { title: 'Electricity bill',       category: 'utilities'    },
      { title: 'Staff salary',           category: 'salaries'     },
      { title: 'Stock purchase',         category: 'supplies'     },
      { title: 'Transport / delivery',   category: 'transport'    },
      { title: 'Shop maintenance',       category: 'maintenance'  },
      { title: 'Marketing',              category: 'marketing'    },
      { title: 'Bank charges',           category: 'bank_charges' },
    ],
  },

  // ── General Merchandise ─────────────────────────────────────────────────
  {
    subtype:     'retail_general',
    parentType:  'retail',
    icon:        LayoutGrid,
    label:       'General Merchandise',
    description: 'Mixed goods — doesn\'t fit a single category',
    starterProducts: [
      { name: 'Water 500ml',      unit: 'pcs',  defaultPrice: 15,  costPrice: 10  },
      { name: 'Soft Drink 330ml', unit: 'pcs',  defaultPrice: 25,  costPrice: 18  },
      { name: 'Notebook A4',      unit: 'pcs',  defaultPrice: 55,  costPrice: 35  },
      { name: 'Pen (blue)',        unit: 'pcs',  defaultPrice: 5,   costPrice: 3   },
      { name: 'Sugar 1kg',         unit: 'kg',   defaultPrice: 70,  costPrice: 55  },
      { name: 'Vegetable oil 1L',  unit: 'L',    defaultPrice: 120, costPrice: 95  },
      { name: 'Soap bar',          unit: 'pcs',  defaultPrice: 25,  costPrice: 17  },
      { name: 'Tissue box',        unit: 'pcs',  defaultPrice: 45,  costPrice: 32  },
      { name: 'Candle',            unit: 'pcs',  defaultPrice: 10,  costPrice: 6   },
      { name: 'Battery AA (pair)', unit: 'pair', defaultPrice: 30,  costPrice: 20  },
    ],
    starterExpenses: [
      { title: 'Shop rent',             category: 'rent'         },
      { title: 'Electricity bill',      category: 'utilities'    },
      { title: 'Staff salary',          category: 'salaries'     },
      { title: 'Stock purchase',        category: 'supplies'     },
      { title: 'Transport / delivery',  category: 'transport'    },
      { title: 'Packaging',             category: 'packaging'    },
      { title: 'Marketing',             category: 'marketing'    },
      { title: 'Bank charges',          category: 'bank_charges' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// FAST FOOD SUB-TYPES
// ─────────────────────────────────────────────────────────────────────────────

const FASTFOOD_SUBTYPES: SubtypeConfig[] = [

  // ── Ethiopian Traditional ───────────────────────────────────────────────
  {
    subtype:     'fastfood_ethiopian',
    parentType:  'fastfood',
    icon:        Wheat,
    label:       'Ethiopian Traditional',
    description: 'Injera, wot, tibs, fasting dishes & local staples',
    starterProducts: [
      { name: 'Injera (single)',          unit: 'pcs',   defaultPrice: 10,  costPrice: 4   },
      { name: 'Injera (plate of 5)',      unit: 'plate', defaultPrice: 45,  costPrice: 18  },
      { name: 'Beyaynetu (fasting)',      unit: 'plate', defaultPrice: 120, costPrice: 45  },
      { name: 'Shiro wot (small)',        unit: 'plate', defaultPrice: 80,  costPrice: 28  },
      { name: 'Shiro wot (large)',        unit: 'plate', defaultPrice: 130, costPrice: 45  },
      { name: 'Misir wot',                unit: 'plate', defaultPrice: 80,  costPrice: 28  },
      { name: 'Ater kik alicha',          unit: 'plate', defaultPrice: 80,  costPrice: 28  },
      { name: 'Gomen (collard greens)',   unit: 'plate', defaultPrice: 70,  costPrice: 24  },
      { name: 'Tibs (small)',             unit: 'plate', defaultPrice: 180, costPrice: 80  },
      { name: 'Tibs (large)',             unit: 'plate', defaultPrice: 280, costPrice: 120 },
      { name: 'Kitfo (medium)',           unit: 'plate', defaultPrice: 200, costPrice: 90  },
      { name: 'Kitfo (full)',             unit: 'plate', defaultPrice: 320, costPrice: 140 },
      { name: 'Kategna',                  unit: 'plate', defaultPrice: 60,  costPrice: 20  },
      { name: 'Firfir (injera firfir)',   unit: 'plate', defaultPrice: 90,  costPrice: 32  },
      { name: 'Fit-fit',                  unit: 'plate', defaultPrice: 70,  costPrice: 25  },
      { name: 'Gored gored',              unit: 'plate', defaultPrice: 220, costPrice: 95  },
      { name: 'Dulet',                    unit: 'plate', defaultPrice: 180, costPrice: 75  },
      { name: 'Genfo (porridge)',          unit: 'bowl',  defaultPrice: 50,  costPrice: 18  },
      { name: 'Kinche',                   unit: 'bowl',  defaultPrice: 50,  costPrice: 18  },
      { name: 'Soft Drink',               unit: 'pcs',   defaultPrice: 25,  costPrice: 17  },
      { name: 'Fresh juice',              unit: 'glass', defaultPrice: 50,  costPrice: 20  },
      { name: 'Water bottle',             unit: 'pcs',   defaultPrice: 20,  costPrice: 12  },
    ],
    starterExpenses: [
      { title: 'Restaurant rent',         category: 'rent'             },
      { title: 'Electricity bill',        category: 'utilities'        },
      { title: 'Water bill',              category: 'utilities'        },
      { title: 'Teff / injera',           category: 'food_ingredients' },
      { title: 'Meat purchase',           category: 'food_ingredients' },
      { title: 'Vegetables & legumes',    category: 'food_ingredients' },
      { title: 'Spices (berbere, shiro)', category: 'food_ingredients' },
      { title: 'Cooking oil',             category: 'food_ingredients' },
      { title: 'Staff salary',            category: 'salaries'         },
      { title: 'Packaging & takeaway',    category: 'packaging'        },
      { title: 'Kitchen maintenance',     category: 'maintenance'      },
      { title: 'Marketing',               category: 'marketing'        },
      { title: 'Bank charges',            category: 'bank_charges'     },
    ],
  },

  // ── Grill & Chicken ─────────────────────────────────────────────────────
  // ── Shawarma & Ertib ────────────────────────────────────────────────────
  {
    subtype:     'fastfood_shawarma',
    parentType:  'fastfood',
    icon:        Flame,
    label:       'Shawarma & Ertib',
    description: 'Egg, bread, avocado, potato & meat wraps',
    starterProducts: [
      // Shawarma
      { name: 'Chicken shawarma (small)',   unit: 'pcs',   defaultPrice: 80,  costPrice: 32  },
      { name: 'Chicken shawarma (large)',   unit: 'pcs',   defaultPrice: 130, costPrice: 55  },
      { name: 'Beef shawarma (small)',      unit: 'pcs',   defaultPrice: 90,  costPrice: 38  },
      { name: 'Beef shawarma (large)',      unit: 'pcs',   defaultPrice: 150, costPrice: 65  },
      { name: 'Mixed shawarma',             unit: 'pcs',   defaultPrice: 160, costPrice: 70  },
      // Ertib
      { name: 'Ertib (small)',              unit: 'pcs',   defaultPrice: 80,  costPrice: 30  },
      { name: 'Ertib (large)',              unit: 'pcs',   defaultPrice: 130, costPrice: 52  },
      { name: 'Ertib with egg',             unit: 'pcs',   defaultPrice: 100, costPrice: 40  },
      { name: 'Ertib with avocado',         unit: 'pcs',   defaultPrice: 120, costPrice: 48  },
      { name: 'Ertib special (full)',       unit: 'pcs',   defaultPrice: 160, costPrice: 65  },
      // Eggs
      { name: 'Fried egg (2 pcs)',          unit: 'pcs',   defaultPrice: 40,  costPrice: 15  },
      { name: 'Scrambled egg',              unit: 'pcs',   defaultPrice: 50,  costPrice: 18  },
      { name: 'Omelette',                   unit: 'pcs',   defaultPrice: 60,  costPrice: 22  },
      // Bread & sides
      { name: 'Bread roll',                 unit: 'pcs',   defaultPrice: 10,  costPrice: 4   },
      { name: 'Toast (2 slices)',           unit: 'pcs',   defaultPrice: 20,  costPrice: 7   },
      { name: 'Avocado (side)',             unit: 'pcs',   defaultPrice: 30,  costPrice: 12  },
      { name: 'Potato (boiled / fried)',    unit: 'pcs',   defaultPrice: 40,  costPrice: 15  },
      { name: 'French Fries',               unit: 'pcs',   defaultPrice: 60,  costPrice: 22  },
      { name: 'Salad (side)',               unit: 'pcs',   defaultPrice: 40,  costPrice: 15  },
      // Drinks
      { name: 'Fresh juice',               unit: 'glass', defaultPrice: 55,  costPrice: 22  },
      { name: 'Soft Drink',                unit: 'pcs',   defaultPrice: 25,  costPrice: 17  },
      { name: 'Tea',                        unit: 'cup',   defaultPrice: 15,  costPrice: 3   },
      { name: 'Water bottle',              unit: 'pcs',   defaultPrice: 20,  costPrice: 12  },
    ],
    starterExpenses: [
      { title: 'Shop / stall rent',        category: 'rent'             },
      { title: 'Electricity bill',         category: 'utilities'        },
      { title: 'Water bill',               category: 'utilities'        },
      { title: 'Eggs',                     category: 'food_ingredients' },
      { title: 'Bread & buns',             category: 'food_ingredients' },
      { title: 'Avocado',                  category: 'food_ingredients' },
      { title: 'Potatoes',                 category: 'food_ingredients' },
      { title: 'Meat / chicken',           category: 'food_ingredients' },
      { title: 'Vegetables & sauces',      category: 'food_ingredients' },
      { title: 'Cooking oil',              category: 'food_ingredients' },
      { title: 'Staff salary',             category: 'salaries'         },
      { title: 'Packaging & wrapping',     category: 'packaging'        },
      { title: 'Equipment maintenance',    category: 'maintenance'      },
      { title: 'Marketing',                category: 'marketing'        },
      { title: 'Bank charges',             category: 'bank_charges'     },
    ],
  },

  // ── Burger, Pizza & Sandwiches ─────────────────────────────────────────
  {
    subtype:     'fastfood_burgerandpizza',
    parentType:  'fastfood',
    icon:        Sandwich,
    label:       'Burger, Pizza & Sandwiches',
    description: 'Burgers, pizza, sandwiches, wraps, pasta & fast-food meals',
    starterProducts: [
      // Burgers
      { name: 'Beef burger (single)',       unit: 'pcs',   defaultPrice: 150, costPrice: 65  },
      { name: 'Beef burger (double)',       unit: 'pcs',   defaultPrice: 220, costPrice: 95  },
      { name: 'Chicken burger',             unit: 'pcs',   defaultPrice: 150, costPrice: 60  },
      { name: 'Veggie burger',              unit: 'pcs',   defaultPrice: 120, costPrice: 48  },
      // Sandwiches & wraps
      { name: 'Club sandwich',              unit: 'pcs',   defaultPrice: 120, costPrice: 50  },
      { name: 'Chicken sandwich',           unit: 'pcs',   defaultPrice: 110, costPrice: 45  },
      { name: 'Egg sandwich',               unit: 'pcs',   defaultPrice: 60,  costPrice: 22  },
      { name: 'Tuna sandwich',              unit: 'pcs',   defaultPrice: 100, costPrice: 42  },
      { name: 'Wrap (chicken)',             unit: 'pcs',   defaultPrice: 130, costPrice: 55  },
      { name: 'Hot dog',                    unit: 'pcs',   defaultPrice: 80,  costPrice: 32  },
      // Pizza
      { name: 'Pizza (margherita, 8")',     unit: 'pcs',   defaultPrice: 200, costPrice: 80  },
      { name: 'Pizza (margherita, 12")',    unit: 'pcs',   defaultPrice: 350, costPrice: 140 },
      { name: 'Pizza (chicken, 8")',        unit: 'pcs',   defaultPrice: 250, costPrice: 100 },
      { name: 'Pizza (chicken, 12")',       unit: 'pcs',   defaultPrice: 420, costPrice: 170 },
      { name: 'Pizza (mixed veg, 12")',     unit: 'pcs',   defaultPrice: 380, costPrice: 150 },
      { name: 'Pizza slice',                unit: 'pcs',   defaultPrice: 80,  costPrice: 32  },
      // Pasta
      { name: 'Pasta (small)',              unit: 'plate', defaultPrice: 80,  costPrice: 28  },
      { name: 'Pasta (large)',              unit: 'plate', defaultPrice: 130, costPrice: 48  },
      { name: 'Pasta bolognese',            unit: 'plate', defaultPrice: 150, costPrice: 55  },
      { name: 'Mac & cheese',               unit: 'plate', defaultPrice: 100, costPrice: 38  },
      { name: 'Lasagne',                    unit: 'plate', defaultPrice: 180, costPrice: 70  },
      // Sides
      { name: 'French Fries (small)',       unit: 'pcs',   defaultPrice: 50,  costPrice: 18  },
      { name: 'French Fries (large)',       unit: 'pcs',   defaultPrice: 80,  costPrice: 28  },
      { name: 'Onion rings',                unit: 'pcs',   defaultPrice: 60,  costPrice: 22  },
      { name: 'Coleslaw',                   unit: 'pcs',   defaultPrice: 40,  costPrice: 15  },
      { name: 'Garlic bread',               unit: 'pcs',   defaultPrice: 50,  costPrice: 18  },
      // Drinks
      { name: 'Soft Drink',                unit: 'pcs',   defaultPrice: 25,  costPrice: 17  },
      { name: 'Milkshake',                 unit: 'glass', defaultPrice: 80,  costPrice: 35  },
      { name: 'Fresh juice',               unit: 'glass', defaultPrice: 65,  costPrice: 25  },
      { name: 'Water bottle',              unit: 'pcs',   defaultPrice: 20,  costPrice: 12  },
    ],
    starterExpenses: [
      { title: 'Restaurant rent',         category: 'rent'             },
      { title: 'Electricity bill',        category: 'utilities'        },
      { title: 'Water bill',              category: 'utilities'        },
      { title: 'Meat / chicken',          category: 'food_ingredients' },
      { title: 'Bread, buns & flour',     category: 'food_ingredients' },
      { title: 'Tomato sauce & cheese',   category: 'food_ingredients' },
      { title: 'Vegetables & sauces',     category: 'food_ingredients' },
      { title: 'Potatoes (fries)',        category: 'food_ingredients' },
      { title: 'Cooking oil',             category: 'food_ingredients' },
      { title: 'Staff salary',            category: 'salaries'         },
      { title: 'Packaging & boxes',       category: 'packaging'        },
      { title: 'Kitchen maintenance',     category: 'maintenance'      },
      { title: 'Marketing',               category: 'marketing'        },
      { title: 'Bank charges',            category: 'bank_charges'     },
    ],
  },

  // ── Juice House ─────────────────────────────────────────────────────────
  {
    subtype:     'fastfood_juice',
    parentType:  'fastfood',
    icon:        ChefHat,
    label:       'Juice House',
    description: 'Fresh juices, smoothies, avocado, mixed fruit & cold drinks',
    starterProducts: [
      // Single fruit juices
      { name: 'Orange juice (small)',       unit: 'glass', defaultPrice: 55,  costPrice: 22  },
      { name: 'Orange juice (large)',       unit: 'glass', defaultPrice: 80,  costPrice: 32  },
      { name: 'Mango juice (small)',        unit: 'glass', defaultPrice: 55,  costPrice: 22  },
      { name: 'Mango juice (large)',        unit: 'glass', defaultPrice: 80,  costPrice: 32  },
      { name: 'Avocado juice (small)',      unit: 'glass', defaultPrice: 65,  costPrice: 28  },
      { name: 'Avocado juice (large)',      unit: 'glass', defaultPrice: 95,  costPrice: 42  },
      { name: 'Papaya juice',               unit: 'glass', defaultPrice: 55,  costPrice: 22  },
      { name: 'Guava juice',                unit: 'glass', defaultPrice: 55,  costPrice: 22  },
      { name: 'Watermelon juice',           unit: 'glass', defaultPrice: 50,  costPrice: 18  },
      { name: 'Pineapple juice',            unit: 'glass', defaultPrice: 60,  costPrice: 25  },
      { name: 'Banana juice',               unit: 'glass', defaultPrice: 55,  costPrice: 22  },
      { name: 'Lemon juice',                unit: 'glass', defaultPrice: 45,  costPrice: 15  },
      { name: 'Beetroot juice',             unit: 'glass', defaultPrice: 55,  costPrice: 22  },
      { name: 'Carrot juice',               unit: 'glass', defaultPrice: 55,  costPrice: 22  },
      // Mixed / blended
      { name: 'Mixed fruit juice (small)',  unit: 'glass', defaultPrice: 65,  costPrice: 28  },
      { name: 'Mixed fruit juice (large)',  unit: 'glass', defaultPrice: 95,  costPrice: 42  },
      { name: 'Smoothie (berry)',           unit: 'glass', defaultPrice: 90,  costPrice: 40  },
      { name: 'Smoothie (tropical)',        unit: 'glass', defaultPrice: 90,  costPrice: 40  },
      { name: 'Smoothie (green / detox)',   unit: 'glass', defaultPrice: 100, costPrice: 45  },
      { name: 'Avocado + banana blend',     unit: 'glass', defaultPrice: 80,  costPrice: 36  },
      { name: 'Layered fruit salad',        unit: 'glass', defaultPrice: 70,  costPrice: 30  },
      // Other drinks
      { name: 'Soft drink',                 unit: 'pcs',   defaultPrice: 25,  costPrice: 17  },
      { name: 'Water bottle',               unit: 'pcs',   defaultPrice: 15,  costPrice: 10  },
      { name: 'Yoghurt drink (ayib)',       unit: 'glass', defaultPrice: 45,  costPrice: 18  },
      // Light snacks
      { name: 'Fruit salad (bowl)',         unit: 'bowl',  defaultPrice: 80,  costPrice: 35  },
      { name: 'Kolo',                       unit: 'pcs',   defaultPrice: 15,  costPrice: 6   },
      { name: 'Cake slice',                 unit: 'pcs',   defaultPrice: 60,  costPrice: 25  },
    ],
    starterExpenses: [
      { title: 'Shop rent',                 category: 'rent'             },
      { title: 'Electricity bill',          category: 'utilities'        },
      { title: 'Water bill',                category: 'utilities'        },
      { title: 'Fresh fruits purchase',     category: 'food_ingredients' },
      { title: 'Avocado',                   category: 'food_ingredients' },
      { title: 'Sugar & milk',              category: 'food_ingredients' },
      { title: 'Cups & straws',             category: 'packaging'        },
      { title: 'Staff salary',              category: 'salaries'         },
      { title: 'Blender / machine maintenance', category: 'maintenance'  },
      { title: 'Refrigerator maintenance',  category: 'maintenance'      },
      { title: 'Marketing / signage',       category: 'marketing'        },
      { title: 'Bank charges',              category: 'bank_charges'     },
    ],
  },

  // ── Breakfast Spot ──────────────────────────────────────────────────────
  {
    subtype:     'fastfood_breakfast',
    parentType:  'fastfood',
    icon:        Sunrise,
    label:       'Breakfast Spot',
    description: 'Eggs, full breakfast, firfir, fit-fit & morning meals',
    starterProducts: [
      { name: 'Firfir (injera firfir)',   unit: 'plate', defaultPrice: 90,  costPrice: 32  },
      { name: 'Fit-fit',                  unit: 'plate', defaultPrice: 70,  costPrice: 25  },
      { name: 'Genfo',                    unit: 'bowl',  defaultPrice: 50,  costPrice: 18  },
      { name: 'Kinche',                   unit: 'bowl',  defaultPrice: 50,  costPrice: 18  },
      { name: 'Kategna',                  unit: 'plate', defaultPrice: 60,  costPrice: 20  },
      { name: 'Eggs (fried, 2 pcs)',      unit: 'plate', defaultPrice: 50,  costPrice: 18  },
      { name: 'Eggs (scrambled)',         unit: 'plate', defaultPrice: 60,  costPrice: 20  },
      { name: 'Omelette (plain)',         unit: 'plate', defaultPrice: 70,  costPrice: 24  },
      { name: 'Omelette (mixed)',         unit: 'plate', defaultPrice: 90,  costPrice: 30  },
      { name: 'Full breakfast',           unit: 'plate', defaultPrice: 120, costPrice: 48  },
      { name: 'Avocado toast',            unit: 'plate', defaultPrice: 80,  costPrice: 30  },
      { name: 'Pancakes (3 pcs)',         unit: 'plate', defaultPrice: 80,  costPrice: 28  },
      { name: 'French toast',             unit: 'plate', defaultPrice: 70,  costPrice: 25  },
      { name: 'Bread roll (side)',        unit: 'pcs',   defaultPrice: 10,  costPrice: 4   },
      { name: 'Yoghurt',                  unit: 'pcs',   defaultPrice: 50,  costPrice: 20  },
      { name: 'Fresh fruit bowl',         unit: 'pcs',   defaultPrice: 80,  costPrice: 35  },
      { name: 'Macchiato',                unit: 'cup',   defaultPrice: 25,  costPrice: 8   },
      { name: 'Tea',                      unit: 'cup',   defaultPrice: 15,  costPrice: 3   },
      { name: 'Fresh juice',              unit: 'glass', defaultPrice: 55,  costPrice: 22  },
      { name: 'Water bottle',             unit: 'pcs',   defaultPrice: 20,  costPrice: 12  },
    ],
    starterExpenses: [
      { title: 'Restaurant rent',         category: 'rent'             },
      { title: 'Electricity bill',        category: 'utilities'        },
      { title: 'Water bill',              category: 'utilities'        },
      { title: 'Eggs',                    category: 'food_ingredients' },
      { title: 'Teff / injera',           category: 'food_ingredients' },
      { title: 'Bread & flour',           category: 'food_ingredients' },
      { title: 'Fruits & vegetables',     category: 'food_ingredients' },
      { title: 'Butter & dairy',          category: 'food_ingredients' },
      { title: 'Staff salary',            category: 'salaries'         },
      { title: 'Packaging',               category: 'packaging'        },
      { title: 'Kitchen maintenance',     category: 'maintenance'      },
      { title: 'Marketing',               category: 'marketing'        },
      { title: 'Bank charges',            category: 'bank_charges'     },
    ],
  },

  // ── General Restaurant ──────────────────────────────────────────────────
  {
    subtype:     'fastfood_general',
    parentType:  'fastfood',
    icon:        LayoutGrid,
    label:       'General Restaurant',
    description: 'Mixed menu — doesn\'t fit a single style',
    starterProducts: [
      { name: 'Injera (plate)',           unit: 'plate', defaultPrice: 80,  costPrice: 30  },
      { name: 'Tibs',                     unit: 'plate', defaultPrice: 180, costPrice: 80  },
      { name: 'Shiro',                    unit: 'plate', defaultPrice: 80,  costPrice: 28  },
      { name: 'Chicken (quarter)',        unit: 'plate', defaultPrice: 180, costPrice: 80  },
      { name: 'Burger',                   unit: 'pcs',   defaultPrice: 150, costPrice: 65  },
      { name: 'Pasta (small)',            unit: 'plate', defaultPrice: 80,  costPrice: 28  },
      { name: 'French Fries',             unit: 'pcs',   defaultPrice: 60,  costPrice: 22  },
      { name: 'Salad',                    unit: 'pcs',   defaultPrice: 60,  costPrice: 22  },
      { name: 'Soft Drink',              unit: 'pcs',   defaultPrice: 25,  costPrice: 17  },
      { name: 'Fresh juice',             unit: 'glass', defaultPrice: 65,  costPrice: 25  },
      { name: 'Water bottle',            unit: 'pcs',   defaultPrice: 20,  costPrice: 12  },
    ],
    starterExpenses: [
      { title: 'Restaurant rent',        category: 'rent'             },
      { title: 'Electricity bill',       category: 'utilities'        },
      { title: 'Water bill',             category: 'utilities'        },
      { title: 'Food ingredients',       category: 'food_ingredients' },
      { title: 'Cooking oil & spices',   category: 'food_ingredients' },
      { title: 'Staff salary',           category: 'salaries'         },
      { title: 'Packaging & takeaway',   category: 'packaging'        },
      { title: 'Kitchen maintenance',    category: 'maintenance'      },
      { title: 'Marketing',              category: 'marketing'        },
      { title: 'Bank charges',           category: 'bank_charges'     },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE SUB-TYPES
// ─────────────────────────────────────────────────────────────────────────────

const SERVICE_SUBTYPES: SubtypeConfig[] = [
  {
    subtype:     'service_repairs',
    parentType:  'service',
    icon:        Wrench,
    label:       'Repairs & Electronics',
    description: 'Phone, laptop, TV, electrical & plumbing repairs',
    starterProducts: [
      { name: 'Phone screen repair',         unit: 'job',  defaultPrice: 500,  costPrice: 180 },
      { name: 'Phone battery replacement',   unit: 'job',  defaultPrice: 300,  costPrice: 130 },
      { name: 'Phone charging port repair',  unit: 'job',  defaultPrice: 250,  costPrice: 80  },
      { name: 'Phone speaker / mic repair',  unit: 'job',  defaultPrice: 200,  costPrice: 70  },
      { name: 'Phone water damage repair',   unit: 'job',  defaultPrice: 600,  costPrice: 150 },
      { name: 'Laptop screen replacement',   unit: 'job',  defaultPrice: 1500, costPrice: 600 },
      { name: 'Laptop keyboard replacement', unit: 'job',  defaultPrice: 800,  costPrice: 300 },
      { name: 'Laptop battery replacement',  unit: 'job',  defaultPrice: 700,  costPrice: 280 },
      { name: 'Laptop repair (basic)',        unit: 'job',  defaultPrice: 500,  costPrice: 100 },
      { name: 'Laptop repair (full)',         unit: 'job',  defaultPrice: 1200, costPrice: 300 },
      { name: 'TV repair (basic)',            unit: 'job',  defaultPrice: 500,  costPrice: 100 },
      { name: 'TV repair (full)',             unit: 'job',  defaultPrice: 1000, costPrice: 250 },
      { name: 'Refrigerator repair',         unit: 'job',  defaultPrice: 800,  costPrice: 200 },
      { name: 'Washing machine repair',      unit: 'job',  defaultPrice: 700,  costPrice: 180 },
      { name: 'Electric iron repair',        unit: 'job',  defaultPrice: 150,  costPrice: 40  },
      { name: 'Electrical wiring (room)',    unit: 'room', defaultPrice: 800,  costPrice: 200 },
      { name: 'Electrical wiring (house)',   unit: 'job',  defaultPrice: 5000, costPrice: 1500},
      { name: 'Switch / socket install',     unit: 'job',  defaultPrice: 150,  costPrice: 40  },
      { name: 'Plumbing repair',             unit: 'job',  defaultPrice: 500,  costPrice: 100 },
      { name: 'Pipe installation',           unit: 'job',  defaultPrice: 1000, costPrice: 300 },
      { name: 'Welding (small)',             unit: 'job',  defaultPrice: 300,  costPrice: 80  },
      { name: 'Welding (large)',             unit: 'job',  defaultPrice: 1200, costPrice: 350 },
    ],
    starterExpenses: [
      { title: 'Workshop rent',             category: 'rent'         },
      { title: 'Electricity bill',          category: 'utilities'    },
      { title: 'Staff salary',              category: 'salaries'     },
      { title: 'Spare parts & components',  category: 'supplies'     },
      { title: 'Tools & equipment',         category: 'equipment'    },
      { title: 'Tool maintenance / repair', category: 'maintenance'  },
      { title: 'Transport',                 category: 'transport'    },
      { title: 'Marketing / flyers',        category: 'marketing'    },
      { title: 'Bank charges',              category: 'bank_charges' },
    ],
  },
  {
    subtype:     'service_creative',
    parentType:  'service',
    icon:        PenTool,
    label:       'Creative, Design & Marketing',
    description: 'Graphic design, branding, photography, video & digital marketing',
    starterProducts: [
      { name: 'Logo design',                    unit: 'job',     defaultPrice: 2000,  costPrice: 0   },
      { name: 'Brand identity package',         unit: 'job',     defaultPrice: 8000,  costPrice: 0   },
      { name: 'Business card design',           unit: 'job',     defaultPrice: 500,   costPrice: 0   },
      { name: 'Flyer / poster design',          unit: 'job',     defaultPrice: 500,   costPrice: 0   },
      { name: 'Banner design',                  unit: 'job',     defaultPrice: 800,   costPrice: 0   },
      { name: 'Social media post design',       unit: 'post',    defaultPrice: 200,   costPrice: 0   },
      { name: 'Social media package (monthly)', unit: 'month',   defaultPrice: 3000,  costPrice: 0   },
      { name: 'UI / UX design (per screen)',    unit: 'screen',  defaultPrice: 1500,  costPrice: 0   },
      { name: 'Website design',                 unit: 'job',     defaultPrice: 15000, costPrice: 0   },
      { name: 'Packaging design',               unit: 'job',     defaultPrice: 2500,  costPrice: 0   },
      { name: 'Product photography (half day)', unit: 'session', defaultPrice: 2000,  costPrice: 200 },
      { name: 'Product photography (full day)', unit: 'session', defaultPrice: 3500,  costPrice: 300 },
      { name: 'Event photography',              unit: 'session', defaultPrice: 3000,  costPrice: 200 },
      { name: 'Portrait / headshot session',    unit: 'session', defaultPrice: 1500,  costPrice: 100 },
      { name: 'Wedding photography',            unit: 'job',     defaultPrice: 15000, costPrice: 500 },
      { name: 'Video production (short)',       unit: 'job',     defaultPrice: 5000,  costPrice: 500 },
      { name: 'Video production (full)',        unit: 'job',     defaultPrice: 15000, costPrice: 1500},
      { name: 'Reels / short video',           unit: 'job',     defaultPrice: 1500,  costPrice: 100 },
      { name: 'Video editing',                  unit: 'job',     defaultPrice: 1000,  costPrice: 0   },
      { name: 'Flyer printing (100 pcs)',       unit: 'job',     defaultPrice: 500,   costPrice: 300 },
      { name: 'Banner printing (1m×2m)',        unit: 'pcs',     defaultPrice: 800,   costPrice: 500 },
      { name: 'Business cards (100 pcs)',       unit: 'job',     defaultPrice: 400,   costPrice: 200 },
      { name: 'Digital marketing (monthly)',    unit: 'month',   defaultPrice: 5000,  costPrice: 500 },
    ],
    starterExpenses: [
      { title: 'Office / studio rent',       category: 'rent'         },
      { title: 'Electricity & internet',     category: 'utilities'    },
      { title: 'Staff / freelancer salary',  category: 'salaries'     },
      { title: 'Software subscriptions',     category: 'equipment'    },
      { title: 'Camera & equipment',         category: 'equipment'    },
      { title: 'Printing materials',         category: 'supplies'     },
      { title: 'Transport',                  category: 'transport'    },
      { title: 'Marketing / ads',            category: 'marketing'    },
      { title: 'Bank charges',               category: 'bank_charges' },
    ],
  },
  {
    subtype:     'service_architecture',
    parentType:  'service',
    icon:        DraftingCompass,
    label:       'Architecture & Engineering',
    description: 'Architectural drawings, structural, interior design & surveying',
    starterProducts: [
      { name: 'Architectural drawing (small house)',  unit: 'job',     defaultPrice: 15000, costPrice: 0 },
      { name: 'Architectural drawing (large house)',  unit: 'job',     defaultPrice: 35000, costPrice: 0 },
      { name: 'Architectural drawing (commercial)',   unit: 'job',     defaultPrice: 60000, costPrice: 0 },
      { name: 'Structural design (residential)',      unit: 'job',     defaultPrice: 20000, costPrice: 0 },
      { name: 'Structural design (commercial)',       unit: 'job',     defaultPrice: 50000, costPrice: 0 },
      { name: 'Interior design consultation',         unit: 'session', defaultPrice: 2000,  costPrice: 0 },
      { name: 'Interior design (per room)',            unit: 'room',    defaultPrice: 8000,  costPrice: 0 },
      { name: 'Interior design (full house)',          unit: 'job',     defaultPrice: 40000, costPrice: 0 },
      { name: '3D rendering (exterior)',               unit: 'job',     defaultPrice: 5000,  costPrice: 0 },
      { name: '3D rendering (interior)',               unit: 'job',     defaultPrice: 4000,  costPrice: 0 },
      { name: 'Land surveying',                        unit: 'job',     defaultPrice: 10000, costPrice: 0 },
      { name: 'Quantity surveying / BOQ',              unit: 'job',     defaultPrice: 8000,  costPrice: 0 },
      { name: 'Site supervision (monthly)',            unit: 'month',   defaultPrice: 15000, costPrice: 0 },
      { name: 'Construction consulting (hourly)',      unit: 'hr',      defaultPrice: 1000,  costPrice: 0 },
      { name: 'Permit / approval documentation',      unit: 'job',     defaultPrice: 5000,  costPrice: 0 },
      { name: 'Landscape design',                     unit: 'job',     defaultPrice: 10000, costPrice: 0 },
    ],
    starterExpenses: [
      { title: 'Office rent',                  category: 'rent'         },
      { title: 'Electricity & internet',       category: 'utilities'    },
      { title: 'Staff salary',                 category: 'salaries'     },
      { title: 'Software (AutoCAD, Revit…)',   category: 'equipment'    },
      { title: 'Printing / plotting drawings', category: 'supplies'     },
      { title: 'Transport / site visits',      category: 'transport'    },
      { title: 'Marketing / portfolio',        category: 'marketing'    },
      { title: 'Bank charges',                 category: 'bank_charges' },
    ],
  },
  {
    subtype:     'service_furniture',
    parentType:  'service',
    icon:        Sofa,
    label:       'Furniture & Woodwork',
    description: 'Kitchen cabinets, wardrobes, beds, sofas & custom furniture',
    starterProducts: [
      { name: 'Kitchen cabinet (per linear m)',  unit: 'm',   defaultPrice: 8000,  costPrice: 4500  },
      { name: 'Kitchen cabinet (small set)',     unit: 'job', defaultPrice: 25000, costPrice: 14000 },
      { name: 'Kitchen cabinet (full)',          unit: 'job', defaultPrice: 60000, costPrice: 32000 },
      { name: 'Single bed frame',                unit: 'pcs', defaultPrice: 8000,  costPrice: 4000  },
      { name: 'Double bed frame',                unit: 'pcs', defaultPrice: 12000, costPrice: 6000  },
      { name: 'King bed frame',                  unit: 'pcs', defaultPrice: 18000, costPrice: 9000  },
      { name: 'Wardrobe (2-door)',                unit: 'pcs', defaultPrice: 15000, costPrice: 7500  },
      { name: 'Wardrobe (3-door)',                unit: 'pcs', defaultPrice: 22000, costPrice: 11000 },
      { name: 'Wardrobe (built-in, per m)',       unit: 'm',   defaultPrice: 10000, costPrice: 5500  },
      { name: 'Sofa (2-seater)',                  unit: 'pcs', defaultPrice: 20000, costPrice: 10000 },
      { name: 'Sofa (3-seater)',                  unit: 'pcs', defaultPrice: 30000, costPrice: 15000 },
      { name: 'Sofa set (3+2+1)',                 unit: 'set', defaultPrice: 65000, costPrice: 32000 },
      { name: 'Centre table / coffee table',      unit: 'pcs', defaultPrice: 8000,  costPrice: 4000  },
      { name: 'TV unit / media stand',            unit: 'pcs', defaultPrice: 12000, costPrice: 6000  },
      { name: 'Dining table (4-seater)',          unit: 'pcs', defaultPrice: 15000, costPrice: 7500  },
      { name: 'Dining table (6-seater)',          unit: 'pcs', defaultPrice: 22000, costPrice: 11000 },
      { name: 'Dining chair',                     unit: 'pcs', defaultPrice: 3000,  costPrice: 1500  },
      { name: 'Office desk',                      unit: 'pcs', defaultPrice: 10000, costPrice: 5000  },
      { name: 'Bookshelf',                        unit: 'pcs', defaultPrice: 7000,  costPrice: 3500  },
      { name: 'Dresser / dressing table',         unit: 'pcs', defaultPrice: 10000, costPrice: 5000  },
      { name: 'Furniture repair (basic)',         unit: 'job', defaultPrice: 500,   costPrice: 100   },
      { name: 'Upholstery re-cover (sofa)',       unit: 'job', defaultPrice: 5000,  costPrice: 2500  },
    ],
    starterExpenses: [
      { title: 'Workshop rent',              category: 'rent'         },
      { title: 'Electricity bill',           category: 'utilities'    },
      { title: 'Staff / carpenter salary',   category: 'salaries'     },
      { title: 'Timber / wood purchase',     category: 'supplies'     },
      { title: 'Plywood & MDF boards',       category: 'supplies'     },
      { title: 'Fabric & foam (upholstery)', category: 'supplies'     },
      { title: 'Hardware (screws, hinges…)', category: 'supplies'     },
      { title: 'Paint & varnish',            category: 'supplies'     },
      { title: 'Tools & machinery',          category: 'equipment'    },
      { title: 'Tool & machine maintenance', category: 'maintenance'  },
      { title: 'Transport / delivery',       category: 'transport'    },
      { title: 'Marketing / showroom',       category: 'marketing'    },
      { title: 'Bank charges',               category: 'bank_charges' },
    ],
  },
  {
    subtype:     'service_carwash',
    parentType:  'service',
    icon:        Car,
    label:       'Car Wash & Auto Services',
    description: 'Car wash, vacuuming, polishing & auto detailing',
    starterProducts: [
      { name: 'Exterior wash (small car)',     unit: 'job', defaultPrice: 80,   costPrice: 20   },
      { name: 'Exterior wash (large car)',     unit: 'job', defaultPrice: 120,  costPrice: 30   },
      { name: 'Exterior wash (minibus/truck)', unit: 'job', defaultPrice: 200,  costPrice: 50   },
      { name: 'Interior vacuum (small)',       unit: 'job', defaultPrice: 80,   costPrice: 15   },
      { name: 'Interior vacuum (large)',       unit: 'job', defaultPrice: 120,  costPrice: 20   },
      { name: 'Full wash + vacuum (small)',    unit: 'job', defaultPrice: 150,  costPrice: 35   },
      { name: 'Full wash + vacuum (large)',    unit: 'job', defaultPrice: 220,  costPrice: 50   },
      { name: 'Engine wash',                   unit: 'job', defaultPrice: 150,  costPrice: 30   },
      { name: 'Underbody wash',                unit: 'job', defaultPrice: 100,  costPrice: 25   },
      { name: 'Hand polish (small)',           unit: 'job', defaultPrice: 300,  costPrice: 80   },
      { name: 'Hand polish (large)',           unit: 'job', defaultPrice: 500,  costPrice: 120  },
      { name: 'Full detail (small car)',       unit: 'job', defaultPrice: 500,  costPrice: 100  },
      { name: 'Full detail (large car)',       unit: 'job', defaultPrice: 800,  costPrice: 160  },
      { name: 'Ceramic coating',              unit: 'job', defaultPrice: 5000, costPrice: 1500 },
      { name: 'Dashboard dressing',           unit: 'job', defaultPrice: 100,  costPrice: 20   },
      { name: 'Tyre shine',                   unit: 'job', defaultPrice: 50,   costPrice: 10   },
      { name: 'Wiper blade replacement',      unit: 'job', defaultPrice: 150,  costPrice: 80   },
    ],
    starterExpenses: [
      { title: 'Premises rent',             category: 'rent'         },
      { title: 'Water bill',                category: 'utilities'    },
      { title: 'Electricity bill',          category: 'utilities'    },
      { title: 'Staff salary',              category: 'salaries'     },
      { title: 'Cleaning chemicals',        category: 'supplies'     },
      { title: 'Microfibre towels & mops',  category: 'supplies'     },
      { title: 'Equipment maintenance',     category: 'maintenance'  },
      { title: 'Transport',                 category: 'transport'    },
      { title: 'Marketing / signage',       category: 'marketing'    },
      { title: 'Bank charges',              category: 'bank_charges' },
    ],
  },
  {
    subtype:     'service_laundry',
    parentType:  'service',
    icon:        WashingMachine,
    label:       'Laundry & Dry Cleaning',
    description: 'Wash, iron, dry clean & delivery',
    starterProducts: [
      { name: 'Shirt / blouse — wash & iron',  unit: 'pcs',  defaultPrice: 25,  costPrice: 5  },
      { name: 'Trousers — wash & iron',        unit: 'pcs',  defaultPrice: 30,  costPrice: 6  },
      { name: 'T-shirt — wash & iron',         unit: 'pcs',  defaultPrice: 20,  costPrice: 4  },
      { name: 'Suit jacket — wash & iron',     unit: 'pcs',  defaultPrice: 80,  costPrice: 15 },
      { name: 'Full suit — wash & iron',       unit: 'pcs',  defaultPrice: 150, costPrice: 30 },
      { name: 'Dress (simple)',                 unit: 'pcs',  defaultPrice: 40,  costPrice: 8  },
      { name: 'Dress (heavy / formal)',         unit: 'pcs',  defaultPrice: 100, costPrice: 20 },
      { name: 'Traditional dress (habesha)',    unit: 'pcs',  defaultPrice: 120, costPrice: 25 },
      { name: 'Jeans',                          unit: 'pcs',  defaultPrice: 35,  costPrice: 7  },
      { name: 'Jacket / coat',                  unit: 'pcs',  defaultPrice: 80,  costPrice: 15 },
      { name: 'Blanket (small)',                unit: 'pcs',  defaultPrice: 80,  costPrice: 15 },
      { name: 'Blanket (large)',                unit: 'pcs',  defaultPrice: 120, costPrice: 25 },
      { name: 'Bed sheet (single)',             unit: 'pcs',  defaultPrice: 60,  costPrice: 12 },
      { name: 'Bed sheet (double)',             unit: 'pcs',  defaultPrice: 80,  costPrice: 15 },
      { name: 'Curtain (per panel)',            unit: 'pcs',  defaultPrice: 60,  costPrice: 12 },
      { name: 'Towel',                          unit: 'pcs',  defaultPrice: 25,  costPrice: 5  },
      { name: 'Dry clean — shirt',              unit: 'pcs',  defaultPrice: 60,  costPrice: 15 },
      { name: 'Dry clean — suit',               unit: 'pcs',  defaultPrice: 200, costPrice: 60 },
      { name: 'Dry clean — coat / overcoat',    unit: 'pcs',  defaultPrice: 250, costPrice: 75 },
      { name: 'Iron only — shirt',              unit: 'pcs',  defaultPrice: 15,  costPrice: 2  },
      { name: 'Iron only — trousers',           unit: 'pcs',  defaultPrice: 20,  costPrice: 2  },
      { name: 'Pickup & delivery',              unit: 'trip', defaultPrice: 50,  costPrice: 20 },
    ],
    starterExpenses: [
      { title: 'Shop rent',                  category: 'rent'         },
      { title: 'Electricity bill',           category: 'utilities'    },
      { title: 'Water bill',                 category: 'utilities'    },
      { title: 'Staff salary',               category: 'salaries'     },
      { title: 'Detergent & cleaning agents',category: 'supplies'     },
      { title: 'Packaging (bags, hangers)',  category: 'packaging'    },
      { title: 'Machine maintenance',        category: 'maintenance'  },
      { title: 'Transport / delivery',       category: 'transport'    },
      { title: 'Marketing / flyers',         category: 'marketing'    },
      { title: 'Bank charges',               category: 'bank_charges' },
    ],
  },
  {
    subtype:     'service_tailoring',
    parentType:  'service',
    icon:        Shirt,
    label:       'Tailoring & Garments',
    description: 'Custom clothing, uniforms, alterations & embroidery',
    starterProducts: [
      { name: 'Habesha dress (kemis) — simple',  unit: 'job', defaultPrice: 1500, costPrice: 500  },
      { name: 'Habesha dress (kemis) — formal',  unit: 'job', defaultPrice: 3500, costPrice: 1200 },
      { name: 'Habesha dress with tilet',        unit: 'job', defaultPrice: 5000, costPrice: 1800 },
      { name: 'Blouse (simple)',                 unit: 'job', defaultPrice: 500,  costPrice: 150  },
      { name: 'Formal dress',                    unit: 'job', defaultPrice: 2000, costPrice: 700  },
      { name: 'Bridesmaid dress',                unit: 'job', defaultPrice: 3000, costPrice: 1000 },
      { name: "Men's shirt (simple)",            unit: 'job', defaultPrice: 500,  costPrice: 150  },
      { name: "Men's trousers",                  unit: 'job', defaultPrice: 600,  costPrice: 180  },
      { name: "Men's suit (2-piece)",            unit: 'job', defaultPrice: 4000, costPrice: 1500 },
      { name: "Men's suit (3-piece)",            unit: 'job', defaultPrice: 5500, costPrice: 2000 },
      { name: 'Netela / gabi',                  unit: 'job', defaultPrice: 2000, costPrice: 800  },
      { name: 'School uniform shirt',            unit: 'job', defaultPrice: 400,  costPrice: 120  },
      { name: 'Work uniform (per piece)',        unit: 'job', defaultPrice: 600,  costPrice: 200  },
      { name: 'Hemming / shortening',            unit: 'job', defaultPrice: 100,  costPrice: 20   },
      { name: 'Taking in / letting out',         unit: 'job', defaultPrice: 150,  costPrice: 30   },
      { name: 'Zipper replacement',              unit: 'job', defaultPrice: 100,  costPrice: 30   },
      { name: 'Embroidery (small)',              unit: 'job', defaultPrice: 200,  costPrice: 50   },
      { name: 'Embroidery (large / tilet)',      unit: 'job', defaultPrice: 1500, costPrice: 400  },
      { name: 'Logo embroidery (uniform)',       unit: 'job', defaultPrice: 300,  costPrice: 80   },
    ],
    starterExpenses: [
      { title: 'Workshop / shop rent',       category: 'rent'         },
      { title: 'Electricity bill',           category: 'utilities'    },
      { title: 'Staff / tailor salary',      category: 'salaries'     },
      { title: 'Fabric purchase',            category: 'supplies'     },
      { title: 'Thread & accessories',       category: 'supplies'     },
      { title: 'Embroidery thread',          category: 'supplies'     },
      { title: 'Sewing machine maintenance', category: 'maintenance'  },
      { title: 'Transport',                  category: 'transport'    },
      { title: 'Marketing / display',        category: 'marketing'    },
      { title: 'Bank charges',               category: 'bank_charges' },
    ],
  },
  {
    subtype:     'service_general',
    parentType:  'service',
    icon:        Wrench,
    label:       'General Services',
    description: "Everything else — consulting, delivery, cleaning & more",
    starterProducts: [
      { name: 'Consultation (1hr)',        unit: 'hr',      defaultPrice: 500,  costPrice: 0   },
      { name: 'Consultation (half day)',   unit: 'session', defaultPrice: 2000, costPrice: 0   },
      { name: 'Delivery (local)',          unit: 'trip',    defaultPrice: 150,  costPrice: 50  },
      { name: 'Delivery (cross-city)',     unit: 'trip',    defaultPrice: 500,  costPrice: 150 },
      { name: 'Cleaning (room)',           unit: 'room',    defaultPrice: 200,  costPrice: 40  },
      { name: 'Cleaning (house/full)',     unit: 'job',     defaultPrice: 800,  costPrice: 150 },
      { name: 'Painting (per room)',       unit: 'room',    defaultPrice: 1500, costPrice: 600 },
      { name: 'Printing (per page)',       unit: 'page',    defaultPrice: 3,    costPrice: 1   },
      { name: 'Lamination (per page)',     unit: 'page',    defaultPrice: 15,   costPrice: 4   },
      { name: 'Photocopy (per page)',      unit: 'page',    defaultPrice: 2,    costPrice: 0   },
      { name: 'Scanning (per page)',       unit: 'page',    defaultPrice: 5,    costPrice: 0   },
      { name: 'Translation (per page)',    unit: 'page',    defaultPrice: 100,  costPrice: 0   },
      { name: 'Event setup',               unit: 'job',     defaultPrice: 3000, costPrice: 500 },
      { name: 'Security guard (per day)',  unit: 'day',     defaultPrice: 500,  costPrice: 0   },
    ],
    starterExpenses: [
      { title: 'Office / shop rent',      category: 'rent'         },
      { title: 'Electricity bill',        category: 'utilities'    },
      { title: 'Staff salary',            category: 'salaries'     },
      { title: 'Supplies & consumables',  category: 'supplies'     },
      { title: 'Transport',               category: 'transport'    },
      { title: 'Equipment maintenance',   category: 'maintenance'  },
      { title: 'Marketing',               category: 'marketing'    },
      { title: 'Bank charges',            category: 'bank_charges' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// COFFEE / FNB SUB-TYPES
// ─────────────────────────────────────────────────────────────────────────────

const FNB_SUBTYPES: SubtypeConfig[] = [
  {
    subtype:     'fnb_coffeehouse',
    parentType:  'fnb',
    icon:        Coffee,
    label:       'Coffee House (Bunna Bet)',
    description: 'Traditional jebena coffee, macchiato & espresso — small focused coffee house',
    starterProducts: [
      { name: 'Jebena coffee (single)',     unit: 'cup',   defaultPrice: 15,  costPrice: 4  },
      { name: 'Jebena coffee (round of 3)', unit: 'round', defaultPrice: 40,  costPrice: 11 },
      { name: 'Coffee ceremony (full)',     unit: 'set',   defaultPrice: 60,  costPrice: 16 },
      { name: 'Macchiato',                  unit: 'cup',   defaultPrice: 25,  costPrice: 8  },
      { name: 'Espresso',                   unit: 'cup',   defaultPrice: 20,  costPrice: 7  },
      { name: 'Cappuccino',                 unit: 'cup',   defaultPrice: 40,  costPrice: 13 },
      { name: 'Latte',                      unit: 'cup',   defaultPrice: 45,  costPrice: 15 },
      { name: 'Americano',                  unit: 'cup',   defaultPrice: 25,  costPrice: 8  },
      { name: 'Iced macchiato',             unit: 'cup',   defaultPrice: 35,  costPrice: 12 },
      { name: 'Tea (black)',                unit: 'cup',   defaultPrice: 15,  costPrice: 3  },
      { name: 'Spiced tea (chai)',           unit: 'cup',   defaultPrice: 20,  costPrice: 6  },
      { name: 'Fresh juice (small)',        unit: 'glass', defaultPrice: 40,  costPrice: 15 },
      { name: 'Soft drink',                 unit: 'pcs',   defaultPrice: 25,  costPrice: 17 },
      { name: 'Water bottle',               unit: 'pcs',   defaultPrice: 15,  costPrice: 10 },
      { name: 'Kolo (small)',               unit: 'pcs',   defaultPrice: 10,  costPrice: 4  },
      { name: 'Kolo (large)',               unit: 'pcs',   defaultPrice: 20,  costPrice: 8  },
      { name: 'Popcorn',                    unit: 'pcs',   defaultPrice: 15,  costPrice: 5  },
      { name: 'Biscuit / cookie',           unit: 'pcs',   defaultPrice: 10,  costPrice: 5  },
      { name: 'Bread roll',                 unit: 'pcs',   defaultPrice: 10,  costPrice: 4  },
      { name: 'Cake slice',                 unit: 'pcs',   defaultPrice: 50,  costPrice: 20 },
    ],
    starterExpenses: [
      { title: 'Shop rent',              category: 'rent'             },
      { title: 'Electricity bill',       category: 'utilities'        },
      { title: 'Water bill',             category: 'utilities'        },
      { title: 'Coffee beans / green',   category: 'food_ingredients' },
      { title: 'Milk',                   category: 'food_ingredients' },
      { title: 'Sugar & ingredients',    category: 'food_ingredients' },
      { title: 'Cups & packaging',       category: 'packaging'        },
      { title: 'Staff salary',           category: 'salaries'         },
      { title: 'Machine maintenance',    category: 'maintenance'      },
      { title: 'Marketing / flyers',     category: 'marketing'        },
      { title: 'Bank charges',           category: 'bank_charges'     },
    ],
  },
  {
    subtype:     'fnb_cafe',
    parentType:  'fnb',
    icon:        UtensilsCrossed,
    label:       'Café & Drinks',
    description: 'Full café — juices, smoothies, light food & all drinks',
    starterProducts: [
      { name: 'Espresso',           unit: 'cup',   defaultPrice: 30,  costPrice: 10 },
      { name: 'Macchiato',          unit: 'cup',   defaultPrice: 35,  costPrice: 12 },
      { name: 'Cappuccino',         unit: 'cup',   defaultPrice: 55,  costPrice: 18 },
      { name: 'Latte',              unit: 'cup',   defaultPrice: 60,  costPrice: 20 },
      { name: 'Americano',          unit: 'cup',   defaultPrice: 40,  costPrice: 12 },
      { name: 'Flat White',         unit: 'cup',   defaultPrice: 60,  costPrice: 20 },
      { name: 'Mocha',              unit: 'cup',   defaultPrice: 70,  costPrice: 25 },
      { name: 'Cold Brew',          unit: 'cup',   defaultPrice: 65,  costPrice: 20 },
      { name: 'Iced Latte',         unit: 'cup',   defaultPrice: 70,  costPrice: 22 },
      { name: 'Tea (black)',        unit: 'cup',   defaultPrice: 25,  costPrice: 5  },
      { name: 'Spiced Tea (chai)',  unit: 'cup',   defaultPrice: 35,  costPrice: 10 },
      { name: 'Hot Chocolate',      unit: 'cup',   defaultPrice: 60,  costPrice: 20 },
      { name: 'Fresh Orange Juice', unit: 'glass', defaultPrice: 70,  costPrice: 30 },
      { name: 'Mixed Fruit Juice',  unit: 'glass', defaultPrice: 65,  costPrice: 25 },
      { name: 'Avocado Juice',      unit: 'glass', defaultPrice: 80,  costPrice: 35 },
      { name: 'Mango Juice',        unit: 'glass', defaultPrice: 65,  costPrice: 25 },
      { name: 'Lemon Juice',        unit: 'glass', defaultPrice: 55,  costPrice: 18 },
      { name: 'Smoothie',           unit: 'glass', defaultPrice: 90,  costPrice: 40 },
      { name: 'Soft Drink (can)',   unit: 'can',   defaultPrice: 35,  costPrice: 22 },
      { name: 'Water bottle',       unit: 'pcs',   defaultPrice: 20,  costPrice: 12 },
      { name: 'Croissant',          unit: 'pcs',   defaultPrice: 55,  costPrice: 25 },
      { name: 'Muffin',             unit: 'pcs',   defaultPrice: 50,  costPrice: 22 },
      { name: 'Club Sandwich',      unit: 'pcs',   defaultPrice: 120, costPrice: 55 },
      { name: 'Cake slice',         unit: 'pcs',   defaultPrice: 80,  costPrice: 35 },
    ],
    starterExpenses: [
      { title: 'Café rent',                category: 'rent'             },
      { title: 'Electricity bill',         category: 'utilities'        },
      { title: 'Water bill',               category: 'utilities'        },
      { title: 'Coffee beans',             category: 'food_ingredients' },
      { title: 'Milk',                     category: 'food_ingredients' },
      { title: 'Fruits & ingredients',     category: 'food_ingredients' },
      { title: 'Cups & packaging',         category: 'packaging'        },
      { title: 'Staff salary',             category: 'salaries'         },
      { title: 'Equipment maintenance',    category: 'maintenance'      },
      { title: 'Marketing / ads',          category: 'marketing'        },
      { title: 'Bank charges',             category: 'bank_charges'     },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_SERVICE_SUBTYPES  = SERVICE_SUBTYPES
export const ALL_FNB_SUBTYPES      = FNB_SUBTYPES
export const ALL_RETAIL_SUBTYPES   = RETAIL_SUBTYPES
export const ALL_FASTFOOD_SUBTYPES = FASTFOOD_SUBTYPES

/** Parent types that show a sub-type picker before the name step. */
export const TYPES_WITH_SUBTYPES: BusinessType[] = ['service', 'fnb', 'retail', 'fastfood']

export function getSubtypeConfig(subtype: Subtype): SubtypeConfig | undefined {
  return [
    ...SERVICE_SUBTYPES,
    ...FNB_SUBTYPES,
    ...RETAIL_SUBTYPES,
    ...FASTFOOD_SUBTYPES,
  ].find(s => s.subtype === subtype)
}

export function getSubtypesForType(type: BusinessType): SubtypeConfig[] {
  if (type === 'service')  return SERVICE_SUBTYPES
  if (type === 'fnb')      return FNB_SUBTYPES
  if (type === 'retail')   return RETAIL_SUBTYPES
  if (type === 'fastfood') return FASTFOOD_SUBTYPES
  return []
}
