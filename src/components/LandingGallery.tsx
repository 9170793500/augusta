import { useEffect, useRef, useState } from 'react'
import { LANDING_GALLERY, type GalleryItem } from '../lib/landingGallery'

function GallerySlide({
  frame,
  hovered,
  onHover,
  audioEnabled,
}: {
  frame: GalleryItem
  hovered: boolean
  onHover: () => void
  audioEnabled: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || frame.type !== 'video') return

    if (hovered) {
      video.muted = !audioEnabled
      if (audioEnabled) video.volume = 1
      void video.play().catch(() => {})
      return
    }

    video.pause()
    video.muted = true
  }, [hovered, audioEnabled, frame.type])

  return (
    <div
      className={`public-gallery-slide${hovered ? ' is-hovered' : ''}`}
      onMouseEnter={onHover}
    >
      {frame.type === 'video' ? (
        <video
          ref={videoRef}
          src={frame.src}
          loop
          playsInline
          preload="metadata"
          muted
          aria-label={frame.cap}
        />
      ) : (
        <img src={frame.src} alt="" loading="lazy" draggable={false} />
      )}
    </div>
  )
}

export function LandingGallery() {
  const [paused, setPaused] = useState(false)
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const loopItems = [...LANDING_GALLERY, ...LANDING_GALLERY]

  function enableAudio() {
    setAudioEnabled(true)
  }

  return (
    <div
      className={`public-gallery-strip${paused ? ' is-paused' : ''}`}
      aria-label="Augusta Golf Homes gallery"
      onMouseEnter={enableAudio}
      onClick={enableAudio}
      onTouchStart={enableAudio}
      onMouseLeave={() => {
        setPaused(false)
        setHoverKey(null)
      }}
    >
      <div className="public-gallery-track">
        {loopItems.map((frame, index) => {
          const slideKey = `${frame.id}-${index}`
          return (
            <GallerySlide
              key={slideKey}
              frame={frame}
              hovered={hoverKey === slideKey}
              audioEnabled={audioEnabled}
              onHover={() => {
                enableAudio()
                setPaused(true)
                setHoverKey(slideKey)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
