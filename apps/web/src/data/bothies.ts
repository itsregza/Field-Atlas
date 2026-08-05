import bothiesJson from './bothies.json'

export type Bothy = {
  id: string
  name: string
  coords: [number, number]
  region: string
  operator: string
  description: string
  ele: number | null
  osmType: string
  osmId: number
  website: string
  /** MBA (or other) photo URL when known. */
  image?: string
}

export type BothyOperatorFilter = 'all' | 'mba' | 'other'

export function isMbaBothy(bothy: Pick<Bothy, 'operator' | 'website'>) {
  return (
    /mountain bothies/i.test(bothy.operator) ||
    /mountainbothies\.org\.uk/i.test(bothy.website)
  )
}

export type BothyWithMba = Bothy & { mba: boolean }

export const bothies: BothyWithMba[] = (bothiesJson as Bothy[]).map((bothy) => ({
  ...bothy,
  mba: isMbaBothy(bothy),
}))

export const bothyRegions = [
  ...new Set(bothies.map((bothy) => bothy.region)),
].sort((a, b) => a.localeCompare(b))

export function getBothyById(id: string) {
  return bothies.find((bothy) => bothy.id === id)
}

export function getBothiesByRegion(region: string | null) {
  if (!region) return bothies
  return bothies.filter((bothy) => bothy.region === region)
}

export function filterBothies(
  items: BothyWithMba[],
  operatorFilter: BothyOperatorFilter,
) {
  if (operatorFilter === 'mba') return items.filter((bothy) => bothy.mba)
  if (operatorFilter === 'other') return items.filter((bothy) => !bothy.mba)
  return items
}

export function bothyOsmUrl(bothy: Bothy) {
  return `https://www.openstreetmap.org/${bothy.osmType}/${bothy.osmId}`
}

export function formatBothyCoords(coords: [number, number]) {
  const [lng, lat] = coords
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(5)}°${ns}, ${Math.abs(lng).toFixed(5)}°${ew}`
}
