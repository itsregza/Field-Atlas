import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/src/components/Avatar'
import {
  apiEnabled,
  apiFollow,
  apiGetProfile,
  apiGetProfilePosts,
  apiUnfollow,
  mediaUrl,
} from '@/src/lib/api'
import { colors, fonts, radius, space, typography } from '@/src/theme'
import { Loading, PrimaryButton } from '@/src/ui'
import { useState } from 'react'

export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const profileQuery = useQuery({
    queryKey: ['profile', handle],
    queryFn: () => apiGetProfile(handle!),
    enabled: apiEnabled() && Boolean(handle),
  })
  const postsQuery = useQuery({
    queryKey: ['profile-posts', handle],
    queryFn: () => apiGetProfilePosts(handle!),
    enabled: apiEnabled() && Boolean(handle),
  })
  const [following, setFollowing] = useState<boolean | null>(null)

  if (!apiEnabled()) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.empty}>Connect the API to load live profiles.</Text>
      </View>
    )
  }

  if (profileQuery.isLoading) return <Loading />
  const profile = profileQuery.data?.profile
  if (!profile) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.empty}>Profile not found.</Text>
      </View>
    )
  }

  const isFollowing = following ?? Boolean(profile.followedByMe)
  const posts = postsQuery.data?.posts ?? []

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 8) }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={{ paddingBottom: 48 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Avatar url={profile.avatarUrl} name={profile.name} size={88} />
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.handle}>@{profile.handle}</Text>
            {profile.status ? (
              <Text style={styles.status}>{profile.status}</Text>
            ) : null}
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{posts.length}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{profile.completed}</Text>
                <Text style={styles.statLabel}>Summits</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>{profile.followerCount ?? 0}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNum}>
                  {profile.followingCount ?? 0}
                </Text>
                <Text style={styles.statLabel}>Following</Text>
              </View>
            </View>
            <View style={{ width: '70%', marginTop: space.md }}>
              <PrimaryButton
                label={isFollowing ? 'Following' : 'Follow'}
                onPress={() => {
                  const action = isFollowing
                    ? apiUnfollow(profile.handle)
                    : apiFollow(profile.handle)
                  void action.then((result) => setFollowing(result.following))
                }}
              />
            </View>
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
        ListEmptyComponent={
          <View style={{ padding: space.xl }}>
            <Text style={styles.empty}>No posts yet.</Text>
          </View>
        }
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
    paddingHorizontal: space.lg,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: space.lg,
    marginTop: space.lg,
  },
  stat: { alignItems: 'center', minWidth: 64 },
  statNum: {
    fontFamily: fonts.display,
    color: colors.ink,
    fontSize: 20,
    fontWeight: '600',
  },
  statLabel: {
    fontFamily: fonts.sans,
    color: colors.faint,
    fontSize: 11,
    marginTop: 2,
  },
  empty: {
    fontFamily: fonts.sans,
    color: colors.muted,
    textAlign: 'center',
  },
  tile: { width: '33.333%', aspectRatio: 1, padding: 2 },
  tileImage: {
    flex: 1,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
})
