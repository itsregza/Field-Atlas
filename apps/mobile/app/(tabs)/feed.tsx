import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { useRouter, type Href } from 'expo-router'
import { useState } from 'react'
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '@/src/components/Avatar'
import { apiEnabled, apiGetFeed, mediaUrl, type FeedPost } from '@/src/lib/api'
import { useAuth } from '@/src/lib/auth'
import { colors, radius, space, typography } from '@/src/theme'
import { Badge, Loading, Muted } from '@/src/ui'

type QuickLink = {
  key: string
  label: string
  hint: string
  icon: keyof typeof Ionicons.glyphMap
  href: Href
}

const QUICK_LINKS: QuickLink[] = [
  {
    key: 'map',
    label: 'Map',
    hint: 'Peaks near you',
    icon: 'map-outline',
    href: '/(tabs)/map',
  },
  {
    key: 'checklists',
    label: 'Checklists',
    hint: 'Check summits',
    icon: 'checkbox-outline',
    href: '/tools/checklists',
  },
  {
    key: 'hikes',
    label: 'Hikes',
    hint: 'Find a day out',
    icon: 'trail-sign-outline',
    href: '/tools/hikes',
  },
  {
    key: 'forecasts',
    label: 'Forecasts',
    hint: 'Hill weather',
    icon: 'cloudy-outline',
    href: '/tools/forecasts',
  },
  {
    key: 'create',
    label: 'Post',
    hint: 'Share a trip',
    icon: 'camera-outline',
    href: '/(tabs)/create',
  },
  {
    key: 'bothies',
    label: 'Bothies',
    hint: 'Shelter finder',
    icon: 'home-outline',
    href: '/tools/bothies',
  },
]

function QuickLinks() {
  const router = useRouter()

  return (
    <View style={styles.quickBlock}>
      <Text style={styles.sectionLabel}>Quick links</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickRow}
      >
        {QUICK_LINKS.map((link) => (
          <Pressable
            key={link.key}
            onPress={() => router.push(link.href)}
            style={({ pressed }) => [
              styles.quickCard,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={styles.quickIcon}>
              <Ionicons name={link.icon} size={20} color={colors.ink} />
            </View>
            <Text style={styles.quickLabel}>{link.label}</Text>
            <Text style={styles.quickHint}>{link.hint}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  )
}

function PostCard({ post }: { post: FeedPost }) {
  const router = useRouter()
  const image = mediaUrl(
    post.media?.find((m) => m.type === 'image')?.url ?? post.imageUrl,
  )

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.authorRow}
        onPress={() => router.push(`/u/${post.author.handle}`)}
      >
        <Avatar
          url={post.author.avatarUrl}
          name={post.author.name}
          size={40}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.authorName}>{post.author.name}</Text>
          <Text style={styles.handle}>@{post.author.handle}</Text>
        </View>
        {post.activity ? (
          <Badge
            label={post.activity}
            tone={post.activity === 'camping' ? 'camping' : 'hiking'}
          />
        ) : null}
      </Pressable>

      <Pressable onPress={() => router.push(`/post/${post.id}`)}>
        <Image source={{ uri: image }} style={styles.photo} contentFit="cover" />
      </Pressable>

      <View style={styles.body}>
        {post.peakName || post.hikeName ? (
          <Text style={styles.peak}>
            {post.peakName || post.hikeName}
            {post.height ? ` · ${post.height} m` : ''}
          </Text>
        ) : null}
        {post.areaName ? <Text style={styles.area}>{post.areaName}</Text> : null}
        <Text style={styles.caption} numberOfLines={3}>
          {post.body}
        </Text>
        <Text style={styles.meta}>
          {post.likeCount} likes · {post.commentCount} comments
        </Text>
      </View>
    </View>
  )
}

function HomeHeader({
  scope,
  setScope,
  demo,
}: {
  scope: 'all' | 'following'
  setScope: (value: 'all' | 'following') => void
  demo: boolean
}) {
  const { profile, user } = useAuth()
  const name = profile?.name || user?.name || 'there'

  return (
    <View>
      <View style={styles.greeting}>
        <Text style={styles.hello}>Hello, {name}</Text>
        <Text style={styles.helloSub}>Where are you heading?</Text>
      </View>

      <QuickLinks />

      <View style={styles.feedHead}>
        <Text style={styles.sectionLabel}>Activity</Text>
        <View style={styles.scopeRow}>
          {(['all', 'following'] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setScope(value)}
              style={[styles.scopeChip, scope === value && styles.scopeActive]}
            >
              <Text
                style={[
                  styles.scopeLabel,
                  scope === value && styles.scopeLabelActive,
                ]}
              >
                {value === 'all' ? 'All' : 'Following'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {demo ? (
        <View style={{ paddingHorizontal: space.lg, marginBottom: space.sm }}>
          <Muted>Demo mode — sign out and log in for the live feed.</Muted>
        </View>
      ) : null}
    </View>
  )
}

export default function FeedScreen() {
  const { user } = useAuth()
  const insets = useSafeAreaInsets()
  const demo = user?.id === 'demo-local'
  const [scope, setScope] = useState<'all' | 'following'>('all')
  const query = useQuery({
    queryKey: ['feed', scope],
    queryFn: () => apiGetFeed(20, scope),
    enabled: !demo && apiEnabled(),
    retry: 1,
  })

  const posts = demo ? [] : (query.data?.posts ?? [])

  if (!demo && query.isLoading) return <Loading />

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 8) }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={
          <HomeHeader scope={scope} setScope={setScope} demo={demo} />
        }
        contentContainerStyle={{ paddingBottom: 48 }}
        ListEmptyComponent={
          <View style={{ padding: space.xl }}>
            <Muted>
              {demo
                ? 'Demo mode has no feed. Log in with your Field Atlas account.'
                : query.isError
                  ? 'Could not load the feed. Check your connection and try again.'
                  : 'No posts yet. Share one from Create.'}
            </Muted>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  greeting: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    alignItems: 'center',
  },
  hello: {
    fontFamily: 'Fraunces, Georgia, serif',
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: -0.6,
    color: colors.ink,
    textAlign: 'center',
  },
  helloSub: {
    marginTop: 6,
    color: colors.muted,
    fontSize: 15,
    fontWeight: '400',
    fontFamily: 'DM Sans, Avenir Next, Segoe UI, sans-serif',
    textAlign: 'center',
  },
  sectionLabel: {
    fontFamily: 'DM Sans, Avenir Next, Segoe UI, sans-serif',
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
    textAlign: 'center',
  },
  quickBlock: {
    marginTop: space.md,
    marginBottom: space.lg,
  },
  quickRow: {
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  quickCard: {
    width: 118,
    padding: space.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  quickLabel: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 14,
  },
  quickHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  feedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: space.lg,
    marginBottom: space.sm,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  scopeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  scopeActive: {
    backgroundColor: colors.surfaceRaised,
  },
  scopeLabel: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 12,
  },
  scopeLabelActive: {
    color: colors.ink,
  },
  card: {
    marginBottom: space.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: space.lg,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.ink, fontWeight: '700' },
  authorName: { color: colors.ink, fontWeight: '700', fontSize: 14 },
  handle: { color: colors.muted, fontSize: 12 },
  photo: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: colors.surface,
  },
  body: { paddingHorizontal: space.lg, paddingTop: space.md },
  peak: { color: colors.ink, fontWeight: '700', fontSize: 16 },
  area: { color: colors.muted, marginTop: 2, fontSize: 13 },
  caption: {
    ...typography.body,
    color: colors.ink,
    marginTop: space.sm,
  },
  meta: {
    marginTop: space.sm,
    color: colors.faint,
    fontSize: 12,
    fontWeight: '600',
  },
})
