import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getAllAreaPeaks } from '@/src/data/areaPeaks'
import { areas } from '@/src/data/areas'
import {
  fetchCompactForecast,
  weatherLabel,
  type CompactForecast,
} from '@/src/lib/weather'
import { colors, fonts, radius, space } from '@/src/theme'

const ALL = getAllAreaPeaks()

export default function ForecastsToolScreen() {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [forecast, setForecast] = useState<CompactForecast | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 2) return []
    return ALL.filter((p) => p.name.toLowerCase().includes(q))
      .sort((a, b) => b.height - a.height)
      .slice(0, 40)
  }, [query])

  const selected = ALL.find((p) => p.id === selectedId) ?? null

  const load = async (id: string) => {
    const peak = ALL.find((p) => p.id === id)
    if (!peak) return
    setSelectedId(id)
    setBusy(true)
    setError('')
    setForecast(null)
    try {
      setForecast(await fetchCompactForecast(peak.coords, peak.height))
    } catch {
      setError('Could not load weather for this summit.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search a summit"
        placeholderTextColor={colors.faint}
        style={styles.search}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {selected && forecast ? (
        <View style={styles.card}>
          <Text style={styles.peak}>{selected.name}</Text>
          <Text style={styles.meta}>
            {areas.find((a) => a.slug === selected.area)?.name ?? selected.area} ·{' '}
            {selected.height} m
          </Text>
          <Text style={styles.temp}>
            {weatherLabel(forecast.weatherCode)} · {forecast.temperature}°C
          </Text>
          <Text style={styles.detail}>
            Wind {forecast.windSpeed} mph · gusts {forecast.windGusts} · cloud{' '}
            {forecast.cloudCover}%
          </Text>
        </View>
      ) : null}

      {busy ? (
        <ActivityIndicator color={colors.accentSoft} style={{ marginTop: 16 }} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 48 }}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => void load(item.id)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.rowMeta}>{item.height} m</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query.trim().length < 2
              ? 'Type at least two letters to find a peak.'
              : 'No peaks match.'}
          </Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: space.lg,
  },
  search: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.surface,
    color: colors.ink,
    paddingHorizontal: space.lg,
    fontFamily: fonts.sans,
    fontSize: 16,
    marginBottom: space.md,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    padding: space.lg,
    marginBottom: space.md,
    alignItems: 'center',
  },
  peak: {
    fontFamily: fonts.display,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  meta: {
    fontFamily: fonts.sans,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  temp: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontWeight: '700',
    fontSize: 18,
    marginTop: space.md,
    textAlign: 'center',
  },
  detail: {
    fontFamily: fonts.sans,
    color: colors.muted,
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  name: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontWeight: '600',
    textAlign: 'center',
  },
  rowMeta: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  empty: {
    marginTop: space.xl,
    fontFamily: fonts.sans,
    color: colors.muted,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.sans,
    textAlign: 'center',
    marginBottom: space.sm,
  },
})
