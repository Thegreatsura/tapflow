import type { ChromeButton, ChromeRect } from '@tapflowio/protocol'

export interface Rect { left: number; top: number; right: number; bottom: number }

/**
 * Where a physical side button sits when nothing is hovering it, in 2× composite px.
 *
 * **These are the numbers `IOSViewer` draws the button at**, and they have to stay that way: a hit
 * area computed from a different position than the pixels the user is aiming at is a target that
 * lies about where it is. The renderer's resting placement is
 * `left: rolloverOffset.x - buttonW / 2`, and a top-edge button (an iPad's power button, an iPad
 * mini's volume pair) takes its `top` from `rolloverOffset.y` while every other anchor measures from
 * `normalOffset.y`.
 *
 * `normalOffset` is the retracted position and `rolloverOffset` the extended one; this UI draws
 * buttons extended at rest, which is why the horizontal centre comes from the rollover pair.
 */
export function buttonHitRect(btn: ChromeButton): Rect {
  const left = btn.rolloverOffset.x - btn.buttonW / 2
  const top = btn.anchor === 'top' ? btn.rolloverOffset.y : btn.normalOffset.y - btn.buttonH / 2
  return { left, top, right: left + btn.buttonW, bottom: top + btn.buttonH }
}

/**
 * The area each button answers to, in 2× composite px: its resting rectangle grown by `reach` along
 * its edge, stopped towards the device where the frame begins (see `inward`) and outwards at the
 * edge of the composite `box`, and **never overlapping a neighbour**.
 *
 * **The box is the outer limit, as it was before #785.** The old hit test ran in the container's
 * pointer handlers, so nothing outside the frame's box could press anything; past a button's outer
 * edge it reached only the few px to the box's edge. An element can overflow its container, and an
 * unclipped target reached about 35 CSS px into the page — clicking the gap between the device and
 * the status card pressed Power and locked the device. Reaching the box keeps a target at about 13
 * CSS px across, under WCAG 2.5.8's 24, and the criterion's spacing exception is what it meets:
 * neighbours sit far enough apart that a 24 px circle on each touches no other target.
 * `buttonHit.test.ts` holds that on measured iPhone and iPad layouts.
 *
 * The browser hit-tests these as elements, so this runs once per layout rather than per pointer
 * event, and the landscape rotation is the container's transform rather than arithmetic here.
 *
 * Why not let overlapping targets stack and the top one win: WCAG 2.5.8 leaves an overlap out of
 * both targets' size, so the one underneath would be smaller than it looks. Instead two targets that
 * would meet are cut at the midline of the gap between their buttons — the boundary #783 settled on
 * when it moved from first-match to nearest-rectangle, so the feel at a crowded edge is unchanged.
 *
 * Every cut is decided from the *grown* rectangles before any is cut, so the answer does not depend
 * on the order the agent listed the buttons in. That order is what pressed Action from the upper
 * half of Volume Up (#783).
 */
export function buttonTargets(
  buttons: readonly ChromeButton[],
  screen: ChromeRect,
  box: { width: number; height: number },
  reach: number,
): Rect[] {
  const rest = buttons.map(buttonHitRect)
  const grown = rest.map((r) => ({
    left: Math.max(0, r.left - reach), top: Math.max(0, r.top - reach),
    right: Math.min(box.width, r.right + reach), bottom: Math.min(box.height, r.bottom + reach),
  }))
  const out = grown.map((g, i) => inward(buttons[i], rest[i], g, screen))

  for (let i = 0; i < rest.length; i++) {
    for (let j = i + 1; j < rest.length; j++) {
      if (!overlaps(grown[i], grown[j])) continue
      const [a, b] = [rest[i], rest[j]]
      if (a.bottom <= b.top) cut(out[i], out[j], 'y', (a.bottom + b.top) / 2)
      else if (b.bottom <= a.top) cut(out[j], out[i], 'y', (b.bottom + a.top) / 2)
      else if (a.right <= b.left) cut(out[i], out[j], 'x', (a.right + b.left) / 2)
      else if (b.right <= a.left) cut(out[j], out[i], 'x', (b.right + a.left) / 2)
      // Buttons whose own pixels overlap have no gap to split; no device ships one.
    }
  }
  return out
}

/**
 * How far towards the device a target may reach — the side facing the screen.
 *
 * **A button on the device's edge stops at its own centre line**, which is where the frame's body
 * begins. Half of an edge button's rectangle is tucked under the frame (drawn above it), and the
 * device chrome centres the button on the body's edge. Measured on 2026-10-01 from rendered frames,
 * body edge against centre, in composite px: 30 / 32 on the left of an iPhone 15 Pro, 17 Pro and SE
 * (3rd gen); 879 / 878 for the 15 Pro's power button; 12–14 / 16 for the top buttons of an iPad Pro
 * 13 (M5), iPad mini (A17 Pro), iPad (A16) and iPad Air 11 (M4); 2243 / 2242 and 1873 / 1870 for the
 * iPads' right-side volume. Reaching on to the screen's edge instead, as the hit test before #785
 * did, made the black bezel between button and screen a Volume Down press. The body's exact edge is
 * known only inside `ios-agent` and is not on the wire; the centre is, to within 4 composite px —
 * under two CSS px.
 *
 * **Which side faces the device comes from `anchor`**, not from where the button sits against the
 * screen: a top button near a corner can lie wholly left of the screen's left edge, and a position
 * test would then cut it on the wrong axis. Every button measured carries one of the four edges.
 *
 * **A button drawn on the device's face (`onTop`, the iPhone SE home button) stops at the screen**
 * rather than at its centre, because its whole face is bezel; a tap inside the screen is a screen tap.
 */
function inward(btn: ChromeButton, r: Rect, g: Rect, s: ChromeRect): Rect {
  const sr = { left: s.x, top: s.y, right: s.x + s.width, bottom: s.y + s.height }
  const cx = (r.left + r.right) / 2
  const cy = (r.top + r.bottom) / 2
  const t = { ...g }
  switch (btn.anchor) {
    case 'left': t.right = Math.min(t.right, btn.onTop ? sr.left : cx); break
    case 'right': t.left = Math.max(t.left, btn.onTop ? sr.right : cx); break
    case 'top': t.bottom = Math.min(t.bottom, btn.onTop ? sr.top : cy); break
    case 'bottom': t.top = Math.max(t.top, btn.onTop ? sr.bottom : cy); break
    // An anchor no measured chrome has: keep the screen a screen, and nothing more.
    default:
      if (r.right <= sr.left) t.right = Math.min(t.right, sr.left)
      else if (r.left >= sr.right) t.left = Math.max(t.left, sr.right)
      else if (r.bottom <= sr.top) t.bottom = Math.min(t.bottom, sr.top)
      else if (r.top >= sr.bottom) t.top = Math.max(t.top, sr.bottom)
  }
  return t
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

/** `before` lies above (or left of) `after` on `axis`; neither may cross `at`. */
function cut(before: Rect, after: Rect, axis: 'x' | 'y', at: number): void {
  if (axis === 'y') { before.bottom = Math.min(before.bottom, at); after.top = Math.max(after.top, at) }
  else { before.right = Math.min(before.right, at); after.left = Math.max(after.left, at) }
}
