import { StyleSheet, Text, View } from 'react-native'
import type { AreaPeak } from '@/src/data/areaPeaks'
import { colors, fonts } from '@/src/theme'

type Props = {
  peaks: AreaPeak[]
  selectedId: string | null
  doneIds: Set<string>
  onSelect: (peakId: string) => void
  center?: [number, number]
  zoom?: number
}

/** Native: full-bleed placeholder until native MapLibre lands. */
export function PeaksMapCanvas(_props: Props) {
  return (
    <View style={styles.host}>
      <Text style={styles.label}>Map loads on web / Expo web for now.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  label: {
    fontFamily: fonts.sans,
    color: colors.muted,
    textAlign: 'center',
  },
})
