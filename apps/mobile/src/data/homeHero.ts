import type { ImageSource } from 'expo-image'

export type HomeHeroShot = {
  source: ImageSource
  place: string
  alt: string
  handle: string
}

/** Same set as apps/web/src/data/homeHero.ts — bundled assets, not remote URLs. */
export const homeHeroShots: HomeHeroShot[] = [
  {
    source: require('../../assets/heroes/lakes-wasdale.jpg'),
    place: 'Lake District · Wasdale Head',
    alt: 'Wasdale Head and Great Gable in the Lake District',
    handle: 'sam',
  },
  {
    source: require('../../assets/heroes/lakes-langdale.jpg'),
    place: 'Lake District · Langdale Pikes',
    alt: 'The Langdale Pikes in the Lake District',
    handle: 'sam',
  },
  {
    source: require('../../assets/heroes/peak-kinder.jpg'),
    place: 'Peak District · Kinder Scout',
    alt: 'Kinder Scout in the Peak District',
    handle: 'sam',
  },
  {
    source: require('../../assets/heroes/glencoe-buachaille.jpg'),
    place: 'Scottish Highlands · Glencoe',
    alt: 'Buachaille Etive Mòr in Glencoe',
    handle: 'sam',
  },
  {
    source: require('../../assets/heroes/jacobs-ladder.jpeg'),
    place: 'Peak District · Jacobs Ladder',
    alt: 'Jacobs Ladder in the Peak District',
    handle: 'sam',
  },
  {
    source: require('../../assets/heroes/y-garn.jpeg'),
    place: 'Eryri · Ogwen Valley',
    alt: 'Ogwen Valley range in the Eryri',
    handle: 'sam',
  },
  {
    source: require('../../assets/heroes/kinder.jpeg'),
    place: 'Peak District · Sandy Heys',
    alt: 'Sandy Heys in the Peak District',
    handle: 'sam',
  },
  {
    source: require('../../assets/heroes/kinderclouds.jpeg'),
    place: 'Peak District · Kinder Low',
    alt: 'Kinder Low in the Peak District',
    handle: 'sam',
  },
  {
    source: require('../../assets/heroes/greengable1.jpeg'),
    place: 'Lake District · Scafell range',
    alt: 'Scafell range in the Lake District',
    handle: 'sam',
  },
]

export const HERO_INTERVAL_MS = 10_000
