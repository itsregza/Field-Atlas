export type GearItem = {
  id: string
  name: string
  category: string
  notes: string
}

const storageKey = 'field-atlas:gear'

const defaultCategories = [
  'Shelter',
  'Sleep',
  'Pack',
  'Footwear',
  'Clothing',
  'Navigation',
  'Cooking',
  'Other',
]

export function gearCategories() {
  return defaultCategories
}

function readGear(): GearItem[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GearItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeGear(items: GearItem[]) {
  localStorage.setItem(storageKey, JSON.stringify(items))
}

export function loadGear(): GearItem[] {
  return readGear()
}

export function addGearItem(input: Omit<GearItem, 'id'>): GearItem[] {
  const items = [
    {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      category: input.category.trim() || 'Other',
      notes: input.notes.trim(),
    },
    ...readGear(),
  ]
  writeGear(items)
  return items
}

export function removeGearItem(id: string): GearItem[] {
  const items = readGear().filter((item) => item.id !== id)
  writeGear(items)
  return items
}
