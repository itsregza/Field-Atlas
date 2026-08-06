import { useEffect, useRef, useState } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { Image } from 'expo-image'
import { HERO_INTERVAL_MS, homeHeroShots } from '@/src/data/homeHero'

type Props = {
  onIndexChange?: (index: number) => void
}

export function HeroSlideshow({ onIndexChange }: Props) {
  const [index, setIndex] = useState(0)
  const [incoming, setIncoming] = useState<number | null>(null)
  const fade = useRef(new Animated.Value(0)).current
  const indexRef = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    onIndexChange?.(0)
  }, [onIndexChange])

  useEffect(() => {
    if (homeHeroShots.length < 2) return

    const id = setInterval(() => {
      if (busy.current) return
      busy.current = true
      const current = indexRef.current
      const next = (current + 1) % homeHeroShots.length
      setIncoming(next)
      fade.setValue(0)

      Animated.timing(fade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished) {
          busy.current = false
          return
        }
        indexRef.current = next
        setIndex(next)
        setIncoming(null)
        fade.setValue(0)
        onIndexChange?.(next)
        busy.current = false
      })
    }, HERO_INTERVAL_MS)

    return () => clearInterval(id)
  }, [fade, onIndexChange])

  const current = homeHeroShots[index]!
  const nextShot = incoming !== null ? homeHeroShots[incoming] : null

  return (
    <View style={[StyleSheet.absoluteFill, styles.host]}>
      <Image
        source={current.source}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={0}
        priority="high"
        cachePolicy="memory-disk"
      />

      {nextShot ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <Image
            source={nextShot.source}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={0}
            cachePolicy="memory-disk"
          />
        </Animated.View>
      ) : null}

      <View style={styles.washTop} />
      <View style={styles.washBottom} />
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    pointerEvents: 'none',
    backgroundColor: '#0B0E0A',
  },
  washTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '42%',
    backgroundColor: 'rgba(8, 10, 7, 0.45)',
  },
  washBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '58%',
    backgroundColor: 'rgba(8, 10, 7, 0.88)',
  },
})
