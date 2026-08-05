const designs = [
  { id: 'a', label: 'A', href: '/mockups/a', name: 'Wasdale' },
  { id: 'e', label: 'E', href: '/mockups/e', name: 'Langdale' },
  { id: 'h', label: 'H', href: '/mockups/h', name: 'Kinder' },
  { id: 'i', label: 'I', href: '/mockups/i', name: 'Wasdale split' },
  { id: 'j', label: 'J', href: '/mockups/j', name: 'Glencoe split' },
] as const

export function MockupChrome({
  active,
  name,
}: {
  active: 'a' | 'e' | 'h' | 'i' | 'j'
  name: string
}) {
  return (
    <div className="mu-chrome" role="navigation" aria-label="Mockup switcher">
      <a href="/mockups">Gallery</a>
      <span className="mu-chrome__label">
        {active.toUpperCase()} · {name}
      </span>
      <div className="mu-chrome__nav">
        {designs.map((design) => (
          <a
            key={design.id}
            href={design.href}
            className={design.id === active ? 'is-active' : undefined}
            title={design.name}
          >
            {design.label}
          </a>
        ))}
      </div>
    </div>
  )
}
