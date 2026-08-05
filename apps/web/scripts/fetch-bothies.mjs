/**
 * Fetch UK bothies from Overpass and write bothies.json.
 * Usage: node scripts/fetch-bothies.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outPath = path.join(root, 'src/data/bothies.json')

const QUERY = `
[out:json][timeout:120];
(
  nwr["tourism"="wilderness_hut"](49.8,-8.8,60.95,2.0);
  nwr["bothy"="yes"](49.8,-8.8,60.95,2.0);
  nwr["amenity"="shelter"]["shelter_type"="basic_hut"](49.8,-8.8,60.95,2.0);
  nwr["tourism"="alpine_hut"]["operator"~"Mountain Bothies",i](49.8,-8.8,60.95,2.0);
  nwr["building"="hut"]["operator"~"Mountain Bothies",i](49.8,-8.8,60.95,2.0);
  nwr["website"~"mountainbothies\\\\.org\\\\.uk"](49.8,-8.8,60.95,2.0);
  nwr["operator"~"Mountain Bothies",i](49.8,-8.8,60.95,2.0);
);
out center tags;
`

const ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
]

const MBA_REGION_LABELS = {
  'northern-highlands': 'Northern Highlands',
  'northwest-highlands': 'Northwest Highlands',
  'western-highlands-islands': 'Western Highlands & Islands',
  'southwest-highlands-islands': 'Southwest Highlands & Islands',
  'central-highlands-cairngorms': 'Central Highlands & Cairngorms',
  'eastern-highlands': 'Eastern Highlands',
  'southern-scotland': 'Southern Scotland',
  'northern-england': 'Northern England',
  'northern-england-borders': 'Northern England',
  wales: 'Wales',
}

/** Approximate England–Scotland border latitude for a given longitude. */
function scotlandBorderLat(lon) {
  const pts = [
    [-5.2, 54.9],
    [-4.0, 54.95],
    [-3.2, 54.98],
    [-2.95, 55.07],
    [-2.7, 55.18],
    [-2.55, 55.28],
    [-2.45, 55.38],
    [-2.2, 55.5],
    [-2.05, 55.7],
    [-1.8, 55.82],
  ]
  if (lon <= pts[0][0]) return pts[0][1]
  if (lon >= pts[pts.length - 1][0]) return pts[pts.length - 1][1]
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    if (lon >= x0 && lon <= x1) {
      const t = (lon - x0) / (x1 - x0)
      return y0 + t * (y1 - y0)
    }
  }
  return 55.5
}

function isRepublicOfIreland(lat, lon) {
  if (lon > -5.4) return false
  if (lat < 54.05 && lon < -5.9) return true
  // Donegal / west ROI north of 54.5
  if (lon < -7.55 && lat > 54.5 && lat < 55.4) return true
  if (lon < -8.25 && lat < 55.5) return true
  return false
}

function isNorthernIreland(lat, lon) {
  if (isRepublicOfIreland(lat, lon)) return false
  return lon >= -8.2 && lon <= -5.35 && lat >= 54.0 && lat <= 55.35
}

function isWales(lat, lon) {
  if (lon > -2.65 || lon < -5.5) return false
  if (lat < 51.3 || lat > 53.48) return false
  // Exclude English side of Severn / Dee roughly
  if (lon > -2.9 && lat > 52.8) return false
  return true
}

function isScotland(lat, lon) {
  if (isNorthernIreland(lat, lon) || isRepublicOfIreland(lat, lon)) return false
  if (lat >= 58.4) return true // far north / islands
  if (lon <= -5.0 && lat >= 55.2) return true // Hebrides / west coast
  if (lon <= -6.0 && lat >= 56.0) return true
  if (lat < 54.75) return false
  return lat >= scotlandBorderLat(lon)
}

function mbaRegionFromWebsite(website) {
  if (!website) return null
  const match = website.match(
    /mountainbothies\.org\.uk\/bothies\/([^/]+)\//i,
  )
  if (!match) return null
  return MBA_REGION_LABELS[match[1].toLowerCase()] ?? null
}

function guessRegion(lat, lon, tags = {}) {
  const fromMba = mbaRegionFromWebsite(
    tags.website || tags['contact:website'] || '',
  )
  if (fromMba) return fromMba

  if (isNorthernIreland(lat, lon)) return 'Northern Ireland'
  if (isScotland(lat, lon)) {
    if (lat >= 58.2) return 'Northern Highlands'
    if (lat >= 57.0 && lon <= -4.5) return 'Northwest Highlands'
    if (lat >= 56.5 && lon <= -5.0) return 'Western Highlands & Islands'
    if (lat >= 56.0 && lon <= -4.8) return 'Southwest Highlands & Islands'
    if (lat >= 56.6 && lon > -4.5) return 'Central Highlands & Cairngorms'
    if (lat >= 56.4) return 'Eastern Highlands'
    return 'Southern Scotland'
  }
  if (isWales(lat, lon)) return 'Wales'
  if (lat >= 53.6) return 'Northern England'
  if (lat >= 52.4 && lat < 53.6) return 'Midlands'
  if (lon <= -3.0 && lat < 51.7) return 'South West England'
  if (lat < 52.4) return 'Southern England'
  return 'United Kingdom'
}

function isLikelyBothy(tags, name, lat, lon) {
  const lower = name.toLowerCase()
  const operator = tags.operator || ''
  const website = tags.website || tags['contact:website'] || ''

  if (/wilderness reserve|wildnerness reserve/i.test(operator)) return false
  if (/tea room|cafe|café|pub|inn|hotel|restaurant|brewery|kitchen/i.test(lower)) {
    return false
  }
  if (/camping barn|summerhouse|scout|school|manor|cottage plot/i.test(lower)) {
    return false
  }
  if (/bookmakers|smokers shelter|trolley park|fire feast/i.test(lower)) {
    return false
  }

  const mba =
    /mountain bothies/i.test(operator) ||
    /mountainbothies\.org\.uk/i.test(website)

  const inHillCountry =
    isScotland(lat, lon) ||
    isWales(lat, lon) ||
    isNorthernIreland(lat, lon) ||
    (lat >= 53.7 && lon <= -1.2)

  if (name === 'Unnamed bothy' && !mba && !inHillCountry) return false

  if (mba) return true
  if (tags.bothy === 'yes') return true
  if (tags.shelter_type === 'basic_hut' && inHillCountry) return true

  if (tags.tourism === 'wilderness_hut') {
    if (!inHillCountry) return /\bbothy\b/.test(lower)
    return true
  }

  return false
}

async function fetchOverpass() {
  const body = `data=${encodeURIComponent(QUERY)}`
  let lastError
  for (const endpoint of ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })
      if (!res.ok) throw new Error(`${endpoint} → ${res.status}`)
      const data = await res.json()
      if (!data.elements?.length) throw new Error(`${endpoint} empty`)
      return data
    } catch (err) {
      lastError = err
      console.warn(String(err))
    }
  }
  throw lastError ?? new Error('All Overpass endpoints failed')
}

function processElements(raw) {
  const seen = new Set()
  const bothies = []

  for (const el of raw.elements ?? []) {
    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    if (lat == null || lon == null) continue
    if (lat < 49.8 || lat > 60.95 || lon < -8.8 || lon > 2.1) continue
    if (isRepublicOfIreland(lat, lon)) continue

    const tags = el.tags ?? {}
    const name = tags.name || tags['name:en'] || 'Unnamed bothy'
    if (!isLikelyBothy(tags, name, lat, lon)) continue

    const id = `osm-${el.type}-${el.id}`
    if (seen.has(id)) continue
    seen.add(id)

    // Deduplicate same name within ~80m
    const near = bothies.find(
      (b) =>
        b.name === name &&
        Math.hypot(b.coords[0] - lon, b.coords[1] - lat) < 0.001,
    )
    if (near) continue

    bothies.push({
      id,
      name,
      coords: [Number(lon.toFixed(6)), Number(lat.toFixed(6))],
      region: guessRegion(lat, lon, tags),
      operator: tags.operator || '',
      description: tags.description || '',
      ele: tags.ele && !Number.isNaN(Number(tags.ele)) ? Number(tags.ele) : null,
      osmType: el.type,
      osmId: el.id,
      website: tags.website || tags['contact:website'] || '',
    })
  }

  bothies.sort((a, b) => a.name.localeCompare(b.name, 'en'))
  return bothies
}

const raw = await fetchOverpass()
const bothies = processElements(raw)
fs.writeFileSync(outPath, `${JSON.stringify(bothies, null, 2)}\n`, 'utf8')

const regions = {}
for (const b of bothies) regions[b.region] = (regions[b.region] || 0) + 1
console.log(`Wrote ${bothies.length} bothies → ${outPath}`)
console.log(regions)
