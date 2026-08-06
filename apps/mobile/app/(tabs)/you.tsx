import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/src/components/Avatar'
import { apiEnabled, apiGetMyPosts, mediaUrl } from '@/src/lib/api'
import { useAuth } from '@/src/lib/auth'
import { usePeakLogs } from '@/src/lib/peakLogs'
import { colors, fonts, radius, space, typography } from '@/src/theme'
import { GhostButton } from '@/src/ui'

export default function YouScreen() {
  const { profile, user, logout } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { completedCount } = usePeakLogs()
  const demo = user?.id === 'demo-local' || !apiEnabled()
  const posts = useQuery({
    queryKey: ['my-posts'],
    queryFn: apiGetMyPosts,
    enabled: !demo && apiEnabled(),
    retry: false,
  })

  const grid = demo ? [] : posts.data?.posts ?? []
  const name = profile?.name || user?.name || 'You'
  const handle = profile?.handle ?? 'you'

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
      <FlatList
        data={grid}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={{ paddingBottom: 48 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Avatar url={profile?.avatarUrl} name={name} size={88} />
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.handle}>@{handle}</Text>
            {profile?.status ? (
              <Text style={styles.status}>{profile.status}</Text>
            ) : null}
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{grid.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{completedCount}</Text>
                <Text style={styles.statLabel}>Summits</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <GhostButton
                label="Settings"
                onPress={() => router.push('/settings')}
              />
              <GhostButton label="Sign out" onPress={() => void logout()} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ padding: space.xl }}>
            <Text style={styles.empty}>
              {demo
                ? 'Demo mode — your posts appear after a real login.'
                : 'No posts yet. Share one from Create.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.tile}
            onPress={() => router.push(`/post/${item.id}`)}
          >
            <Image
              source={{ uri: mediaUrl(item.imageUrl) }}
              style={styles.tileImage}
              contentFit="cover"
            />
          </Pressable>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },
  name: {
    ...typography.title,
    fontSize: 26,
    color: colors.ink,
    marginTop: space.md,
    textAlign: 'center',
  },
  handle: {
    fontFamily: fonts.sans,
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  status: {
    color: colors.muted,
    marginTop: space.sm,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fonts.sans,
  },
  stats: {
    flexDirection: 'row',
    gap: space.xl,
    marginTop: space.lg,
  },
  stat: { alignItems: 'center', minWidth: 72 },
  statNum: {
    fontFamily: fonts.display,
    color: colors.ink,
    fontSize: 22,
    fontWeight: '600',
  },
  statLabel: {
    fontFamily: fonts.sans,
    color: colors.faint,
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.md,
  },
  empty: {
    fontFamily: fonts.sans,
    color: colors.muted,
    textAlign: 'center',
  },
  tile: {
    width: '33.333%',
    aspectRatio: 1,
    padding: 2,
  },
  tileImage: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
})
