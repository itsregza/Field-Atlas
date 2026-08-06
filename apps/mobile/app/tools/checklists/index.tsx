import { useRouter } from 'expo-router'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { areas } from '@/src/data/areas'
import { getAreaPeaks } from '@/src/data/areaPeaks'
import { colors, fonts, space } from '@/src/theme'

const LIST = areas
  .filter((area) => getAreaPeaks(area.slug).length > 0)
  .map((area) => ({
    slug: area.slug,
    name: area.name,
    count: getAreaPeaks(area.slug).length,
    nation: area.nation,
  }))

export default function ChecklistsIndex() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
      <FlatList
        data={LIST}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: 48,
        }}
        ListHeaderComponent={
          <Text style={styles.hint}>
            Check summits by area. Pitchability and your peak rating are both
            required.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push(`/tools/checklists/${item.slug}`)}
          >
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.nation} · {item.count} peaks
            </Text>
          </Pressable>
        )}
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
    marginBottom: space.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    marginBottom: space.md,
  },
  name: {
    fontFamily: fonts.sans,
    color: colors.ink,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  meta: {
    fontFamily: fonts.sans,
    color: colors.muted,
    marginTop: 4,
    fontSize: 13,
    textAlign: 'center',
  },
})
