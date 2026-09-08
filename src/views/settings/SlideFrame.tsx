import { useEffect, useRef, useState } from 'react'
import { SLIDE_COUNT, SLIDE_HEIGHT, SLIDE_WIDTH, type Slide } from './slides'

/** One page of the design file: a static, script-free 1280×720 export in a frame scaled to the column.
 *  The frame takes no pointer events, so the page scrolls straight over it. Not sandboxed: some embedded
 *  browsers refuse sandboxed frames outright, and a same-origin static page gains nothing from one. */
export default function SlideFrame({ slide }: { slide: Slide }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / SLIDE_WIDTH))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <figure className="m-0">
      <div ref={ref} className="relative aspect-video overflow-hidden rounded-card border border-line bg-canvas shadow-card">
        {scale > 0 && (
          <iframe
            src={slide.file}
            title={`${slide.title}, slide ${slide.n} of ${SLIDE_COUNT}`}
            loading="lazy"
            tabIndex={-1}
            className="pointer-events-none absolute left-0 top-0 border-0"
            style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          />
        )}
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-3 px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-label">
        <span>{slide.title}</span>
        <span className="tnum">{slide.n} / {SLIDE_COUNT}</span>
      </figcaption>
    </figure>
  )
}
