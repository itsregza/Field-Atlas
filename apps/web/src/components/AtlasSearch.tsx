import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import {
  listPublicProfiles,
  type PublicProfile,
} from '../data/profiles'
import { searchAtlas, searchKindLabel, type SearchHit } from '../data/search'

type AtlasSearchProps = {
  className?: string
  placeholder?: string
}

export function AtlasSearch({
  className,
  placeholder = 'Search hikes, peaks, ranges and friends…',
}: AtlasSearchProps) {
  const listId = useId()
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [profiles, setProfiles] = useState<PublicProfile[]>([])
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    let cancelled = false
    void listPublicProfiles().then((next) => {
      if (!cancelled) setProfiles(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    return () => window.removeEventListener('mousedown', onPointer)
  }, [])

  const results = useMemo(
    () => searchAtlas(query, profiles, 10),
    [query, profiles],
  )

  useEffect(() => {
    setActive(0)
  }, [query])

  const go = (hit: SearchHit) => {
    window.location.href = hit.href
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const hit = results[active]
      if (hit) go(hit)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div
      className={['site-search', className].filter(Boolean).join(' ')}
      ref={rootRef}
    >
      <label className="site-search__label" htmlFor={inputId}>
        Search Field Atlas
      </label>
      <input
        id={inputId}
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={query}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results[active] ? `${listId}-${results[active].id}` : undefined
        }
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {open && query.trim().length >= 2 ? (
        <ul className="site-search__results" id={listId} role="listbox">
          {results.length === 0 ? (
            <li className="site-search__empty">No matches.</li>
          ) : (
            results.map((hit, index) => (
              <li key={`${hit.kind}-${hit.id}`} role="option">
                <button
                  type="button"
                  id={`${listId}-${hit.id}`}
                  className={
                    index === active
                      ? 'site-search__hit is-active'
                      : 'site-search__hit'
                  }
                  onMouseEnter={() => setActive(index)}
                  onClick={() => go(hit)}
                >
                  <span className={`site-search__kind is-${hit.kind}`}>
                    {searchKindLabel(hit.kind)}
                  </span>
                  <strong>{hit.label}</strong>
                  <span>{hit.detail}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}
