export type ProfileSection = 'overview' | 'stats' | 'trips' | 'gear'

export const profileSections: Array<{ id: ProfileSection; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'stats', label: 'Stats' },
  { id: 'trips', label: 'Trips' },
  { id: 'gear', label: 'Gear' },
]

export function parseProfileSection(value: string | undefined): ProfileSection {
  if (value === 'stats' || value === 'trips' || value === 'gear') return value
  return 'overview'
}

type ProfileNavProps = {
  basePath: string
  section: ProfileSection
  /** Public profiles hide Gear editing; still show the tab as read-only empty. */
  showGear?: boolean
}

export function ProfileSectionNav({
  basePath,
  section,
  showGear = true,
}: ProfileNavProps) {
  const items = profileSections.filter(
    (item) => showGear || item.id !== 'gear',
  )

  return (
    <nav className="profile-section-nav" aria-label="Profile sections">
      {items.map((item) => {
        const href =
          item.id === 'overview' ? basePath : `${basePath}/${item.id}`
        return (
          <a
            key={item.id}
            href={href}
            className={section === item.id ? 'is-active' : ''}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}
