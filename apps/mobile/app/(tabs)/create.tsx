import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import { useState } from 'react'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ApiError, apiCreatePost, apiEnabled, apiUploadMedia } from '@/src/lib/api'
import { colors, fonts, radius, space } from '@/src/theme'
import { Field, PrimaryButton } from '@/src/ui'

type Step = 'activity' | 'media' | 'details' | 'preview'
type Activity = 'hiking' | 'camping'

export default function CreateScreen() {
  const insets = useSafeAreaInsets()
  const [step, setStep] = useState<Step>('activity')
  const [activity, setActivity] = useState<Activity | null>(null)
  const [uri, setUri] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [peakName, setPeakName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setUri(result.assets[0].uri)
      setError('')
    }
  }

  const publish = async () => {
    if (!activity || !uri || !caption.trim()) return
    if (!apiEnabled()) {
      setError('Connect the API to publish. Demo mode is UI-only.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const uploaded = await apiUploadMedia(uri)
      await apiCreatePost({
        body: caption.trim(),
        imageUrl: uploaded.media.url,
        media: [uploaded.media],
        activity,
        peakName: peakName.trim() || undefined,
      })
      setStep('activity')
      setActivity(null)
      setUri(null)
      setCaption('')
      setPeakName('')
      setError('')
      setError('Posted.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 12) }]}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 48,
          paddingHorizontal: space.lg,
        }}
      >
        <Text style={styles.step}>
          Step {['activity', 'media', 'details', 'preview'].indexOf(step) + 1} of
          4
        </Text>

        {step === 'activity' ? (
          <View style={styles.block}>
            <Text style={styles.prompt}>Hiking or camping?</Text>
            {(['hiking', 'camping'] as const).map((value) => (
              <Pressable
                key={value}
                style={styles.choice}
                onPress={() => {
                  setActivity(value)
                  setStep('media')
                }}
              >
                <Text style={styles.choiceTitle}>
                  {value === 'hiking' ? 'Hiking' : 'Camping'}
                </Text>
                <Text style={styles.choiceHint}>
                  {value === 'hiking'
                    ? 'Summit days and routes'
                    : 'Overnight pitches'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 'media' ? (
          <View style={styles.block}>
            {uri ? (
              <Image source={{ uri }} style={styles.preview} contentFit="cover" />
            ) : (
              <Pressable style={styles.drop} onPress={() => void pickPhoto()}>
                <Text style={styles.choiceTitle}>Add a photo</Text>
                <Text style={styles.choiceHint}>From your library</Text>
              </Pressable>
            )}
            {uri ? (
              <PrimaryButton label="Next" onPress={() => setStep('details')} />
            ) : null}
            <PrimaryButton
              label="Back"
              onPress={() => setStep('activity')}
            />
          </View>
        ) : null}

        {step === 'details' ? (
          <View style={styles.block}>
            <Field
              placeholder="Write a caption…"
              value={caption}
              onChangeText={setCaption}
              multiline
              style={{ minHeight: 96, paddingTop: 14 }}
            />
            <Field
              placeholder="Peak name (optional)"
              value={peakName}
              onChangeText={setPeakName}
            />
            <PrimaryButton
              label="Preview"
              onPress={() => {
                if (!caption.trim()) {
                  setError('Write a caption.')
                  return
                }
                setError('')
                setStep('preview')
              }}
            />
            <PrimaryButton label="Back" onPress={() => setStep('media')} />
          </View>
        ) : null}

        {step === 'preview' ? (
          <View style={styles.block}>
            <Text style={styles.choiceTitle}>
              {activity === 'camping' ? 'Camping' : 'Hiking'}
              {peakName ? ` · ${peakName}` : ''}
            </Text>
            {uri ? (
              <Image source={{ uri }} style={styles.preview} contentFit="cover" />
            ) : null}
            <Text style={styles.caption}>{caption}</Text>
            <PrimaryButton
              label="Post"
              onPress={() => void publish()}
              busy={busy}
            />
            <PrimaryButton label="Back" onPress={() => setStep('details')} />
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  step: {
    fontFamily: fonts.sans,
    color: colors.muted,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
  },
  prompt: {
    fontFamily: fonts.sans,
    color: colors.ink,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: space.sm,
  },
  block: { marginTop: space.xl, gap: space.md },
  choice: {
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  choiceTitle: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  choiceHint: {
    color: colors.muted,
    marginTop: 4,
    textAlign: 'center',
  },
  drop: {
    height: 220,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  caption: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    marginTop: space.lg,
    textAlign: 'center',
  },
})
