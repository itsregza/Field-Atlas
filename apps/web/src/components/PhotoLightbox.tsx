import { useEffect } from 'react'

export function PhotoLightbox({
  src,
  alt,
  onClose,
}: {
  src: string
  alt: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      onClick={onClose}
    >
      <button
        type="button"
        className="photo-lightbox__close"
        aria-label="Close"
        onClick={onClose}
      >
        ×
      </button>
      <div
        className="photo-lightbox__scroll"
        onClick={(event) => event.stopPropagation()}
      >
        <img src={src} alt={alt} />
      </div>
    </div>
  )
}
