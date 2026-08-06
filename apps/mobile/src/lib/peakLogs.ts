import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo } from 'react'
import {
  apiEnabled,
  apiGetLogs,
  apiGetPeakRating,
  apiGetPitchability,
  apiPutLogs,
  apiSetPeakRating,
  apiSetPitchability,
  type PeakLog,
} from '@/src/lib/api'
import { useAuth } from '@/src/lib/auth'
import type { AreaPeak } from '@/src/data/areaPeaks'
import { areas } from '@/src/data/areas'

function areaName(slug: string) {
  return areas.find((a) => a.slug === slug)?.name ?? slug
}

export type CompleteScores = {
  pitch: number
  peak: number
}

export function usePeakLogs() {
  const { user } = useAuth()
  const demo = user?.id === 'demo-local'
  const client = useQueryClient()

  const logsQuery = useQuery({
    queryKey: ['me-logs'],
    queryFn: apiGetLogs,
    enabled: apiEnabled() && !demo,
    staleTime: 30_000,
  })

  const logs = logsQuery.data?.logs ?? {}

  const putLogs = useMutation({
    mutationFn: apiPutLogs,
    onSuccess: () => client.invalidateQueries({ queryKey: ['me-logs'] }),
  })

  const isDone = useCallback(
    (peakId: string) => Boolean(logs[peakId]?.done),
    [logs],
  )

  const toggleComplete = useCallback(
    async (peak: AreaPeak, scores?: CompleteScores) => {
      if (demo || !apiEnabled()) {
        throw new Error('Log in to save peak progress.')
      }

      const currentlyDone = Boolean(logs[peak.id]?.done)

      if (!currentlyDone) {
        if (
          !scores ||
          scores.pitch < 1 ||
          scores.pitch > 5 ||
          scores.peak < 1 ||
          scores.peak > 5
        ) {
          throw new Error('ratings-required')
        }
        await apiSetPitchability(peak.id, scores.pitch)
        await apiSetPeakRating(peak.id, scores.peak)
      }

      const next: PeakLog = {
        done: !currentlyDone,
        date: !currentlyDone ? new Date().toISOString().slice(0, 10) : '',
        notes: logs[peak.id]?.notes ?? '',
        peakName: peak.name,
        areaSlug: peak.area,
        areaName: areaName(peak.area),
        height: peak.height,
      }

      const merged = { ...logs, [peak.id]: next }
      await putLogs.mutateAsync(merged)
      return next
    },
    [demo, logs, putLogs],
  )

  const getPitch = useCallback(
    async (peakId: string) => {
      if (!apiEnabled() || demo) return null
      try {
        return await apiGetPitchability(peakId)
      } catch {
        return null
      }
    },
    [demo],
  )

  const getPeakRating = useCallback(
    async (peakId: string) => {
      if (!apiEnabled() || demo) return null
      try {
        return await apiGetPeakRating(peakId)
      } catch {
        return null
      }
    },
    [demo],
  )

  const completedCount = useMemo(
    () => Object.values(logs).filter((log) => log.done).length,
    [logs],
  )

  return {
    logs,
    isDone,
    toggleComplete,
    getPitch,
    getPeakRating,
    loading: logsQuery.isLoading,
    areaName,
    completedCount,
  }
}

export function useNearbyPeaks(peaks: AreaPeak[], limit = 40) {
  return useMemo(() => {
    const live = new Set(areas.filter((a) => a.live).map((a) => a.slug))
    const preferred = peaks.filter(
      (p) =>
        live.has(p.area) ||
        p.area === 'peak-district' ||
        p.area === 'eryri',
    )
    const pool = preferred.length ? preferred : peaks
    return [...pool]
      .sort((a, b) => b.height - a.height || a.name.localeCompare(b.name))
      .slice(0, limit)
  }, [peaks, limit])
}
