import type { WeatherKind } from '../data/weather'

type WeatherIconProps = {
  kind: WeatherKind
  className?: string
  title?: string
}

export function WeatherIcon({ kind, className, title }: WeatherIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width="22"
      height="22"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {iconPaths(kind)}
    </svg>
  )
}

function iconPaths(kind: WeatherKind) {
  switch (kind) {
    case 'clear':
      return (
        <>
          <circle cx="16" cy="16" r="6" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M16 3v4M16 25v4M3 16h4M25 16h4M7 7l2.5 2.5M22.5 22.5 25 25M25 7l-2.5 2.5M7 25l2.5-2.5" />
          </g>
        </>
      )
    case 'partly-cloudy':
      return (
        <>
          <circle cx="11" cy="12" r="4.5" fill="currentColor" />
          <path
            d="M12 22h10.5a4.5 4.5 0 0 0 .4-9 6.2 6.2 0 0 0-11.7 1.8A3.8 3.8 0 0 0 12 22Z"
            fill="currentColor"
            opacity="0.88"
          />
        </>
      )
    case 'cloudy':
      return (
        <path
          d="M10.5 23h12a5 5 0 0 0 .5-10 7 7 0 0 0-13.2 2A4.2 4.2 0 0 0 10.5 23Z"
          fill="currentColor"
        />
      )
    case 'fog':
      return (
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 12h20M8 17h16M10 22h12" />
        </g>
      )
    case 'drizzle':
      return (
        <>
          <path
            d="M10 16h11a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.4 1.6A3.4 3.4 0 0 0 10 16Z"
            fill="currentColor"
          />
          <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 20v3M16 19v3M20 20v3" />
          </g>
        </>
      )
    case 'rain':
      return (
        <>
          <path
            d="M9.5 15h12a4.5 4.5 0 0 0 .5-9 6.2 6.2 0 0 0-11.8 1.8A3.8 3.8 0 0 0 9.5 15Z"
            fill="currentColor"
          />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M11 19v5M16 18v6M21 19v5" />
          </g>
        </>
      )
    case 'snow':
      return (
        <>
          <path
            d="M9.5 15h12a4.5 4.5 0 0 0 .5-9 6.2 6.2 0 0 0-11.8 1.8A3.8 3.8 0 0 0 9.5 15Z"
            fill="currentColor"
          />
          <g fill="currentColor">
            <circle cx="12" cy="21" r="1.3" />
            <circle cx="16.5" cy="23" r="1.3" />
            <circle cx="21" cy="20.5" r="1.3" />
          </g>
        </>
      )
    case 'storm':
      return (
        <>
          <path
            d="M9 14h12a4.5 4.5 0 0 0 .5-9 6.2 6.2 0 0 0-11.8 1.8A3.8 3.8 0 0 0 9 14Z"
            fill="currentColor"
          />
          <path d="M16 15 12 22h4l-1.5 6L21 18h-4l2-3Z" fill="currentColor" />
        </>
      )
  }
}
