import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  apiEnabled,
  apiGetPost,
  apiLikePost,
  apiUnlikePost,
  mediaUrl,
} from '@/src/lib/api'
import { colors, space } from '@/src/theme'
import { Badge, Loading, Muted, Screen } from '@/src/ui'
import { useState } from 'react'

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const query = useQuery({
    queryKey: ['post', id],
    queryFn: () => apiGetPost(id!),
    enabled: apiEnabled() && Boolean(id) && !id?.startsWith('demo-'),
  })
  const [liked, setLiked] = useState<boolean | null>(null)
  const [likeCount, setLikeCount] = useState<number | null>(null)

  if (id?.startsWith('demo-')) {
    return (
      <Screen>
        <Muted>Demo post — open a live post once the API is connected.</Muted>
        <Pressable onPress={() => router.back()} style={{ marginTop: space.lg }}>
          <Text style={{ color: colors.accentSoft }}>Go back</Text>
        </Pressable>
      </Screen>
    )
  }

  if (query.isLoading) return <Loading />
  const post = query.data?.post
  if (!post) {
    return (
      <Screen>
        <Muted>Post not found.</Muted>
      </Screen>
    )
  }

  const isLiked = liked ?? post.likedByMe
  const count = likeCount ?? post.likeCount

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Image
        source={{ uri: mediaUrl(post.imageUrl) }}
        style={styles.image}
        contentFit="cover"
      />
      <View style={styles.body}>
        <Pressable onPress={() => router.push(`/u/${post.author.handle}`)}>
          <Text style={styles.author}>
            {post.author.name} · @{post.author.handle}
          </Text>
        </Pressable>
        {post.activity ? (
          <Badge
            label={post.activity}
            tone={post.activity === 'camping' ? 'camping' : 'hiking'}
          />
        ) : null}
        {post.peakName ? (
          <Text style={styles.peak}>
            {post.peakName}
            {post.height ? ` · ${post.height} m` : ''}
          </Text>
        ) : null}
        <Text style={styles.caption}>{post.body}</Text>
        <Pressable
          onPress={() => {
            const action = isLiked ? apiUnlikePost(post.id) : apiLikePost(post.id)
            void action.then((result) => {
              setLiked(result.liked)
              setLikeCount(result.likeCount)
            })
          }}
        >
          <Text style={styles.likes}>
            {isLiked ? '♥' : '♡'} {count} likes
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  image: { width: '100%', aspectRatio: 1, backgroundColor: colors.surface },
  body: { padding: space.lg, gap: space.sm },
  author: { color: colors.ink, fontWeight: '700' },
  peak: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  caption: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  likes: { color: colors.muted, fontWeight: '700', marginTop: space.sm },
})
