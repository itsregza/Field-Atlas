import type { ReactNode } from 'react'

export type PostActivity = 'hiking' | 'camping'

export function isPostActivity(value: unknown): value is PostActivity {
  return value === 'hiking' || value === 'camping'
}

export function HikingGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="4.5" r="1.7" fill="currentColor" stroke="none" />
      <path d="M10.5 8.2 8.2 13.5M13.5 8.2l1.4 3.2 3.4 1.1" />
      <path d="M10.5 8.2h3M9.2 21l2-7.2L14 16.5 16.2 21" />
      <path d="M7.5 13.8 5.8 17.5" />
    </svg>
  )
}

export function TentGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 20.5 12 4.5l8.5 16H3.5Z" />
      <path d="M12 4.5v16" />
      <path d="M7.2 20.5c1.2-2.4 2.5-3.6 4.8-3.6s3.6 1.2 4.8 3.6" />
    </svg>
  )
}

export function PostActivityIcon({
  activity,
  className,
}: {
  activity?: PostActivity | null
  className?: string
}) {
  if (activity === 'camping') return <TentGlyph className={className} />
  if (activity === 'hiking') return <HikingGlyph className={className} />
  return null
}

export function postActivityLabel(activity?: PostActivity | null) {
  if (activity === 'camping') return 'Camping'
  if (activity === 'hiking') return 'Hiking'
  return null
}

export function PostActivityBadge({
  activity,
  className,
}: {
  activity?: PostActivity | null
  className?: string
}) {
  const label = postActivityLabel(activity)
  if (!label || !activity) return null
  return (
    <span
      className={['post-activity-badge', `is-${activity}`, className]
        .filter(Boolean)
        .join(' ')}
      title={label}
    >
      <PostActivityIcon activity={activity} />
      <span>{label}</span>
    </span>
  )
}

export function PostActivityFilter({
  value,
  onChange,
  counts,
}: {
  value: 'all' | PostActivity
  onChange: (next: 'all' | PostActivity) => void
  counts?: { all: number; hiking: number; camping: number }
}) {
  const options: Array<{ id: 'all' | PostActivity; label: string; icon?: ReactNode }> = [
    { id: 'all', label: 'All' },
    { id: 'hiking', label: 'Hiking', icon: <HikingGlyph /> },
    { id: 'camping', label: 'Camping', icon: <TentGlyph /> },
  ]
  return (
    <div className="post-activity-filter" role="tablist" aria-label="Filter posts">
      {options.map((option) => {
        const count =
          counts == null
            ? null
            : option.id === 'all'
              ? counts.all
              : counts[option.id]
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={value === option.id}
            className={value === option.id ? 'is-active' : undefined}
            onClick={() => onChange(option.id)}
          >
            {option.icon}
            <span>{option.label}</span>
            {count != null ? <small>{count}</small> : null}
          </button>
        )
      })}
    </div>
  )
}
