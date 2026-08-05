/**
 * Build summit-day hike suggestions from Field Atlas peak lists.
 * One route per summit (plus nearby multi-peak days) so baggers can
 * finish Wainwrights / Munros / etc. Hands off to provider search —
 * does not invent path geometry or turn-by-turn.
 *
 * Run: node scripts/generate-summit-hikes.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, 'apps/web/src/data')

const areasSrc = fs.readFileSync(path.join(dataDir, 'areas.ts'), 'utf8')
const areas = [
  ...areasSrc.matchAll(
    /slug: '([^']+)'[\s\S]*?name: '([^']+)'[\s\S]*?coords: \[([-\d.]+), ([-\d.]+)\]/g,
  ),
].map((m) => ({
  slug: m[1],
  name: m[2],
  coords: [Number(m[3]), Number(m[4])],
}))

const areaCenters = new Map(areas.map((a) => [a.slug, a.coords]))
const areaNames = new Map(areas.map((a) => [a.slug, a.name]))
const lakeMisTagAreas = new Set(['yorkshire-dales', 'north-pennines'])

const wainwrights = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'wainwrights.json'), 'utf8'),
)
const ethels = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'ethels.json'), 'utf8'),
)
const ukHills = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'uk-hills.json'), 'utf8'),
)

function dist2(a, b) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b[1] - a[1])
  const dLon = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function nearestAreaSlug(coords, candidates) {
  let best = null
  let bestDist = Infinity
  for (const slug of candidates) {
    const center = areaCenters.get(slug)
    if (!center) continue
    const d = dist2(coords, center)
    if (d < bestDist) {
      best = slug
      bestDist = d
    }
  }
  return best
}

function resolveArea(coords, claimedAreas, lockedArea) {
  if (lockedArea) return lockedArea
  const uniqueClaimed = [
    ...new Set(claimedAreas.filter((slug) => areaCenters.has(slug))),
  ]
  if (uniqueClaimed.length === 1 && !lakeMisTagAreas.has(uniqueClaimed[0])) {
    return uniqueClaimed[0]
  }
  const candidates = uniqueClaimed.length
    ? uniqueClaimed
    : [...areaCenters.keys()]
  const best = nearestAreaSlug(coords, candidates) ?? candidates[0]
  if (
    uniqueClaimed.length > 0 &&
    uniqueClaimed.every((slug) => lakeMisTagAreas.has(slug)) &&
    nearestAreaSlug(coords, areaCenters.keys()) === 'lake-district'
  ) {
    return 'lake-district'
  }
  return best
}

function mergePeaks(rows) {
  const grouped = new Map()
  for (const row of rows) {
    const list = grouped.get(row.id) ?? []
    list.push(row)
    grouped.set(row.id, list)
  }
  return [...grouped.values()].map((group) => {
    const primary = group[0]
    const lists = [...new Set(group.map((row) => row.list).filter(Boolean))]
    const lockedArea = group.find((row) => row.lockedArea)?.area
    const area = resolveArea(
      primary.coords,
      group.map((row) => row.area),
      lockedArea,
    )
    return {
      id: primary.id,
      name: primary.name,
      height: primary.height,
      gridRef: primary.gridRef,
      coords: primary.coords,
      lists,
      area,
    }
  })
}

const peaks = mergePeaks([
  ...wainwrights.map((peak) => ({
    id: peak.id,
    name: peak.name,
    height: peak.height,
    gridRef: peak.gridRef,
    coords: peak.coords,
    list: 'Wainwrights',
    area: 'lake-district',
    lockedArea: true,
  })),
  ...ethels.map((peak) => ({
    id: peak.id,
    name: peak.name,
    height: peak.height,
    gridRef: peak.gridRef,
    coords: peak.coords,
    list: peak.list,
    area: peak.area,
    lockedArea: true,
  })),
  ...ukHills.map((peak) => ({
    id: peak.id,
    name: peak.name,
    height: peak.height,
    gridRef: peak.gridRef,
    coords: peak.coords,
    list: peak.list,
    area: peak.area,
  })),
])

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function listLabel(lists) {
  if (lists.includes('Wainwrights')) return 'Wainwright'
  if (lists.includes('Munros')) return 'Munro'
  if (lists.includes('Corbetts')) return 'Corbett'
  if (lists.includes('Grahams')) return 'Graham'
  if (lists.includes('Donalds')) return 'Donald'
  if (lists.includes('Nuttalls')) return 'Nuttall'
  if (lists.includes('Hewitts')) return 'Hewitt'
  if (lists.includes('Ethels')) return 'Ethel'
  if (lists.includes('Dillons')) return 'Dillon'
  if (lists.includes('Humps')) return 'Hump'
  return lists[0] ?? 'summit'
}

function difficultyFor(height, peakCount) {
  const load = height + Math.max(0, peakCount - 1) * 180
  if (load < 420) return 'easy'
  if (load < 720) return 'moderate'
  if (load < 1000) return 'hard'
  return 'extreme'
}

function statsFor(group) {
  const maxH = Math.max(...group.map((p) => p.height))
  const spanKm =
    group.length === 1
      ? 0
      : Math.max(
          ...group.flatMap((a) =>
            group.map((b) => haversineKm(a.coords, b.coords)),
          ),
        )
  const ascent = Math.round(maxH * (group.length === 1 ? 1.05 : 1.25) + spanKm * 40)
  const distanceKm = Math.round(
    (group.length === 1 ? Math.max(5, maxH / 85) : Math.max(8, spanKm * 2.4 + maxH / 100)) *
      10,
  ) / 10
  const hours =
    Math.round((distanceKm / 3.2 + ascent / 420 + (group.length - 1) * 0.35) * 2) /
    2
  return { ascent, distanceKm, hours }
}

/** Public search-only Algolia key used by the AllTrails web client (not a user secret). */
const ALGOLIA_APP = '9IOACG5NHE'
const ALGOLIA_KEY = 'a557051fc69f8a3e456db3084df4780e'
const ALGOLIA_INDEX = 'alltrails_primary_en-US'
const trailCachePath = path.join(root, 'scripts', '.cache', 'alltrails-trails.json')
const osCachePath = path.join(root, 'scripts', '.cache', 'osmaps-routes.json')

function osFindRoutesUrl(lat, lon) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    zoom: '12',
    style: 'Standard',
    type: '2d',
    routeType: 'trusted',
    stars: '0',
    distanceMin: '0',
    sort: 'POPULAR_DESC',
  })
  return `https://explore.osmaps.com/find-routes?${params}`
}

function osRoutePageUrl(route) {
  const slug = String(route.slugName || '')
    .trim()
    .replace(/\s+/g, '-')
  if (slug) return `https://explore.osmaps.com/route/${route.id}/${slug}`
  return `https://explore.osmaps.com/route/${route.id}`
}

function allTrailsTrailUrl(slug) {
  return `https://www.alltrails.com/${slug.replace(/^\//, '')}`
}

function allTrailsExploreUrl(lat, lon, radiusDeg = 0.08) {
  const params = new URLSearchParams({
    b_tl_lat: String(lat + radiusDeg),
    b_tl_lng: String(lon - radiusDeg),
    b_br_lat: String(lat - radiusDeg),
    b_br_lng: String(lon + radiusDeg),
  })
  return `https://www.alltrails.com/explore?${params}`
}

const PEAK_STOPWORDS = new Set([
  'beinn',
  'ben',
  'sgurr',
  'stob',
  'carn',
  'meall',
  'creag',
  'creachan',
  'bidean',
  'bidein',
  'fell',
  'fells',
  'mount',
  'mountain',
  'hill',
  'hills',
  'tor',
  'tors',
  'craig',
  'crag',
  'pike',
  'pikes',
  'ridge',
  'edge',
  'top',
  'tops',
  'common',
  'moor',
  'down',
  'law',
  'dod',
  'cairn',
  'north',
  'south',
  'east',
  'west',
  'little',
  'great',
  'upper',
  'lower',
  'middle',
  'central',
  'northern',
  'southern',
  'eastern',
  'western',
])

function peakNameTokens(names) {
  return [
    ...new Set(
      names.flatMap((name) => {
        const cleaned = name
          .replace(/\s*\[[^\]]*]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        const parts = cleaned
          .split(/[\s-]+/)
          .filter((p) => p.length > 3 && !PEAK_STOPWORDS.has(p))
        // Always keep the full cleaned name for exact-ish includes.
        return [cleaned, ...parts].filter(Boolean)
      }),
    ),
  ]
}

function trailNameMatchesPeaks(trailName, peakNames) {
  const name = String(trailName || '').toLowerCase()
  const tokens = peakNameTokens(peakNames)
  // Prefer distinctive tokens; full-name include still counts.
  return tokens.some((token) => {
    if (token.length <= 3) return false
    if (PEAK_STOPWORDS.has(token)) return false
    return name.includes(token)
  })
}

function scoreTrail(hit, peakNames) {
  const trailName = String(hit.name || '').toLowerCase()
  const reviews = Number(hit.num_reviews || 0)
  const nameHit = trailNameMatchesPeaks(trailName, peakNames)
  // Never promote trails that don't mention the summit — they 404 or mismatch.
  if (!nameHit) return -1e9

  let score =
    Number(hit.popularity || 0) +
    reviews * 0.35 +
    (nameHit ? 200 : 0)
  if (reviews >= 25) score += 40
  if (reviews >= 100) score += 60
  if (reviews >= 400) score += 80
  const dist = hit._rankingInfo?.geoDistance
  if (typeof dist === 'number') score -= dist / 1200
  return score
}

function canonicalizeAllTrailsSlug(slug, cityUrl) {
  const clean = String(slug || '').replace(/^\//, '')
  if (!clean.startsWith('trail/')) return clean
  const leaf = clean.split('/').pop()
  const parts = String(cityUrl || '')
    .split('/')
    .filter(Boolean)
  // Prefer country/county from city_url when Algolia's region segment is stale.
  if (leaf && parts.length >= 2) {
    return `trail/${parts[0]}/${parts[1]}/${leaf}`
  }
  return clean
}

/** Distinctive Snowdonia / UK approach names — prefer OS routes that share these with AllTrails. */
const ROUTE_STYLE_TOKENS = [
  'crib goch',
  'pyg',
  "miners'",
  'miners',
  'watkin',
  'rhyd ddu',
  'llanberis',
  'snowdon ranger',
  'striding',
  'swirral',
  'corridor',
]

function routeStyleTokens(text) {
  const lower = String(text || '').toLowerCase()
  return ROUTE_STYLE_TOKENS.filter((token) => lower.includes(token))
}

function scoreOsRoute(route, peakNames, preferredTrailName = '') {
  const name = String(route.metadata?.name || '').toLowerCase()
  const activity = route.characteristics?.activity || ''
  const nameHit = trailNameMatchesPeaks(name, peakNames)
  if (!nameHit) return -1e9

  let score = Number(route.metadata?.popularityScore || 0)
  if (route.metadata?.recommended === 'APPROVED') score += 250
  if (activity === 'ON_FOOT_WALKING') score += 120
  else score -= 2000
  score += 600

  const preferred = routeStyleTokens(preferredTrailName)
  const candidate = routeStyleTokens(name)
  if (preferred.length) {
    const shared = preferred.filter((token) => candidate.includes(token))
    if (shared.length) score += 800 * shared.length
    else if (candidate.length) score -= 900
  }

  return score
}

function loadJsonCache(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return {}
  }
}

function saveJsonCache(filePath, cache) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(cache, null, 2)}\n`)
}

async function queryAllTrailsNear(lat, lon, peakNames) {
  const attrs = [
    'name',
    'slug',
    'ID',
    '_geoloc',
    'length',
    'avg_rating',
    'difficulty_rating',
    'num_reviews',
    'area_name',
    'city_url',
    'elevation_gain',
    'popularity',
  ]
  const params = new URLSearchParams({
    query: '',
    hitsPerPage: '20',
    aroundLatLng: `${lat},${lon}`,
    aroundRadius: '15000',
    getRankingInfo: 'true',
    filters: 'type:trail',
    attributesToRetrieve: JSON.stringify(attrs),
  })
  const res = await fetch(
    `https://${ALGOLIA_APP}-dsn.algolia.net/1/indexes/${ALGOLIA_INDEX}/query`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-algolia-application-id': ALGOLIA_APP,
        'x-algolia-api-key': ALGOLIA_KEY,
      },
      body: JSON.stringify({ params: params.toString() }),
    },
  )
  if (!res.ok) {
    throw new Error(`Algolia ${res.status}`)
  }
  const data = await res.json()
  const hits = (data.hits || []).filter((hit) =>
    trailNameMatchesPeaks(hit.name, peakNames),
  )
  if (!hits.length) return null
  hits.sort((a, b) => scoreTrail(b, peakNames) - scoreTrail(a, peakNames))
  const best = hits[0]
  if (!best?.slug || scoreTrail(best, peakNames) < 0) return null
  if (Number(best.num_reviews || 0) < 5 && scoreTrail(best, peakNames) < 220) {
    return null
  }
  const slug = canonicalizeAllTrailsSlug(best.slug, best.city_url)
  return {
    name: best.name,
    slug,
    id: best.ID,
    lengthM: best.length ?? null,
    ascentM: best.elevation_gain ?? null,
    rating: best.avg_rating ?? null,
    reviews: best.num_reviews ?? null,
    difficulty: best.difficulty_rating ?? null,
  }
}

async function queryOsMapsNear(lat, lon, peakNames, preferredTrailName = '') {
  const deltas = [0.045, 0.08, 0.12]
  for (const d of deltas) {
    const boundingBox = [lon - d, lat - d, lon + d, lat + d]
    const res = await fetch(
      'https://consumerplatform.ordnancesurvey.co.uk/route-api/v1/routes/search',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Origin: 'https://explore.osmaps.com',
          Referer: 'https://explore.osmaps.com/',
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
          'app-name': 'OS_MAPS',
          'app-version': 'v2.8.3 (d47db18)',
          platform: 'WEB',
        },
        body: JSON.stringify({
          boundingBox,
          difficulties: [],
          minRating: 0,
          premiumOnly: false,
          organisationIds: [],
          pageParameters: {
            orderBy: 'metadata.popularityScore',
            direction: 'DESC',
            size: 40,
            page: 0,
          },
        }),
      },
    )
    if (!res.ok) {
      throw new Error(`OS Maps ${res.status}`)
    }
    const data = await res.json()
    const routes = (data.content || []).filter(
      (route) => route?.id && route?.metadata?.visibility !== 'PRIVATE',
    )
    if (!routes.length) continue
    const score = (route) => scoreOsRoute(route, peakNames, preferredTrailName)
    routes.sort((a, b) => score(b) - score(a))
    const matched = routes.filter((route) => score(route) > 0)
    const best = matched[0]
    if (!best) continue
    return {
      id: best.id,
      name: best.metadata?.name?.trim() || `OS route ${best.id}`,
      slugName: best.metadata?.slugName || '',
      lengthM: best.characteristics?.distance ?? null,
      ascentM: best.characteristics?.elevationAscent ?? null,
      difficulty: best.characteristics?.difficulty ?? null,
      activity: best.characteristics?.activity ?? null,
      popularity: best.metadata?.popularityScore ?? null,
    }
  }
  return null
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  )
  return results
}

function providerFor(peakNames, areaSlug, lat, lon, trail, osRoute) {
  const osLink = osRoute
    ? { label: 'OS Maps', url: osRoutePageUrl(osRoute) }
    : { label: 'OS Maps', url: osFindRoutesUrl(lat, lon) }

  if (trail?.slug) {
    return {
      osMaps: {
        label: 'AllTrails',
        url: allTrailsTrailUrl(trail.slug),
      },
      alternative: osLink,
      trailName: trail.name,
      osRouteName: osRoute?.name,
    }
  }

  if (osRoute) {
    return {
      osMaps: osLink,
      alternative: scotlandSlug(areaSlug)
        ? {
            label: 'Walkhighlands',
            url: `https://www.walkhighlands.co.uk/search.shtml?q=${encodeURIComponent(peakNames.join(' '))}`,
          }
        : {
            label: 'AllTrails map',
            url: allTrailsExploreUrl(lat, lon),
          },
      osRouteName: osRoute.name,
    }
  }

  if (scotlandSlug(areaSlug)) {
    return {
      osMaps: osLink,
      alternative: {
        label: 'Walkhighlands',
        url: `https://www.walkhighlands.co.uk/search.shtml?q=${encodeURIComponent(peakNames.join(' '))}`,
      },
    }
  }

  return {
    osMaps: osLink,
    alternative: {
      label: 'AllTrails map',
      url: allTrailsExploreUrl(lat, lon),
    },
  }
}

function scotlandSlug(slug) {
  return [
    'cairngorms',
    'northwest-highlands',
    'loch-lomond-trossachs',
    'isle-of-skye',
    'southern-uplands',
  ].includes(slug)
}

function buildHike(group, kind, trail = null, osRoute = null) {
  const sorted = [...group].sort((a, b) => b.height - a.height || a.name.localeCompare(b.name))
  const areaSlug = sorted[0].area
  const areaName = areaNames.get(areaSlug) ?? areaSlug
  const names = sorted.map((p) => p.name)
  const label = listLabel(sorted.flatMap((p) => p.lists))
  let { ascent, distanceKm, hours } = statsFor(sorted)
  const difficulty = difficultyFor(
    Math.max(...sorted.map((p) => p.height)),
    sorted.length,
  )
  const shape = sorted.length === 1 ? 'out-and-back' : 'circular'
  const scrambling =
    difficulty === 'extreme' ? 'exposed' : difficulty === 'hard' ? 'mild' : 'none'
  const exposure =
    difficulty === 'extreme' || difficulty === 'hard' ? 'high' : difficulty === 'moderate' ? 'moderate' : 'low'
  const navigation =
    difficulty === 'extreme' ? 'hard' : difficulty === 'hard' ? 'moderate' : 'easy'

  const idBase =
    kind === 'single'
      ? `summit-${slugify(names[0])}-${sorted[0].id.replace(/\W+/g, '')}`
      : `round-${sorted.map((p) => p.id.replace(/\W+/g, '')).join('-')}`.slice(0, 80)

  const name =
    sorted.length === 1
      ? `${names[0]} summit day`
      : sorted.length === 2
        ? `${names[0]} & ${names[1]}`
        : `${names[0]} round (${sorted.length} summits)`

  const listBits = [...new Set(sorted.flatMap((p) => p.lists))]
  const lat =
    sorted.reduce((sum, p) => sum + p.coords[1], 0) / sorted.length
  const lon =
    sorted.reduce((sum, p) => sum + p.coords[0], 0) / sorted.length

  const statsSource = trail?.lengthM ? trail : osRoute?.lengthM ? osRoute : null
  if (statsSource?.lengthM) {
    distanceKm = Math.round((statsSource.lengthM / 1000) * 10) / 10
  }
  if (statsSource?.ascentM) {
    ascent = Math.round(statsSource.ascentM)
  }
  if (statsSource?.lengthM) {
    hours =
      Math.round(
        (distanceKm / 3.2 + ascent / 420 + (sorted.length - 1) * 0.2) * 2,
      ) / 2
  }

  const campingNight =
    hours >= 5 || distanceKm >= 12 || ascent >= 600

  const linked = [
    trail?.name ? `AllTrails: ${trail.name}` : null,
    osRoute?.name ? `OS Maps: ${osRoute.name}` : null,
  ].filter(Boolean)

  const summary = linked.length
    ? sorted.length === 1
      ? `A ${label.toLowerCase()} day for ${names[0]} (${sorted[0].height}m) in ${areaName}. ${linked.join(' · ')}.`
      : `A ${sorted.length}-summit day covering ${names.join(', ')} in ${areaName}. ${linked.join(' · ')}.`
    : sorted.length === 1
      ? `A ${label.toLowerCase()} day for ${names[0]} (${sorted[0].height}m) in ${areaName}. Open a provider map nearby to pick an established approach.`
      : `A linked ${sorted.length}-summit day covering ${names.join(', ')} in ${areaName}${listBits.length ? ` (${listBits.join(', ')})` : ''}. Open a provider map nearby for a published circuit.`

  const { trailName: _t, osRouteName: _o, ...links } = providerFor(
    names,
    areaSlug,
    lat,
    lon,
    trail,
    osRoute,
  )

  return {
    id: idBase,
    name,
    areaSlug,
    difficulty,
    hours,
    ascent,
    distanceKm,
    shape,
    scrambling,
    exposure,
    navigation,
    dogFriendly: difficulty === 'easy' || difficulty === 'moderate',
    familyFriendly: difficulty === 'easy',
    parking: true,
    publicTransport: false,
    campingNight,
    peakIds: sorted.map((p) => p.id),
    summary,
    ...links,
    source: 'summit',
    _lookup: { lat, lon, names, kind, group: sorted },
  }
}

const byArea = new Map()
for (const peak of peaks) {
  if (!areaCenters.has(peak.area)) continue
  const list = byArea.get(peak.area) ?? []
  list.push(peak)
  byArea.set(peak.area, list)
}

const TARGET_MIN = 50
const PAIR_KM = 3.8
const TRIPLE_KM = 5.2
const hikes = []
const seenPeakSets = new Set()

function peakSetKey(ids) {
  return [...ids].sort().join('|')
}

function addHike(group, kind) {
  const key = peakSetKey(group.map((p) => p.id))
  if (seenPeakSets.has(key)) return false
  seenPeakSets.add(key)
  hikes.push(buildHike(group, kind))
  return true
}

for (const [slug, areaPeaks] of byArea) {
  areaPeaks.sort((a, b) => b.height - a.height || a.name.localeCompare(b.name))

  for (const peak of areaPeaks) {
    addHike([peak], 'single')
  }

  // Nearest-neighbour pairs for bagging rounds
  for (let i = 0; i < areaPeaks.length; i++) {
    const a = areaPeaks[i]
    let best = null
    let bestD = Infinity
    for (let j = i + 1; j < areaPeaks.length; j++) {
      const b = areaPeaks[j]
      const d = haversineKm(a.coords, b.coords)
      if (d <= PAIR_KM && d < bestD) {
        best = b
        bestD = d
      }
    }
    if (best) addHike([a, best], 'pair')
  }

  // Extra pairs / triples until the region hits the floor (wider net for thin areas)
  const widenKm = [TRIPLE_KM, 8, 12, 18]
  for (const maxKm of widenKm) {
    if (hikes.filter((h) => h.areaSlug === slug).length >= TARGET_MIN) break

    for (let i = 0; i < areaPeaks.length; i++) {
      for (let j = i + 1; j < areaPeaks.length; j++) {
        if (haversineKm(areaPeaks[i].coords, areaPeaks[j].coords) <= maxKm) {
          addHike([areaPeaks[i], areaPeaks[j]], 'pair')
        }
      }
    }

    if (hikes.filter((h) => h.areaSlug === slug).length >= TARGET_MIN) break

    for (let i = 0; i < areaPeaks.length; i++) {
      for (let j = i + 1; j < areaPeaks.length; j++) {
        for (let k = j + 1; k < areaPeaks.length; k++) {
          const trio = [areaPeaks[i], areaPeaks[j], areaPeaks[k]]
          const span = Math.max(
            haversineKm(trio[0].coords, trio[1].coords),
            haversineKm(trio[0].coords, trio[2].coords),
            haversineKm(trio[1].coords, trio[2].coords),
          )
          if (span <= maxKm) addHike(trio, 'triple')
        }
      }
    }
  }
}

hikes.sort(
  (a, b) =>
    a.areaSlug.localeCompare(b.areaSlug) ||
    a.name.localeCompare(b.name) ||
    a.id.localeCompare(b.id),
)

async function enrichProviders(drafts) {
  const atCache = loadJsonCache(trailCachePath)
  const osCache = loadJsonCache(osCachePath)
  const stats = {
    atHits: 0,
    atMiss: 0,
    atFail: 0,
    osHits: 0,
    osMiss: 0,
    osFail: 0,
  }

  const enriched = await mapPool(drafts, 6, async (draft) => {
    const { lat, lon, names, kind, group } = draft._lookup
    const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}|${names.join('|')}`

    let trail = atCache[cacheKey]
    if (trail === undefined) {
      try {
        trail = await queryAllTrailsNear(lat, lon, names)
        atCache[cacheKey] = trail
        if (trail) stats.atHits++
        else stats.atMiss++
      } catch (err) {
        stats.atFail++
        trail = null
        if (stats.atFail <= 5) {
          console.warn(`AllTrails lookup failed: ${err.message}`)
        }
      }
    } else if (trail) stats.atHits++
    else stats.atMiss++

    const osCacheKey = `${cacheKey}|${trail?.slug || 'none'}`
    let osRoute = osCache[osCacheKey]
    if (osRoute === undefined) {
      try {
        osRoute = await queryOsMapsNear(lat, lon, names, trail?.name || '')
        osCache[osCacheKey] = osRoute
        if (osRoute) stats.osHits++
        else stats.osMiss++
      } catch (err) {
        stats.osFail++
        osRoute = null
        if (stats.osFail <= 5) {
          console.warn(`OS Maps lookup failed: ${err.message}`)
        }
      }
    } else if (osRoute) stats.osHits++
    else stats.osMiss++

    const rebuilt = buildHike(group, kind, trail, osRoute)
    delete rebuilt._lookup
    return rebuilt
  })

  saveJsonCache(trailCachePath, atCache)
  saveJsonCache(osCachePath, osCache)
  console.log(
    `AllTrails matches: ${stats.atHits} · empty: ${stats.atMiss} · failures: ${stats.atFail}`,
  )
  console.log(
    `OS Maps matches: ${stats.osHits} · empty: ${stats.osMiss} · failures: ${stats.osFail}`,
  )
  return enriched
}

const enrichedHikes = await enrichProviders(hikes)

const outPath = path.join(dataDir, 'generatedHikes.json')
fs.writeFileSync(outPath, `${JSON.stringify(enrichedHikes, null, 2)}\n`)

const counts = {}
for (const hike of enrichedHikes) {
  counts[hike.areaSlug] = (counts[hike.areaSlug] || 0) + 1
}
const wainwrightIds = new Set(wainwrights.map((p) => p.id))
const lakesCovered = new Set(
  enrichedHikes
    .filter((h) => h.areaSlug === 'lake-district')
    .flatMap((h) => h.peakIds)
    .filter((id) => wainwrightIds.has(id)),
)
const withAllTrails = enrichedHikes.filter((h) =>
  /alltrails\.com\/trail\//.test(h.osMaps?.url || ''),
).length
const withOsRoute = enrichedHikes.filter((h) =>
  /explore\.osmaps\.com\/route\//.test(
    `${h.osMaps?.url || ''}|${h.alternative?.url || ''}`,
  ),
).length

console.log(`Wrote ${enrichedHikes.length} summit hikes → ${path.relative(root, outPath)}`)
console.log(`AllTrails trail links: ${withAllTrails}/${enrichedHikes.length}`)
console.log(`OS Maps route links: ${withOsRoute}/${enrichedHikes.length}`)
for (const a of areas) {
  console.log(
    `  ${a.slug}: ${counts[a.slug] || 0} hikes (peaks ${byArea.get(a.slug)?.length || 0})`,
  )
}
console.log(
  `Lake District Wainwright coverage: ${lakesCovered.size}/${wainwrightIds.size}`,
)
