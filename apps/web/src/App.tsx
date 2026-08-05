import { areas } from './data/areas'
import { ChecklistAuthGate } from './components/ChecklistAuthGate'
import { MobileAppGate } from './components/MobileAppGate'
import { isMobileDevice } from './lib/device'
import { TrackersDirectoryPage } from './pages/AreaPage'
import { AccountPage } from './pages/AuthPage'
import { SettingsPage } from './pages/SettingsPage'
import { ExplorePage } from './pages/FeedPage'
import { HikeDetailPage } from './pages/HikeDetailPage'
import { HikeFinderPage } from './pages/HikeFinderPage'
import { HikesHubPage } from './pages/HikesHubPage'
import { HomePage } from './pages/HomePage'
import { BothiesPage } from './pages/BothiesPage'
import { CampingMapPage } from './pages/CampingMapPage'
import { MapPage } from './pages/MapPage'
import { PostPage } from './pages/PostPage'
import { queueAuthModal } from './components/AuthModal'
import {
  HomeMockA,
  HomeMockE,
  HomeMockH,
  HomeMockI,
  HomeMockJ,
} from './pages/mockups/HomeMockups'
import {
  ForecastMockA,
  ForecastMockB,
  ForecastMockC,
  ForecastsMockupsGallery,
} from './pages/mockups/ForecastsMockups'
import { MockupsGallery } from './pages/mockups/MockupsGallery'
import { ProfilePage } from './pages/ProfilePage'
import { PublicChecklistPage } from './pages/PublicChecklistPage'
import { TrackerPage } from './pages/TrackerPage'
import { UnfinishedPeaksPage } from './pages/UnfinishedPeaksPage'
import { WeatherPage } from './pages/WeatherPage'
import './App.css'

function redirect(to: string) {
  window.history.replaceState({}, '', to)
  return to
}

function checklistPath(path: string) {
  if (path === '/trackers') return '/checklists'
  if (path.startsWith('/trackers/')) {
    return `/checklists/${path.slice('/trackers/'.length)}`
  }
  return null
}

function App() {
  if (isMobileDevice()) {
    document.documentElement.classList.add('is-mobile-gate')
    return <MobileAppGate />
  }
  document.documentElement.classList.remove('is-mobile-gate')

  let path = window.location.pathname.replace(/\/+$/, '') || '/'

  if (path === '/areas') path = redirect('/checklists')
  if (path.startsWith('/areas/')) {
    path = redirect(`/checklists/${path.slice('/areas/'.length)}`)
  }
  const fromTrackers = checklistPath(path)
  if (fromTrackers && fromTrackers !== path) {
    path = redirect(fromTrackers)
  }
  if (path === '/feed') path = redirect('/explore')
  if (path === '/walkers') path = redirect('/')

  if (path === '/weather') {
    redirect(`/forecasts${window.location.search}`)
    path = '/forecasts'
  }
  if (path === '/camping') {
    redirect(`/pitching${window.location.search}`)
    path = '/pitching'
  }

  if (path === '/map') return <MapPage />
  if (path === '/bothies') return <BothiesPage />
  if (path === '/pitching') return <CampingMapPage />
  if (path === '/forecasts') return <WeatherPage />
  if (path === '/hikes') return <HikesHubPage />
  if (path === '/hikes/generator') return <HikeFinderPage />
  if (path === '/hikes/unfinished') return <UnfinishedPeaksPage />
  if (path.startsWith('/hikes/')) {
    return <HikeDetailPage hikeId={decodeURIComponent(path.slice('/hikes/'.length))} />
  }
  if (path === '/login' || path === '/register') {
    const params = new URLSearchParams(window.location.search)
    const returnTo = params.get('returnTo') || '/account'
    queueAuthModal(path === '/register' ? 'register' : 'login', returnTo)
    const stay =
      returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/'
    path = redirect(stay)
  }
  if (path === '/account/settings') return <SettingsPage />
  if (path === '/account' || path.startsWith('/account/')) {
    const section =
      path === '/account' ? 'overview' : path.slice('/account/'.length)
    if (section === 'settings') return <SettingsPage />
    return <AccountPage section={section} />
  }
  if (path === '/explore') return <ExplorePage />
  if (path.startsWith('/posts/')) {
    return <PostPage postId={decodeURIComponent(path.slice('/posts/'.length))} />
  }
  if (path === '/mockups') return <MockupsGallery />
  if (path === '/mockups/a') return <HomeMockA />
  if (path === '/mockups/e') return <HomeMockE />
  if (path === '/mockups/h') return <HomeMockH />
  if (path === '/mockups/i') return <HomeMockI />
  if (path === '/mockups/j') return <HomeMockJ />
  if (path === '/mockups/forecasts') return <ForecastsMockupsGallery />
  if (path === '/mockups/forecasts/a') return <ForecastMockA />
  if (path === '/mockups/forecasts/b') return <ForecastMockB />
  if (path === '/mockups/forecasts/c') return <ForecastMockC />
  if (path.startsWith('/u/')) {
    const rest = path.slice('/u/'.length)
    const parts = rest.split('/')
    const handle = decodeURIComponent(parts[0] || '')
    if (parts[1] === 'checklists' && parts[2]) {
      return (
        <PublicChecklistPage
          handle={handle}
          areaSlug={decodeURIComponent(parts[2])}
        />
      )
    }
    const section = parts[1]
    return (
      <ProfilePage
        handle={handle}
        section={section}
      />
    )
  }
  if (path === '/checklists') {
    return (
      <ChecklistAuthGate returnTo="/checklists">
        <TrackersDirectoryPage />
      </ChecklistAuthGate>
    )
  }
  if (path === '/lists/wainwrights' || path === '/wainwrights') {
    const area = areas.find((item) => item.slug === 'lake-district')
    return (
      <ChecklistAuthGate returnTo={path}>
        {area ? <TrackerPage area={area} /> : <TrackersDirectoryPage />}
      </ChecklistAuthGate>
    )
  }
  if (path === '/lists/ethels') {
    const area = areas.find((item) => item.slug === 'peak-district')
    return (
      <ChecklistAuthGate returnTo={path}>
        {area ? <TrackerPage area={area} /> : <TrackersDirectoryPage />}
      </ChecklistAuthGate>
    )
  }
  if (path.startsWith('/checklists/')) {
    const area = areas.find((item) => `/checklists/${item.slug}` === path)
    return (
      <ChecklistAuthGate returnTo={path + window.location.search}>
        {area ? <TrackerPage area={area} /> : <TrackersDirectoryPage />}
      </ChecklistAuthGate>
    )
  }

  return <HomePage />
}

export default App
