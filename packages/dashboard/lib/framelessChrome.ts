import type { ChromeData } from '@/lib/types'

/** A 1×1 transparent PNG. Not an empty string: `IOSViewer` loads `framePng` into an `<img>` and an
 *  `Image`, and an empty data URL is a broken image in both. */
const TRANSPARENT_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII='

const made = new Map<string, ChromeData>()
const frameless = new WeakSet<ChromeData>()

/**
 * The chrome `IOSViewer` is given when the agent sent none: the screen alone, filling the canvas, with
 * no frame image and no side buttons.
 *
 * An iOS agent sends no chrome when it cannot build one — a model missing from Xcode's chrome map, a
 * failed render, or a cold build that ran past its time budget — and the viewer used to stay on the
 * skeleton for the whole session while the stream ran behind it.
 *
 * `width`/`height` give only the aspect. Touch is mapped relative to `screenRect`, so a wrong aspect
 * stretches the picture and never misplaces a tap.
 *
 * **One object per size, for good.** The viewer's effects and pointer handlers depend on the chrome's
 * identity, and a new object on every render would tear them down each time. The map holds a handful of
 * entries at most: one per stream size a session has seen.
 */
export function framelessChrome(width: number, height: number): ChromeData {
  const key = `${width}x${height}`
  const cached = made.get(key)
  if (cached) return cached
  const chrome: ChromeData = {
    framePng: TRANSPARENT_PNG,
    bezelWidth: width,
    bezelHeight: height,
    compositeWidth: width,
    compositeHeight: height,
    padding: { left: 0, right: 0, top: 0, bottom: 0 },
    screenRect: { x: 0, y: 0, width, height },
    // A modern iPhone's corners, roughly; an SE's square ones would look like a cropped picture.
    screenCornerRadius: Math.round(width * 0.12),
    logicalWidth: Math.round(width / 2),
    logicalHeight: Math.round(height / 2),
    buttons: [],
  }
  made.set(key, chrome)
  frameless.add(chrome)
  return chrome
}

export function isFramelessChrome(chrome: ChromeData): boolean {
  return frameless.has(chrome)
}
