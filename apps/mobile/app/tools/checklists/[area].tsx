import { useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getAreaPeaks } from '@/src/data/areaPeaks'
import { areas } from '@/src/data/areas'
import { PeaksMapCanvas } from '@/src/components/PeaksMapCanvas'
import { usePeakLogs } from '@/src/lib/peakLogs'
import { colors, fonts, radius, space } from '@/src/theme'

type RateStep = { id: string; step: 'pitch' | 'peak'; pitch?: number }

export default function ChecklistAreaScreen() {
  const insets = useSafeAreaInsets()
  const { area } = useLocalSearchParams<{ area: string }>()
  const slug = typeof area === 'string' ? area : area?.[0] ?? ''
  const peaks = useMemo(() => getAreaPeaks(slug), [slug])
  const title = areas.find((a) => a.slug === slug)?.name ?? slug
  const areaMeta = areas.find((a) => a.slug === slug)
  const { isDone, toggleComplete, loading, logs } = usePeakLogs()
  const [rating, setRating] = useState<RateStep | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const doneCount = peaks.filter((p) => isDone(p.id)).length
  const doneIds = useMemo(() => {
    const set = new Set<string>()
    for (const [id, log] of Object.entries(logs)) {
      if (log.done) set.add(id)
    }
    return set
  }, [logs])

  const saveComplete = async (
    peakId: string,
    pitch: number,
    peakScore: number,
  ) => {
    const peak = peaks.find((p) => p.id === peakId)
    if (!peak) return
    setBusyId(peakId)
    setError('')
    try {
      await toggleComplete(peak, { pitch, peak: peakScore })
      setRating(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <Text style={styles.progress}>
        {title} · {doneCount}/{peaks.length}
      </Text>

      <View style={styles.mapBox}>
        <PeaksMapCanvas
          peaks={peaks}
          selectedId={selectedId}
          doneIds={doneIds}
          onSelect={(id) => {
            setSelectedId(id)
            const peak = peaks.find((p) => p.id === id)
            if (!peak) return
            if (isDone(id)) return
            setRating({ id, step: 'pitch' })
          }}
          center={areaMeta?.coords ?? [-3, 54.5]}
          zoom={8.4}
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accentSoft} style={{ marginTop: 8 }} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={peaks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: space.lg }}
        renderItem={({ item }) => {
          const active = rating?.id === item.id
          return (
            <View style={styles.row}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => setSelectedId(item.id)}
              >
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.height} m</Text>
                {active && rating?.step === 'pitch' ? (
                  <View style={styles.rateBlock}>
                    <Text style={styles.rateLabel}>Pitchability</Text>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Pressable
                          key={score}
                          onPress={() =>
                            setRating({ id: item.id, step: 'peak', pitch: score })
                          }
                        >
                          <Text style={styles.star}>{score}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
                {active && rating?.step === 'peak' ? (
                  <View style={styles.rateBlock}>
                    <Text style={styles.rateLabel}>Your peak rating</Text>
                    <View style={styles.stars}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Pressable
                          key={score}
                          onPress={() => {
                            if (rating.pitch == null) return
                            void saveComplete(item.id, rating.pitch, score)
                          }}
                        >
                          <Text style={styles.star}>{score}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </Pressable>
              <Pressable
                disabled={busyId === item.id}
                onPress={() => {
                  setError('')
                  setSelectedId(item.id)
                  if (isDone(item.id)) {
                    setBusyId(item.id)
                    void toggleComplete(item)
                      .catch((err) =>
                        setError(
                          err instanceof Error ? err.message : 'Could not save',
                        ),
                      )
                      .finally(() => setBusyId(null))
                    return
                  }
                  setRating({ id: item.id, step: 'pitch' })
                }}
                style={[styles.check, isDone(item.id) && styles.checkOn]}
              >
                <Text style={styles.checkLabel}>
                  {isDone(item.id) ? 'Done' : 'Check'}
                </Text>
              </Pressable>
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  progress: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: space.sm,
    paddingHorizontal: space.lg,
  },
  mapBox: {
    height: 220,
    marginHorizontal: space.lg,
    marginBottom: space.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    position: 'relative',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  name: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontWeight: '700',
    textAlign: 'left',
  },
  meta: {
    fontFamily: fonts.sans,
    color: colors.muted,
    marginTop: 2,
    fontSize: 12,
  },
  check: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    minWidth: 72,
    alignItems: 'center',
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkLabel: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  rateBlock: { marginTop: space.sm },
  rateLabel: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 12,
    marginBottom: 6,
  },
  stars: { flexDirection: 'row', gap: 8 },
  star: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    width: 32,
    textAlign: 'center',
  },
  error: {
    marginHorizontal: space.lg,
    marginBottom: space.sm,
    color: colors.danger,
    fontFamily: fonts.sans,
    textAlign: 'center',
  },
})
