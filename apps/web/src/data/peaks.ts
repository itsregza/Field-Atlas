import wainwrights from './wainwrights.json'

export type Peak = {
  id: string
  name: string
  height: number
  area: string
  gridRef: string
  coords: [number, number]
  done: boolean
}

export const peaks: Peak[] = wainwrights.map((peak) => ({
  ...peak,
  coords: [peak.coords[0], peak.coords[1]],
}))
