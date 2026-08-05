export type Area = {
  slug: string
  name: string
  nation: 'England' | 'Scotland' | 'Wales' | 'Northern Ireland'
  kind: 'National park' | 'Mountain region'
  coords: [number, number]
  color: string
  summary: string
  lists: string[]
  live?: boolean
}

export const areas: Area[] = [
  {
    slug: 'lake-district',
    name: 'Lake District',
    nation: 'England',
    kind: 'National park',
    coords: [-3.1, 54.5],
    color: '#2f6f5e',
    summary:
      'High fells, glacial valleys and the 214 summits described by Alfred Wainwright.',
    lists: ['Wainwrights', 'Birketts', 'Nuttalls'],
    live: true,
  },
  {
    slug: 'peak-district',
    name: 'Peak District',
    nation: 'England',
    kind: 'National park',
    coords: [-1.8, 53.35],
    color: '#8b5a2b',
    summary:
      'Dark gritstone edges in the north and rolling limestone country in the south.',
    lists: ['Ethels', 'County tops'],
  },
  {
    slug: 'yorkshire-dales',
    name: 'Yorkshire Dales',
    nation: 'England',
    kind: 'National park',
    coords: [-2.2, 54.25],
    color: '#3f6d8c',
    summary:
      'Open moorland, limestone scars and the classic Three Peaks landscape.',
    lists: ['Yorkshire Three Peaks', 'Nuttalls'],
  },
  {
    slug: 'north-pennines',
    name: 'North Pennines',
    nation: 'England',
    kind: 'Mountain region',
    coords: [-2.3, 54.75],
    color: '#6b7c3a',
    summary:
      'Broad heather uplands, remote valleys and some of England’s highest ground.',
    lists: ['Pennine Way summits', 'Nuttalls'],
  },
  {
    slug: 'dartmoor',
    name: 'Dartmoor',
    nation: 'England',
    kind: 'National park',
    coords: [-3.9, 50.57],
    color: '#a0673b',
    summary:
      'Granite tors, open moor and England’s distinct backpack-camping landscape.',
    lists: ['Humps', 'Dartmoor tors'],
  },
  {
    slug: 'exmoor',
    name: 'Exmoor',
    nation: 'England',
    kind: 'National park',
    coords: [-3.65, 51.13],
    color: '#3d6b4f',
    summary:
      'High coastal cliffs, wooded combes and quiet open moorland.',
    lists: ['Humps', 'Exmoor summits'],
  },
  {
    slug: 'eryri',
    name: 'Eryri (Snowdonia)',
    nation: 'Wales',
    kind: 'National park',
    coords: [-3.9, 53.07],
    color: '#1f5c7a',
    summary:
      'Sharp ridges, deep cwms and the highest mountains in Wales.',
    lists: ['Welsh 3000s', 'Nuttalls', 'Hewitts'],
  },
  {
    slug: 'bannau-brycheiniog',
    name: 'Bannau Brycheiniog (Brecon Beacons)',
    nation: 'Wales',
    kind: 'National park',
    coords: [-3.43, 51.88],
    color: '#7a4b2e',
    summary:
      'Long sandstone escarpments, waterfalls and broad southern Welsh summits.',
    lists: ['Central Beacons horseshoe', 'Nuttalls'],
  },
  {
    slug: 'cambrian-mountains',
    name: 'Cambrian Mountains',
    nation: 'Wales',
    kind: 'Mountain region',
    coords: [-3.65, 52.35],
    color: '#5c6b3d',
    summary:
      'A quiet central Welsh upland of reservoirs, empty ridges and remote plateaux.',
    lists: ['Hewitts', 'Nuttalls'],
  },
  {
    slug: 'cairngorms',
    name: 'Cairngorms',
    nation: 'Scotland',
    kind: 'National park',
    coords: [-3.65, 57.05],
    color: '#2c5282',
    summary:
      'Britain’s largest high plateau, with severe weather and long mountain days.',
    lists: ['Munros', 'Corbetts'],
  },
  {
    slug: 'northwest-highlands',
    name: 'Northwest Highlands',
    nation: 'Scotland',
    kind: 'Mountain region',
    coords: [-5.3, 57.7],
    color: '#3d5a4c',
    summary:
      'Isolated sandstone peaks, sea lochs and some of Scotland’s wildest approaches.',
    lists: ['Munros', 'Corbetts', 'Grahams'],
  },
  {
    slug: 'loch-lomond-trossachs',
    name: 'Loch Lomond & The Trossachs',
    nation: 'Scotland',
    kind: 'National park',
    coords: [-4.6, 56.2],
    color: '#4f6f52',
    summary:
      'Accessible southern Highlands rising above lochs, forests and long glens.',
    lists: ['Munros', 'Corbetts'],
  },
  {
    slug: 'isle-of-skye',
    name: 'Isle of Skye',
    nation: 'Scotland',
    kind: 'Mountain region',
    coords: [-6.2, 57.3],
    color: '#0d7377',
    summary:
      'The Cuillin’s technical ridges alongside distinctive volcanic and coastal hills.',
    lists: ['Munros', 'Corbetts', 'Red Cuillin'],
  },
  {
    slug: 'southern-uplands',
    name: 'Southern Uplands',
    nation: 'Scotland',
    kind: 'Mountain region',
    coords: [-3.7, 55.45],
    color: '#8a6d3b',
    summary:
      'Rounded but substantial hills spanning Scotland’s quiet southern country.',
    lists: ['Donalds', 'Grahams'],
  },
  {
    slug: 'mourne-mountains',
    name: 'Mourne Mountains',
    nation: 'Northern Ireland',
    kind: 'Mountain region',
    coords: [-6.0, 54.16],
    color: '#5a4a3a',
    summary:
      'Compact granite mountains meeting the Irish Sea around Slieve Donard.',
    lists: ['Dillons', 'Mourne Wall challenge'],
  },
  {
    slug: 'sperrins',
    name: 'Sperrin Mountains',
    nation: 'Northern Ireland',
    kind: 'Mountain region',
    coords: [-7.0, 54.75],
    color: '#3a5a6b',
    summary:
      'Long, quiet ridges and expansive views across Northern Ireland’s northwest.',
    lists: ['Dillons', 'Sperrin summits'],
  },
]
