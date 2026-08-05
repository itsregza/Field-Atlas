export type CampingNation =
  | 'England'
  | 'Scotland'
  | 'Wales'
  | 'Northern Ireland'

export type CampingGuidance = {
  nation: CampingNation
  title: string
  summary: string
  rules: string[]
  links: Array<{ label: string; url: string }>
}

export const campingGuidanceByNation: Record<CampingNation, CampingGuidance> = {
  Scotland: {
    nation: 'Scotland',
    title: 'Scotland',
    summary:
      'Access rights allow responsible overnight camping in much of open country, with clear duties and local exceptions.',
    rules: [
      'Follow the Scottish Outdoor Access Code: light footprint, short stay, take all waste.',
      'Avoid enclosed fields, historic sites, and ground next to homes or busy paths.',
      'Check local byelaws and temporary restrictions before you go.',
      'Never light open fires on dry peat or fragile ground.',
    ],
    links: [
      {
        label: 'Scottish Outdoor Access Code',
        url: 'https://www.outdooraccess-scotland.scot/',
      },
      {
        label: 'NatureScot — camping',
        url: 'https://www.nature.scot/enjoying-outdoors/responsible-camping',
      },
    ],
  },
  England: {
    nation: 'England',
    title: 'England',
    summary:
      'There is no general right to wild camp. Use established sites, landowner permission, or park-specific schemes where they exist.',
    rules: [
      'Wild camping is not a general right of access in England.',
      'Dartmoor has a separate backpack-camping framework — check the official map and rules.',
      'National parks and estates may ban or limit overnight stays; follow signage and byelaws.',
      'Prefer booked campsites when you need certainty.',
    ],
    links: [
      {
        label: 'Dartmoor backpack camping map',
        url: 'https://www.dartmoor.gov.uk/enjoy-dartmoor/outdoor-activities/camping',
      },
      {
        label: 'National Trust camping guidance',
        url: 'https://www.nationaltrust.org.uk/who-we-are/about-us/camping',
      },
    ],
  },
  Wales: {
    nation: 'Wales',
    title: 'Wales',
    summary:
      'Similar to England: no general wild-camping right. Use campsites or explicit permission, and follow park byelaws.',
    rules: [
      'Do not assume open hillside means overnight camping is allowed.',
      'Check Eryri / Bannau Brycheiniog (and other) park pages for current rules.',
      'Leave no trace; pack out everything you bring.',
    ],
    links: [
      {
        label: 'Eryri National Park',
        url: 'https://snowdonia.gov.wales/',
      },
      {
        label: 'Bannau Brycheiniog National Park',
        url: 'https://www.beacons-npa.gov.uk/',
      },
    ],
  },
  'Northern Ireland': {
    nation: 'Northern Ireland',
    title: 'Northern Ireland',
    summary:
      'Overnight camping needs permission or a campsite. Access and camping rules differ from Scotland.',
    rules: [
      'Ask the landowner or use an established campsite.',
      'Follow Leave No Trace principles on open ground when you do have permission.',
    ],
    links: [
      {
        label: 'Outdoor Recreation NI',
        url: 'https://www.outdoorrecreationni.com/',
      },
    ],
  },
}

export const CAMPING_DISCLAIMER_KEY = 'field-atlas:camping-disclaimer-v1'

export function hasAcceptedCampingDisclaimer() {
  try {
    return localStorage.getItem(CAMPING_DISCLAIMER_KEY) === '1'
  } catch {
    return false
  }
}

export function acceptCampingDisclaimer() {
  try {
    localStorage.setItem(CAMPING_DISCLAIMER_KEY, '1')
  } catch {
    // ignore
  }
}
