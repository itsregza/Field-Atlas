import { useMemo } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getAllAreaPeaks } from '@/src/data/areaPeaks'
import { usePeakLogs } from '@/src/lib/peakLogs'
import { colors, fonts, space } from '@/src/theme'

const ALL = getAllAreaPeaks()

export default function HikesToolScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { isDone, areaName, loading } = usePeakLogs()

  const unfinished = useMemo(() => {
    return ALL.filter((p) => !isDone(p.id))
      .sort((a, b) => b.height - a.height)
      .slice(0, 80)
  }, [isDone])

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <FlatList
        data={unfinished}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: 48,
        }}
        ListHeaderComponent={
          <Text style={styles.hint}>
            {loading
              ? 'Loading your logs…'
              : 'Unfinished summits — open the map to plan a day.'}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push('/(tabs)/map')}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {areaName(item.area)} · {item.height} m
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Every summit in your logs is checked — or log in to sync progress.
          </Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hint: {
    fontFamily: fonts.sans,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: space.lg,
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
  meta: {
    fontFamily: fonts.sans,
    color: colors.muted,
    marginTop: 3,
    fontSize: 13,
    textAlign: 'center',
  },
  empty: {
    marginTop: space.xl,
    fontFamily: fonts.sans,
    color: colors.muted,
    textAlign: 'center',
  },
})
