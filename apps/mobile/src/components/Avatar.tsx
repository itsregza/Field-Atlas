import { Image } from 'expo-image'
import { StyleSheet, Text, View } from 'react-native'
import { mediaUrl } from '@/src/lib/api'
import { colors, fonts } from '@/src/theme'

export function Avatar({
  url,
  name,
  size = 56,
}: {
  url?: string | null
  name: string
  size?: number
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase() || '?'
  if (url) {
    return (
      <Image
        source={{ uri: mediaUrl(url) }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface,
        }}
        contentFit="cover"
      />
    )
  }
  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: fonts.display,
    color: colors.ink,
    fontWeight: '600',
  },
})
