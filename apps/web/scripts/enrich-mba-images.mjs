/**
 * Fetch hero photos from MBA bothy pages and write them onto bothies.json.
 * Usage: node scripts/enrich-mba-images.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataPath = path.join(root, 'src/data/bothies.json')
const bothies = JSON.parse(fs.readFileSync(dataPath, 'utf8'))

function sizeFromUrl(url) {
  const multi = url.match(/-(\d+)x(\d+)-(\d+)x(\d+)\.(jpe?g|png|webp)$/i)
  if (multi) return { w: Number(multi[3]), h: Number(multi[4]), thumb: true }
  const single = url.match(/-(\d+)x(\d+)\.(jpe?g|png|webp)$/i)
  if (single) return { w: Number(single[1]), h: Number(single[2]), thumb: false }
  return { w: 2000, h: 2000, thumb: false }
}

function isUsefulImage(url) {
  if (!/wp-content\/uploads\//i.test(url)) return false
  if (/logo|icon|favicon|sprite|avatar|badge|button|header-bg/i.test(url)) {
    return false
  }
  const { w, h, thumb } = sizeFromUrl(url)
  if (thumb) return false
  if (Math.min(w, h) < 350) return false
  return true
}

function pickHeroImage(html) {
  const urls = [
    ...html.matchAll(
      /https?:\/\/www\.mountainbothies\.org\.uk\/wp-content\/uploads\/[^"'\s>]+/gi,
    ),
  ].map((m) => m[0].replace(/&amp;/g, '&'))

  // Prefer first suitable image in page order (usually the hero).
  const unique = []
  for (const url of urls) {
    if (unique.includes(url)) continue
    if (!isUsefulImage(url)) continue
    unique.push(url)
  }
  return unique[0] || null
}

async function fetchImageFor(website) {
  const res = await fetch(website, {
    headers: {
      'User-Agent': 'FieldAtlasBothyMap/1.0 (local data enrichment)',
      Accept: 'text/html',
    },
  })
  if (!res.ok) throw new Error(`${website} → ${res.status}`)
  const html = await res.text()
  return pickHeroImage(html)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

let updated = 0
let failed = 0
const onlyMissing = process.argv.includes('--missing')

for (const bothy of bothies) {
  const website = bothy.website || ''
  if (!/mountainbothies\.org\.uk\/bothies\//i.test(website)) {
    if (!bothy.image) bothy.image = ''
    continue
  }
  if (onlyMissing && bothy.image) continue

  try {
    const image = await fetchImageFor(website)
    bothy.image = image || bothy.image || ''
    if (image) {
      updated += 1
      console.log(`✓ ${bothy.name}`)
    } else {
      failed += 1
      console.warn(`✗ no image: ${bothy.name}`)
    }
  } catch (err) {
    bothy.image = bothy.image || ''
    failed += 1
    console.warn(`✗ ${bothy.name}: ${err}`)
    await sleep(1500)
    continue
  }

  await sleep(onlyMissing ? 600 : 350)
}

fs.writeFileSync(dataPath, `${JSON.stringify(bothies, null, 2)}\n`, 'utf8')
console.log(`Done. images=${updated} missing=${failed}`)
