import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import {
  formatPeakLists,
  getAllAreaPeaks,
  getAreaPeaks,
  type AreaPeak,
} from '@/src/data/areaPeaks'
import { areas } from '@/src/data/areas'
import { PeaksMapCanvas } from '@/src/components/PeaksMapCanvas'
import {
  apiEnabled,
  apiGetPeakRating,
  apiGetPitchability,
} from '@/src/lib/api'
import { usePeakLogs } from '@/src/lib/peakLogs'
import {
  fetchCompactForecast,
  weatherLabel,
  type CompactForecast,
} from '@/src/lib/weather'
import { colors, fonts, radius, space, typography } from '@/src/theme'
import { PrimaryButton } from '@/src/ui'

const ALL_PEAKS = getAllAreaPeaks()
const PRIORITY = new Set([
  'lake-district',
  'peak-district',
  'eryri',
  'northwest-highlands',
])

const FILTERS = [
  { id: 'priority', label: 'Core' },
  { id: 'all', label: 'All UK' },
  ...areas
    .filter((a) => getAreaPeaks(a.slug).length > 0)
    .map((a) => ({ id: a.slug, label: a.name })),
]

type RateStep = 'pitch' | 'peak' | null

export default function MapScreen() {
  const insets = useSafeAreaInsets()
  const { isDone, toggleComplete, areaName, loading, logs } = usePeakLogs()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('priority')
  const [fullReady, setFullReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [rateStep, setRateStep] = useState<RateStep>(null)
  const [pendingPitch, setPendingPitch] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [pitchSummary, setPitchSummary] = useState<{
    average: number
    count: number
    myScore: number | null
  } | null>(null)
  const [peakSummary, setPeakSummary] = useState<{
    average: number
    count: number
    myScore: number | null
  } | null>(null)
  const [forecast, setForecast] = useState<CompactForecast | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setFullReady(true), 900)
    return () => clearTimeout(t)
  }, [])

  const mapPeaks = useMemo(() => {
    if (filter === 'priority') {
      return ALL_PEAKS.filter((p) => PRIORITY.has(p.area))
    }
    if (filter === 'all') {
      return fullReady ? ALL_PEAKS : ALL_PEAKS.filter((p) => PRIORITY.has(p.area))
    }
    return getAreaPeaks(filter)
  }, [filter, fullReady])

  const doneIds = useMemo(() => {
    const set = new Set<string>()
    for (const [id, log] of Object.entries(logs)) {
      if (log.done) set.add(id)
    }
    return set
  }, [logs])

  const filtered = useMemo(() => {
    const pool = mapPeaks
    const q = query.trim().toLowerCase()
    if (!q) {
      return [...pool]
        .sort((a, b) => b.height - a.height)
        .slice(0, 80)
    }
    return pool
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.area.includes(q) ||
          areaName(p.area).toLowerCase().includes(q),
      )
      .sort((a, b) => b.height - a.height)
      .slice(0, 80)
  }, [query, mapPeaks, areaName])

  const selected: AreaPeak | null =
    ALL_PEAKS.find((p) => p.id === selectedId) ?? null

  const mapCenter = useMemo((): [number, number] => {
    const area = areas.find((a) => a.slug === filter)
    return area?.coords ?? [-3.0, 54.5]
  }, [filter])

  const mapZoom = filter === 'all' || filter === 'priority' ? 5.8 : 8.2

  useEffect(() => {
    if (!selectedId || !apiEnabled()) {
      setPitchSummary(null)
      setPeakSummary(null)
      return
    }
    let alive = true
    void Promise.all([
      apiGetPitchability(selectedId).catch(() => null),
      apiGetPeakRating(selectedId).catch(() => null),
    ]).then(([pitch, peak]) => {
      if (!alive) return
      setPitchSummary(pitch)
      setPeakSummary(peak)
    })
    return () => {
      alive = false
    }
  }, [selectedId])

  useEffect(() => {
    if (!selected) {
      setForecast(null)
      return
    }
    let alive = true
    void fetchCompactForecast(selected.coords, selected.height)
      .then((data) => {
        if (alive) setForecast(data)
      })
      .catch(() => {
        if (alive) setForecast(null)
      })
    return () => {
      alive = false
    }
  }, [selected])

  const finishComplete = async (pitch: number, peak: number) => {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      await toggleComplete(selected, { pitch, peak })
      setPitchSummary((current) =>
        current
          ? { ...current, myScore: pitch }
          : { average: pitch, count: 1, myScore: pitch },
      )
      setPeakSummary((current) =>
        current
          ? { ...current, myScore: peak }
          : { average: peak, count: 1, myScore: peak },
      )
      setRateStep(null)
      setPendingPitch(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  const onCheck = async () => {
    if (!selected) return
    setBusy(true)
    setError('')
    try {
      if (isDone(selected.id)) {
        await toggleComplete(selected)
        setRateStep(null)
        setPendingPitch(null)
        return
      }
      setRateStep('pitch')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  const openPeak = (id: string) => {
    setSelectedId(id)
    setRateStep(null)
    setPendingPitch(null)
    setError('')
    setListOpen(false)
  }

  const onFilter = (id: string) => {
    setFilter(id)
    setSelectedId(null)
    const area = areas.find((a) => a.slug === id)
    if (area) {
      // remounting map center happens via key below
    }
  }

  return (
    <View style={styles.root}>
      <PeaksMapCanvas
        peaks={mapPeaks}
        selectedId={selectedId}
        doneIds={doneIds}
        onSelect={openPeak}
        center={mapCenter}
        zoom={mapZoom}
      />

      <View
        style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}
        pointerEvents="box-none"
      >
        <Pressable
          style={styles.chip}
          onPress={() => setListOpen((open) => !open)}
        >
          <Ionicons
            name={listOpen ? 'map-outline' : 'search-outline'}
            size={18}
            color={colors.ink}
          />
          <Text style={styles.chipLabel}>{listOpen ? 'Map' : 'Search'}</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filters, { top: Math.max(insets.top, 12) + 52 }]}
        contentContainerStyle={styles.filtersInner}
      >
        {FILTERS.slice(0, 12).map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onFilter(item.id)}
            style={[
              styles.filterChip,
              filter === item.id && styles.filterChipOn,
            ]}
          >
            <Text
              style={[
                styles.filterLabel,
                filter === item.id && styles.filterLabelOn,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {listOpen ? (
        <View
          style={[
            styles.drawer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search peaks or areas"
            placeholderTextColor={colors.faint}
            style={styles.search}
            autoCorrect={false}
            autoCapitalize="none"
            autoFocus
          />
          {loading ? (
            <ActivityIndicator
              color={colors.accentSoft}
              style={{ marginVertical: 8 }}
            />
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 320 }}
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => openPeak(item.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {areaName(item.area)} · {item.height} m
                  </Text>
                </View>
                <Text
                  style={[styles.badge, isDone(item.id) && styles.badgeDone]}
                >
                  {isDone(item.id) ? 'Done' : ''}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>No peaks match that search.</Text>
            }
          />
        </View>
      ) : null}

      <Modal visible={Boolean(selected)} animationType="slide" transparent>
        <View style={styles.sheetWrap}>
          <Pressable
            style={styles.backdrop}
            onPress={() => setSelectedId(null)}
          />
          <ScrollView
            style={[
              styles.sheet,
              { paddingBottom: Math.max(insets.bottom, 28) },
            ]}
            bounces={false}
          >
            {selected ? (
              <>
                <Text style={styles.sheetEyebrow}>
                  {areaName(selected.area)}
                </Text>
                <Text style={styles.sheetTitle}>{selected.name}</Text>
                <Text style={styles.sheetSub}>
                  {[selected.gridRef, formatPeakLists(selected.lists)]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>

                <View style={styles.stats}>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Height</Text>
                    <Text style={styles.statValue}>{selected.height} m</Text>
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Pitchability</Text>
                    <Text style={styles.statValue}>
                      {pitchSummary && pitchSummary.count > 0
                        ? `${pitchSummary.average.toFixed(1)} / 5`
                        : '—'}
                    </Text>
                    {pitchSummary?.myScore ? (
                      <Text style={styles.statHint}>
                        Yours: {pitchSummary.myScore}/5
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.stat}>
                    <Text style={styles.statLabel}>Peak rating</Text>
                    <Text style={styles.statValue}>
                      {peakSummary && peakSummary.count > 0
                        ? `${peakSummary.average.toFixed(1)} / 5`
                        : '—'}
                    </Text>
                    {peakSummary?.myScore ? (
                      <Text style={styles.statHint}>
                        Yours: {peakSummary.myScore}/5
                      </Text>
                    ) : null}
                  </View>
                </View>

                {forecast ? (
                  <View style={styles.weather}>
                    <Text style={styles.weatherTitle}>
                      {weatherLabel(forecast.weatherCode)} · {forecast.temperature}
                      °C
                    </Text>
                    <Text style={styles.weatherMeta}>
                      Wind {forecast.windSpeed} mph (gusts {forecast.windGusts}) ·
                      cloud {forecast.cloudCover}%
                    </Text>
                  </View>
                ) : null}

                {rateStep === 'pitch' ? (
                  <View style={styles.starsBlock}>
                    <Text style={styles.starsLabel}>
                      How pitchable is this peak?
                    </Text>
                    <Text style={styles.starsHint}>
                      Rate the summit ground for an overnight pitch.
                    </Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Pressable
                          key={score}
                          disabled={busy}
                          onPress={() => {
                            setPendingPitch(score)
                            setRateStep('peak')
                          }}
                          style={styles.star}
                        >
                          <Text style={styles.starText}>★</Text>
                          <Text style={styles.starNum}>{score}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : rateStep === 'peak' ? (
                  <View style={styles.starsBlock}>
                    <Text style={styles.starsLabel}>Rate this peak</Text>
                    <Text style={styles.starsHint}>
                      Your overall rating for the summit day.
                    </Text>
                    <View style={styles.starRow}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Pressable
                          key={score}
                          disabled={busy}
                          onPress={() => {
                            if (pendingPitch == null) return
                            void finishComplete(pendingPitch, score)
                          }}
                          style={styles.star}
                        >
                          <Text style={styles.starText}>★</Text>
                          <Text style={styles.starNum}>{score}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : (
                  <PrimaryButton
                    label={
                      busy
                        ? 'Saving…'
                        : isDone(selected.id)
                          ? 'Mark as not completed'
                          : 'Mark as completed'
                    }
                    onPress={() => void onCheck()}
                    busy={busy}
                  />
                )}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                  onPress={() => setSelectedId(null)}
                  style={styles.close}
                >
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(14, 17, 12, 0.9)',
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipLabel: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontWeight: '600',
    fontSize: 14,
  },
  filters: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 5,
    maxHeight: 44,
  },
  filtersInner: {
    paddingHorizontal: space.lg,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: 'rgba(14, 17, 12, 0.88)',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipOn: {
    borderColor: colors.accentSoft,
    backgroundColor: 'rgba(47, 111, 94, 0.45)',
  },
  filterLabel: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  filterLabelOn: { color: colors.ink },
  drawer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 6,
    maxHeight: '55%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: space.md,
  },
  search: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: space.lg,
    fontFamily: fonts.sans,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    gap: space.md,
  },
  name: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontWeight: '600',
    fontSize: 16,
  },
  meta: {
    fontFamily: fonts.sans,
    color: colors.muted,
    marginTop: 3,
    fontSize: 13,
  },
  badge: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontWeight: '600',
    fontSize: 12,
  },
  badgeDone: { color: colors.hiking },
  empty: {
    padding: space.xl,
    color: colors.muted,
    fontFamily: fonts.sans,
    textAlign: 'center',
  },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.surfaceSolid,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
  },
  sheetEyebrow: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'center',
  },
  sheetTitle: {
    ...typography.title,
    fontSize: 28,
    color: colors.ink,
    textAlign: 'center',
  },
  sheetSub: {
    marginTop: 8,
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  stat: { flex: 1, alignItems: 'center' },
  statLabel: {
    fontFamily: fonts.sans,
    color: colors.faint,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontFamily: fonts.display,
    color: colors.ink,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statHint: {
    marginTop: 4,
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
  },
  weather: {
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.line,
  },
  weatherTitle: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
  weatherMeta: {
    marginTop: 4,
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
  },
  starsBlock: { marginTop: space.lg, gap: space.sm },
  starsLabel: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center',
  },
  starsHint: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: space.sm,
    textAlign: 'center',
  },
  starRow: { flexDirection: 'row', gap: space.sm },
  star: {
    flex: 1,
    minHeight: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  starText: { color: colors.camping, fontSize: 18 },
  starNum: {
    fontFamily: fonts.sans,
    color: colors.inkSoft,
    fontSize: 12,
    fontWeight: '600',
  },
  error: {
    marginTop: space.md,
    color: colors.danger,
    fontFamily: fonts.sans,
    textAlign: 'center',
  },
  close: { marginTop: space.lg, alignItems: 'center', paddingVertical: 8 },
  closeText: {
    color: colors.muted,
    fontWeight: '600',
    fontFamily: fonts.sans,
    fontSize: 15,
  },
})
