export type HomeHeroShot = {
  src: string
  place: string
  alt: string
  /** Field Atlas handle of the photographer — shown as @handle on the hero. */
  handle: string
}

export const homeHeroShots: HomeHeroShot[] = [
  {
    src: '/heroes/lakes-wasdale.jpg',
    place: 'Lake District · Wasdale Head',
    alt: 'Wasdale Head and Great Gable in the Lake District',
    handle: 'sam',
  },
  {
    src: '/heroes/lakes-langdale.jpg',
    place: 'Lake District · Langdale Pikes',
    alt: 'The Langdale Pikes in the Lake District',
    handle: 'sam',
  },
  {
    src: '/heroes/peak-kinder.jpg',
    place: 'Peak District · Kinder Scout',
    alt: 'Kinder Scout in the Peak District',
    handle: 'sam',
  },
  {
    src: '/heroes/glencoe-buachaille.jpg',
    place: 'Scottish Highlands · Glencoe',
    alt: 'Buachaille Etive Mòr in Glencoe',
    handle: 'sam',
  },
  {
    src: '/heroes/jacobs-ladder.jpeg',
    place: 'Peak District · Jacobs Ladder',
    alt: 'Jacobs Ladder in the Peak District',
    handle: 'sam',
  },
  {
    src: '/heroes/y-garn.jpeg',
    place: 'Eryri · Ogwen Valley',
    alt: 'Ogwen Valley range in the Eryri',
    handle: 'sam',
  },
  {
    src: '/heroes/kinder.jpeg',
    place: 'Peak District · Sandy Heys',
    alt: 'Sandy Heys in the Peak District',
    handle: 'sam',
  },
  {
    src: '/heroes/kinderclouds.jpeg',
    place: 'Peak District · Kinder Low',
    alt: 'Kinder Low in the Peak District',
    handle: 'sam',
  },
  {
    src: '/heroes/greengable1.jpeg',
    place: 'Lake District · Scafell range',
    alt: 'Scafell range in the Lake District',
    handle: 'sam',
  },
]

const lastKey = 'field-atlas:last-hero'

export function pickHomeHero(): HomeHeroShot {
  const pool = homeHeroShots
  if (pool.length === 1) return pool[0]

  let last = ''
  try {
    last = sessionStorage.getItem(lastKey) ?? ''
  } catch {
  }

  const choices = pool.filter((shot) => shot.src !== last)
  const next = choices[Math.floor(Math.random() * choices.length)] ?? pool[0]

  try {
    sessionStorage.setItem(lastKey, next.src)
  } catch {
  }

  return next
}
