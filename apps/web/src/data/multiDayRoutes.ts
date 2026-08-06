import { areas } from './areas'
import { getAllAreaPeaks, getPeakById, type AreaPeak } from './areaPeaks'
import {
  multiDayRouteGeometry,
  type RouteCoord,
} from './multiDayRouteGeometry'

export type { RouteCoord }

export type MultiDayRoute = {
  id: string
  name: string
  summary: string
  nation: 'England' | 'Scotland' | 'Wales' | 'England & Scotland' | 'England & Wales'
  distanceKm: number
  /** Typical walking days for most people. */
  durationDays: { min: number; max: number }
  ascentM?: number
  start: string
  finish: string
  areaSlugs: string[]
  /** Peak IDs from Field Atlas that the trail passes near or optionally bags. */
  peakIds: string[]
  /** OSM relation id — browser fetches real path-following geometry. */
  osmRelationId?: number
  /** Key places / forts / stages along the trail (non-summit landmarks). */
  places?: { name: string; note?: string }[]
  /** Simplified trail polyline — indicative corridor, not a GPS track. */
  route: RouteCoord[]
  links?: { label: string; url: string }[]
}

type MultiDayRouteMeta = Omit<MultiDayRoute, 'route'>

const multiDayRouteMeta: MultiDayRouteMeta[] = [
  {
    id: 'west-highland-way',
    name: 'West Highland Way',
    summary:
      'Scotland’s best-known long-distance path: loch shores, Highland glens and a finish beneath Ben Nevis.',
    nation: 'Scotland',
    distanceKm: 154,
    durationDays: { min: 5, max: 8 },
    ascentM: 3150,
    start: 'Milngavie',
    finish: 'Fort William',
    osmRelationId: 16287,
    areaSlugs: ['loch-lomond-trossachs', 'northwest-highlands'],
    peakIds: [
      'dobih-64', // Conic Hill
      'dobih-32', // Ben Lomond (optional)
      'dobih-79', // The Cobbler (optional)
      'dobih-196', // Buachaille Etive Mor
    ],
    places: [
      { name: 'Milngavie', note: 'Official start at the obelisk' },
      { name: 'Drymen', note: 'Gateway to Loch Lomond' },
      { name: 'Rowardennan', note: 'East shore of the loch' },
      { name: 'Tyndrum', note: 'Halfway hub in Strath Fillan' },
      { name: 'Bridge of Orchy', note: 'Into Rannoch Moor' },
      { name: 'Kingshouse', note: 'Glencoe approaches' },
      { name: 'Kinlochleven', note: 'After the Devil’s Staircase' },
      { name: 'Fort William', note: 'Finish beneath Ben Nevis' },
    ],
    links: [
      {
        label: 'West Highland Way official',
        url: 'https://www.westhighlandway.org/',
      },
    ],
  },
  {
    id: 'skye-trail',
    name: 'Skye Trail',
    summary:
      'A wild island traverse from Rubha Hunish to Broadford, with the Trotternish Ridge and Cuillin skylines.',
    nation: 'Scotland',
    distanceKm: 128,
    durationDays: { min: 6, max: 8 },
    ascentM: 4500,
    start: 'Rubha Hunish',
    finish: 'Broadford',
    osmRelationId: 14421894,
    areaSlugs: ['isle-of-skye'],
    peakIds: [
      'dobih-1218', // The Storr
      'dobih-1263', // Glamaig
      'dobih-1264', // Marsco
      'dobih-1255', // Bla Bheinn
    ],
    places: [
      { name: 'Rubha Hunish', note: 'Northern tip of Skye' },
      { name: 'Quiraing', note: 'Trotternish landslip' },
      { name: 'The Storr', note: 'Old Man of Storr skyline' },
      { name: 'Portree', note: 'Main island hub' },
      { name: 'Sligachan', note: 'Cuillin gateway' },
      { name: 'Elgol', note: 'Coast path to Loch Scavaig' },
      { name: 'Broadford', note: 'Southern finish' },
    ],
    links: [
      {
        label: 'Walkhighlands — Skye Trail',
        url: 'https://www.walkhighlands.co.uk/skye/skye-trail.shtml',
      },
    ],
  },
  {
    id: 'coast-to-coast',
    name: 'Coast to Coast',
    summary:
      'Wainwright’s classic crossing from the Irish Sea to the North Sea — Lakes, Dales and North York Moors.',
    nation: 'England',
    distanceKm: 306,
    durationDays: { min: 12, max: 16 },
    ascentM: 7800,
    start: 'St Bees',
    finish: "Robin Hood's Bay",
    osmRelationId: 16755331,
    areaSlugs: ['lake-district', 'yorkshire-dales', 'north-pennines'],
    peakIds: [
      'dobih-2367', // Great Gable (near Ennerdale)
      'dobih-2528', // High Street
      'dobih-2745', // Nine Standards Rigg
    ],
    places: [
      { name: 'St Bees', note: 'Irish Sea start' },
      { name: 'Ennerdale', note: 'Into the Lakes' },
      { name: 'Grasmere', note: 'Central Lakes' },
      { name: 'Patterdale', note: 'Before High Street' },
      { name: 'Kirkby Stephen', note: 'Into the Dales' },
      { name: 'Richmond', note: 'Swaledale finish into Vale of Mowbray' },
      { name: "Robin Hood's Bay", note: 'North Sea finish' },
    ],
    links: [
      {
        label: 'Coast to Coast National Trail',
        url: 'https://www.nationaltrail.co.uk/en_GB/trails/coast-to-coast/',
      },
    ],
  },
  {
    id: 'pennine-way',
    name: 'Pennine Way',
    summary:
      'Britain’s original National Trail — Edale to Kirk Yetholm across peat, gritstone and high Pennine country.',
    nation: 'England & Scotland',
    distanceKm: 431,
    durationDays: { min: 16, max: 21 },
    ascentM: 11000,
    start: 'Edale',
    finish: 'Kirk Yetholm',
    osmRelationId: 4080347,
    areaSlugs: [
      'peak-district',
      'yorkshire-dales',
      'north-pennines',
      'southern-uplands',
    ],
    peakIds: [
      'ethel-001', // Kinder Scout
      'dobih-2783', // Pen-y-ghent
      'dobih-2707', // Cross Fell
      'dobih-2708', // Great Dun Fell
    ],
    places: [
      { name: 'Edale', note: 'Official start in the Peak District' },
      { name: 'Malham', note: 'Limestone & Cove' },
      { name: 'Horton-in-Ribblesdale', note: 'Three Peaks country' },
      { name: 'Tan Hill', note: 'Britain’s highest pub' },
      { name: 'Dufton', note: 'Before Cross Fell' },
      { name: 'Hadrian’s Wall', note: 'Crosses the Wall near Greenhead' },
      { name: 'Kirk Yetholm', note: 'Scottish Borders finish' },
    ],
    links: [
      {
        label: 'Pennine Way National Trail',
        url: 'https://www.nationaltrail.co.uk/en_GB/trails/pennine-way/',
      },
    ],
  },
  {
    id: 'great-glen-way',
    name: 'Great Glen Way',
    summary:
      'A Highland traverse along the Caledonian Canal and loch shores from Fort William to Inverness.',
    nation: 'Scotland',
    distanceKm: 125,
    durationDays: { min: 4, max: 6 },
    ascentM: 1800,
    start: 'Fort William',
    finish: 'Inverness',
    osmRelationId: 126572,
    areaSlugs: ['northwest-highlands'],
    peakIds: [],
    places: [
      { name: 'Fort William', note: 'Southern start' },
      { name: 'Gairlochy', note: 'Caledonian Canal' },
      { name: 'Fort Augustus', note: 'Mid-glen hub' },
      { name: 'Invermoriston', note: 'Loch Ness shore' },
      { name: 'Drumnadrochit', note: 'Urquhart Castle country' },
      { name: 'Inverness', note: 'Highland capital finish' },
    ],
    links: [
      {
        label: 'Great Glen Way',
        url: 'https://www.highland.gov.uk/greatglenway/',
      },
    ],
  },
  {
    id: 'southern-upland-way',
    name: 'Southern Upland Way',
    summary:
      'Coast to coast across Scotland’s quiet southern hills — remote, long and often lonely.',
    nation: 'Scotland',
    distanceKm: 344,
    durationDays: { min: 12, max: 16 },
    ascentM: 9200,
    start: 'Portpatrick',
    finish: 'Cockburnspath',
    osmRelationId: 4736666,
    areaSlugs: ['southern-uplands'],
    peakIds: [
      'dobih-1699', // Cairnsmore of Fleet
      'dobih-1830', // Broad Law
    ],
    places: [
      { name: 'Portpatrick', note: 'West coast start' },
      { name: 'Bargrennan', note: 'Galloway Forest' },
      { name: 'Sanquhar', note: 'Mid-route town' },
      { name: 'Wanlockhead', note: 'Scotland’s highest village' },
      { name: 'Melrose', note: 'Abbey town' },
      { name: 'Cockburnspath', note: 'East coast finish' },
    ],
    links: [
      {
        label: 'Southern Upland Way',
        url: 'https://dgtrails.org/southern-upland-way/',
      },
    ],
  },
  {
    id: 'speyside-way',
    name: 'Speyside Way',
    summary:
      'Whisky country walking from Buckie to Aviemore along the River Spey and into the Cairngorms fringe.',
    nation: 'Scotland',
    distanceKm: 105,
    durationDays: { min: 4, max: 6 },
    ascentM: 1400,
    start: 'Buckie',
    finish: 'Aviemore',
    osmRelationId: 1026251,
    areaSlugs: ['cairngorms'],
    peakIds: [],
    places: [
      { name: 'Buckie', note: 'Moray Firth start' },
      { name: 'Fochabers', note: 'Onto the Spey' },
      { name: 'Craigellachie', note: 'Whisky heartland' },
      { name: 'Ballindalloch', note: 'Castle & river' },
      { name: 'Grantown-on-Spey', note: 'Cairngorms fringe' },
      { name: 'Aviemore', note: 'Mountain-town finish' },
    ],
    links: [
      {
        label: 'Speyside Way',
        url: 'https://www.speysideway.org/',
      },
    ],
  },
  {
    id: 'hadrians-wall-path',
    name: "Hadrian's Wall Path",
    summary:
      'Wallsend to Bowness-on-Solway along Rome’s northern frontier — city stretches, then the famous Whin Sill crags around Housesteads and Steel Rigg, finishing on the Solway shore.',
    nation: 'England',
    distanceKm: 135,
    durationDays: { min: 6, max: 8 },
    ascentM: 2200,
    start: 'Wallsend',
    finish: 'Bowness-on-Solway',
    osmRelationId: 38791,
    areaSlugs: [],
    peakIds: [],
    places: [
      { name: 'Segedunum', note: 'Start at Wallsend fort & museum' },
      { name: 'Newcastle Quayside', note: 'Urban Tyne section' },
      { name: 'Heddon-on-the-Wall', note: 'First long stretch of standing wall' },
      { name: 'Chesters', note: 'Cavalry fort by the North Tyne' },
      { name: 'Housesteads', note: 'Best-preserved fort on the Wall' },
      { name: 'Sycamore Gap / Steel Rigg', note: 'Classic Whin Sill crags' },
      { name: 'Birdoswald', note: 'Turf wall meets stone wall' },
      { name: 'Carlisle', note: 'Gateway to the Solway' },
      { name: 'Bowness-on-Solway', note: 'Western terminus on the shore' },
    ],
    links: [
      {
        label: "Hadrian's Wall Path",
        url: 'https://www.nationaltrail.co.uk/en_GB/trails/hadrians-wall-path/',
      },
    ],
  },
  {
    id: 'offas-dyke-path',
    name: "Offa's Dyke Path",
    summary:
      'Border walking from Chepstow to Prestatyn along the earthwork that once marked England and Wales.',
    nation: 'England & Wales',
    distanceKm: 285,
    durationDays: { min: 12, max: 14 },
    ascentM: 9000,
    start: 'Chepstow',
    finish: 'Prestatyn',
    osmRelationId: 9649,
    areaSlugs: ['bannau-brycheiniog', 'cambrian-mountains', 'eryri'],
    peakIds: [],
    places: [
      { name: 'Chepstow', note: 'Severn start' },
      { name: 'Monmouth', note: 'Wye Valley' },
      { name: 'Hay-on-Wye', note: 'Book town on the border' },
      { name: 'Knighton', note: 'Mid-Wales hub' },
      { name: 'Welshpool', note: 'Severn valley' },
      { name: 'Llangollen', note: 'Dee valley' },
      { name: 'Prestatyn', note: 'North Wales coast finish' },
    ],
    links: [
      {
        label: "Offa's Dyke Path",
        url: 'https://www.nationaltrail.co.uk/en_GB/trails/offas-dyke-path/',
      },
    ],
  },
  {
    id: 'dales-way',
    name: 'Dales Way',
    summary:
      'A riverside and dale-country walk from Ilkley to Windermere — gentler than the Pennine giants.',
    nation: 'England',
    distanceKm: 130,
    durationDays: { min: 6, max: 8 },
    ascentM: 2100,
    start: 'Ilkley',
    finish: 'Bowness-on-Windermere',
    osmRelationId: 29302,
    areaSlugs: ['yorkshire-dales', 'lake-district'],
    peakIds: [],
    places: [
      { name: 'Ilkley', note: 'Wharfedale start' },
      { name: 'Burnsall', note: 'Classic Dales village' },
      { name: 'Buckden', note: 'Upper Wharfedale' },
      { name: 'Sedbergh', note: 'Howgill foothills' },
      { name: 'Burneside', note: 'Into Lakeland' },
      { name: 'Bowness-on-Windermere', note: 'Lakes finish' },
    ],
    links: [
      {
        label: 'Dales Way Association',
        url: 'https://www.dalesway.org.uk/',
      },
    ],
  },
  {
    id: 'cleveland-way',
    name: 'Cleveland Way',
    summary:
      'Horseshoe of the North York Moors — inland escarpment, then a dramatic North Sea coastal finish.',
    nation: 'England',
    distanceKm: 175,
    durationDays: { min: 8, max: 10 },
    ascentM: 5500,
    start: 'Helmsley',
    finish: 'Filey Brigg',
    osmRelationId: 31112,
    areaSlugs: [],
    peakIds: [],
    places: [
      { name: 'Helmsley', note: 'Inland start' },
      { name: 'Sutton Bank', note: 'Moors escarpment' },
      { name: 'Osmotherley', note: 'Onto the Cleveland Hills' },
      { name: 'Saltburn', note: 'Where the trail hits the sea' },
      { name: 'Whitby', note: 'Abbey & harbour' },
      { name: 'Scarborough', note: 'Coastal resort' },
      { name: 'Filey Brigg', note: 'Eastern tip finish' },
    ],
    links: [
      {
        label: 'Cleveland Way',
        url: 'https://www.nationaltrail.co.uk/en_GB/trails/cleveland-way/',
      },
    ],
  },
  {
    id: 'pembrokeshire-coast-path',
    name: 'Pembrokeshire Coast Path',
    summary:
      'Cliff-top National Trail around Wales’ southwestern peninsula — beaches, headlands and endless sea views.',
    nation: 'Wales',
    distanceKm: 300,
    durationDays: { min: 12, max: 15 },
    ascentM: 10500,
    start: 'Amroth',
    finish: 'St Dogmaels',
    osmRelationId: 77964,
    areaSlugs: [],
    peakIds: [],
    places: [
      { name: 'Amroth', note: 'Southern start' },
      { name: 'Tenby', note: 'Harbour town' },
      { name: 'Stackpole', note: 'Cliffs & beaches' },
      { name: 'St Davids', note: 'Britain’s smallest city' },
      { name: 'Fishguard', note: 'North coast turn' },
      { name: 'Newport', note: 'Nevern estuary' },
      { name: 'St Dogmaels', note: 'Teifi finish' },
    ],
    links: [
      {
        label: 'Pembrokeshire Coast Path',
        url: 'https://www.nationaltrail.co.uk/en_GB/trails/pembrokeshire-coast-path/',
      },
    ],
  },
  {
    id: 'yorkshire-three-peaks',
    name: 'Yorkshire Three Peaks',
    summary:
      'The classic challenge linking Pen-y-ghent, Whernside and Ingleborough — often done in a day, but a superb overnight too.',
    nation: 'England',
    distanceKm: 39,
    durationDays: { min: 1, max: 2 },
    ascentM: 1600,
    start: 'Horton-in-Ribblesdale',
    finish: 'Horton-in-Ribblesdale',
    osmRelationId: 5671418,
    areaSlugs: ['yorkshire-dales'],
    peakIds: ['dobih-2783', 'dobih-2779', 'dobih-2780'],
    places: [
      { name: 'Horton-in-Ribblesdale', note: 'Usual start and finish' },
      { name: 'Pen-y-ghent', note: 'First peak' },
      { name: 'Whernside', note: 'Highest of the three' },
      { name: 'Ingleborough', note: 'Final summit before the return' },
    ],
    links: [
      {
        label: 'Yorkshire Dales — Three Peaks',
        url: 'https://www.yorkshiredales.org.uk/things-to-do/get-out-more/walking/three-peaks/',
      },
    ],
  },
  {
    id: 'south-west-coast-path',
    name: 'South West Coast Path',
    summary:
      'England’s longest National Trail — Minehead to Poole Harbour around the south-west peninsula, with endless cliff-top walking.',
    nation: 'England',
    distanceKm: 1014,
    durationDays: { min: 30, max: 52 },
    ascentM: 35000,
    start: 'Minehead',
    finish: 'Poole Harbour',
    osmRelationId: 2376086,
    areaSlugs: ['exmoor', 'dartmoor'],
    peakIds: [],
    places: [
      { name: 'Minehead', note: 'Somerset start' },
      { name: 'Ilfracombe / Hartland', note: 'North Devon coast' },
      { name: 'Padstow / St Ives', note: 'North Cornwall' },
      { name: "Land's End", note: 'Western tip of England' },
      { name: 'Plymouth', note: 'Into South Devon' },
      { name: 'Lyme Regis', note: 'Jurassic Coast' },
      { name: 'Poole Harbour', note: 'Dorset finish' },
    ],
    links: [
      {
        label: 'South West Coast Path',
        url: 'https://www.nationaltrail.co.uk/en_GB/trails/south-west-coast-path/',
      },
    ],
  },
  {
    id: 'cape-wrath-trail',
    name: 'Cape Wrath Trail',
    summary:
      'An unmarked wild traverse of the north-west Highlands from Fort William to Cape Wrath — remote, pathless stretches and serious navigation.',
    nation: 'Scotland',
    distanceKm: 370,
    durationDays: { min: 14, max: 21 },
    ascentM: 14000,
    start: 'Fort William',
    finish: 'Cape Wrath',
    osmRelationId: 9327615,
    areaSlugs: ['northwest-highlands'],
    peakIds: [],
    places: [
      { name: 'Fort William', note: 'Usual southern start' },
      { name: 'Knoydart', note: 'Wild peninsula country' },
      { name: 'Torridon', note: 'Sandstone peaks & lochs' },
      { name: 'Assynt', note: 'Isolated summits' },
      { name: 'Cape Wrath', note: 'North-west tip of mainland Britain' },
    ],
    links: [
      {
        label: 'Walkhighlands — Cape Wrath Trail',
        url: 'https://www.walkhighlands.co.uk/fortwilliam/cape-wrath-trail.shtml',
      },
    ],
  },
  {
    id: 'south-downs-way',
    name: 'South Downs Way',
    summary:
      'Chalk ridge National Trail from Winchester to Eastbourne — big skies, dry valleys and a finish above the Seven Sisters.',
    nation: 'England',
    distanceKm: 160,
    durationDays: { min: 8, max: 10 },
    ascentM: 4150,
    start: 'Winchester',
    finish: 'Eastbourne',
    osmRelationId: 77976,
    areaSlugs: [],
    peakIds: [],
    places: [
      { name: 'Winchester', note: 'Cathedral city start' },
      { name: 'Petersfield / South Harting', note: 'West Sussex downs' },
      { name: 'Amberley', note: 'Arun gap' },
      { name: 'Devil’s Dyke', note: 'Near Brighton' },
      { name: 'Alfriston', note: 'Cuckmere valley' },
      { name: 'Eastbourne', note: 'Seven Sisters finish' },
    ],
    links: [
      {
        label: 'South Downs Way',
        url: 'https://www.nationaltrail.co.uk/en_GB/trails/south-downs-way/',
      },
    ],
  },
  {
    id: 'cotswold-way',
    name: 'Cotswold Way',
    summary:
      'Escarpment National Trail from Chipping Campden to Bath — honey-stone villages and long views over the Severn Vale.',
    nation: 'England',
    distanceKm: 164,
    durationDays: { min: 7, max: 10 },
    ascentM: 4500,
    start: 'Chipping Campden',
    finish: 'Bath',
    osmRelationId: 65239,
    areaSlugs: [],
    peakIds: [],
    places: [
      { name: 'Chipping Campden', note: 'Northern start' },
      { name: 'Broadway / Cleeve Hill', note: 'Highest Cotswold ground' },
      { name: 'Cheltenham approaches', note: 'Escarpment edge' },
      { name: 'Painswick', note: 'Classic Cotswold village' },
      { name: 'Bath', note: 'World Heritage finish' },
    ],
    links: [
      {
        label: 'Cotswold Way',
        url: 'https://www.nationaltrail.co.uk/en_GB/trails/cotswold-way/',
      },
    ],
  },
  {
    id: 'john-muir-way',
    name: 'John Muir Way',
    summary:
      'Coast-to-coast Great Trail across Scotland’s central belt from Helensburgh to Dunbar — named for the Dunbar-born conservationist.',
    nation: 'Scotland',
    distanceKm: 215,
    durationDays: { min: 8, max: 12 },
    ascentM: 2800,
    start: 'Helensburgh',
    finish: 'Dunbar',
    osmRelationId: 49215,
    areaSlugs: ['loch-lomond-trossachs'],
    peakIds: [],
    places: [
      { name: 'Helensburgh', note: 'Clyde start' },
      { name: 'Balloch', note: 'Loch Lomond' },
      { name: 'Falkirk', note: 'Kelpies & canals' },
      { name: 'Edinburgh', note: 'Capital stretch' },
      { name: 'Dunbar', note: 'John Muir’s birthplace' },
    ],
    links: [
      {
        label: 'John Muir Way',
        url: 'https://johnmuirway.org/',
      },
    ],
  },
  {
    id: 'rob-roy-way',
    name: 'Rob Roy Way',
    summary:
      'Highland glens and loch-side walking from Drymen to Pitlochry, following paths linked with Rob Roy MacGregor country.',
    nation: 'Scotland',
    distanceKm: 127,
    durationDays: { min: 5, max: 8 },
    ascentM: 3200,
    start: 'Drymen',
    finish: 'Pitlochry',
    osmRelationId: 189465,
    areaSlugs: ['loch-lomond-trossachs'],
    peakIds: [],
    places: [
      { name: 'Drymen', note: 'Shared WHW country' },
      { name: 'Aberfoyle', note: 'Trossachs' },
      { name: 'Callander', note: 'Rob Roy visitor hub' },
      { name: 'Killin', note: 'Falls of Dochart' },
      { name: 'Pitlochry', note: 'Highland finish' },
    ],
    links: [
      {
        label: 'Rob Roy Way',
        url: 'https://www.robroyway.com/',
      },
    ],
  },
  {
    id: 'affric-kintail-way',
    name: 'Affric Kintail Way',
    summary:
      'A wild west Highland traverse from Drumnadrochit to Morvich through Glen Affric — forests, lochs and high mountain passes.',
    nation: 'Scotland',
    distanceKm: 71,
    durationDays: { min: 3, max: 5 },
    ascentM: 1800,
    start: 'Drumnadrochit',
    finish: 'Morvich',
    osmRelationId: 12812573,
    areaSlugs: ['northwest-highlands'],
    peakIds: [],
    places: [
      { name: 'Drumnadrochit', note: 'Loch Ness start' },
      { name: 'Cannich', note: 'Into Strathglass' },
      { name: 'Glen Affric', note: 'Caledonian pinewoods' },
      { name: 'Kintail', note: 'Western mountains' },
      { name: 'Morvich', note: 'Sea loch finish' },
    ],
    links: [
      {
        label: 'Walkhighlands — Affric Kintail Way',
        url: 'https://www.walkhighlands.co.uk/lochness/affric-kintail-way.shtml',
      },
    ],
  },
  {
    id: 'welsh-3000s',
    name: 'Welsh 3000s',
    summary:
      'South-to-north traverse of every Welsh 3,000 ft summit: Snowdon massif, Glyderau, then the Carneddau to Foel-fras. Often split over 2–3 days.',
    nation: 'Wales',
    distanceKm: 45,
    durationDays: { min: 1, max: 3 },
    ascentM: 4000,
    start: 'Pen y Pass',
    finish: 'Foel-fras',
    areaSlugs: ['eryri'],
    peakIds: [
      'dobih-1976', // Crib Goch
      'dobih-1964', // Crib y Ddysgl
      'dobih-1963', // Yr Wyddfa
      'dobih-1975', // Elidir Fawr
      'dobih-1972', // Y Garn
      'dobih-1967', // Glyder Fawr
      'dobih-1968', // Glyder Fach
      'dobih-1977', // Tryfan
      'dobih-1969', // Pen yr Ole Wen
      'dobih-1966', // Carnedd Dafydd
      'dobih-1965', // Carnedd Llewelyn
      'dobih-1971', // Yr Elen
      'dobih-1970', // Foel Grach
      'dobih-1974', // Garnedd Uchaf
      'dobih-1973', // Foel-fras
    ],
    places: [
      { name: 'Pen y Pass', note: 'Usual southern start' },
      { name: 'Snowdon massif', note: 'Crib Goch → Yr Wyddfa' },
      { name: 'Nant Peris', note: 'Valley link to the Glyderau' },
      { name: 'Glyderau & Tryfan', note: 'Central rocky section' },
      { name: 'Ogwen', note: 'Before the Carneddau' },
      { name: 'Carneddau', note: 'Finish on Foel-fras' },
    ],
    links: [
      {
        label: 'Welsh 3000s route guide (LFTO)',
        url: 'https://www.livefortheoutdoors.com/routes/hiking/how-to-walk-the-welsh-3000s/',
      },
      {
        label: 'AllTrails — Welsh 3000s',
        url: 'https://www.alltrails.com/trail/wales/gwynedd/welsh-3000-challenge-pen-y-pass-to-llanfairfechan',
      },
    ],
  },
]

export const multiDayRoutes: MultiDayRoute[] = multiDayRouteMeta.map(
  (meta) => ({
    ...meta,
    route: multiDayRouteGeometry[meta.id] ?? [],
  }),
)

export function getMultiDayRoute(id: string) {
  return multiDayRoutes.find((route) => route.id === id) ?? null
}

export function formatDurationDays(route: MultiDayRoute) {
  const { min, max } = route.durationDays
  if (min === max) return min === 1 ? '1 day' : `${min} days`
  return `${min}–${max} days`
}

export function routeAreas(route: MultiDayRoute) {
  return route.areaSlugs
    .map((slug) => areas.find((area) => area.slug === slug))
    .filter((area): area is (typeof areas)[number] => Boolean(area))
}

export function routePeaks(route: MultiDayRoute): AreaPeak[] {
  return route.peakIds
    .map((id) => getPeakById(id))
    .filter((peak): peak is AreaPeak => Boolean(peak))
}

export function searchMultiDayRoutes(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return multiDayRoutes
  return multiDayRoutes.filter((route) => {
    if (route.name.toLowerCase().includes(q)) return true
    if (route.nation.toLowerCase().includes(q)) return true
    if (route.start.toLowerCase().includes(q)) return true
    if (route.finish.toLowerCase().includes(q)) return true
    if (route.summary.toLowerCase().includes(q)) return true
    return routeAreas(route).some((area) =>
      area.name.toLowerCase().includes(q),
    )
  })
}

/** Peaks near the route corridor (for map context beyond curated highlights). */
export function peaksNearRoute(route: MultiDayRoute, maxCount = 24): AreaPeak[] {
  const highlighted = new Set(route.peakIds)
  const fromIds = routePeaks(route)
  if (fromIds.length >= maxCount) return fromIds.slice(0, maxCount)

  const samples = sampleRoute(route.route, 12)
  const candidates = getAllAreaPeaks()
    .filter((peak) => !highlighted.has(peak.id))
    .map((peak) => {
      let best = Infinity
      for (const point of samples) {
        const d = haversineKm(point, peak.coords)
        if (d < best) best = d
      }
      return { peak, dist: best }
    })
    .filter(({ dist }) => dist <= 8)
    .sort((a, b) => a.dist - b.dist || b.peak.height - a.peak.height)

  const extras = candidates.slice(0, maxCount - fromIds.length).map((c) => c.peak)
  return [...fromIds, ...extras]
}

function sampleRoute(route: RouteCoord[], count: number): RouteCoord[] {
  if (route.length <= count) return route
  const step = (route.length - 1) / (count - 1)
  const out: RouteCoord[] = []
  for (let i = 0; i < count; i += 1) {
    const idx = Math.round(i * step)
    out.push(route[idx]!)
  }
  return out
}

function haversineKm(a: RouteCoord, b: RouteCoord) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
