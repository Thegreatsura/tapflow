// Which physical side button a press lands on. The defect this covers was found by hand on a real
// simulator (2026-09-11): on an iPhone 15 Pro the upper half of Volume Up pressed the **Action**
// button — the tooltip said Action and the press followed it.
//
// Two things were wrong together, and the fixtures below separate them because fixing only the
// first leaves the second:
//
//   1. catchment was a fixed radius around each button's *centre*, so a tall button's own pixels
//      could sit nearer a short neighbour's centre;
//   2. the *first* button within range won, not the nearest — so the whole overlap band went to
//      whichever button `chrome.buttons` happened to list earlier.
//
// Every case names the mutation that kills it.
import type { ChromeButton } from '@tapflowio/protocol'
import { describe, expect, it } from 'vitest'
import { buttonHitRect, buttonTargets, type Rect } from '../../lib/buttonHit'

const REACH = 100
/** Far to the right of every fixture, so only the tests that move it see it. */
const FAR_SCREEN = { x: 4000, y: 0, width: 100, height: 100 }
/** The frame's composite box — larger than any fixture reach, except where a test narrows it. */
const BOX = { width: 1000, height: 2000 }

/**
 * 2× composite px, shaped like an iPhone 15 Pro's left edge: Action above a much taller Volume Up.
 *
 * **The two offsets differ on purpose.** A first version set `rolloverOffset` equal to
 * `normalOffset` — the ternary even had two identical branches — and that made the two places
 * `buttonHitRect` deliberately reads the rollover pair invisible: pointing both of them at
 * `normalOffset` left all ten cases green. `DeviceChromeLoader` fills them from different plist
 * offsets, and the gap between them *is* the hover slide the renderer animates, so a fixture where
 * they agree is a fixture that cannot see the axis this change moved.
 */
const button = (name: string, centreY: number, h: number, anchor = 'left'): ChromeButton => ({
  name,
  accessibilityTitle: name,
  anchor,
  onTop: false,
  normalOffset: { x: 40, y: centreY },
  rolloverOffset: { x: 32, y: anchor === 'top' ? centreY - 30 : centreY },
  buttonW: 24,
  buttonH: h,
  usagePage: 0,
  usage: 0,
})

//                        rect
const ACTION = button('action', 620, 110)      // 565 … 675
const VOLUME_UP = button('volume_up', 850, 280) // 710 … 990
const BUTTONS = [ACTION, VOLUME_UP] as const    // Action first — the order that used to decide

/** A left-edge button as `DeviceChromeLoader` measures one: rectangle x, y … y2. */
const side = (name: string, x: number, y: number, y2: number): ChromeButton => ({
  ...button(name, (y + y2) / 2, y2 - y), rolloverOffset: { x: x + 16, y: (y + y2) / 2 }, buttonW: 32,
})
/** A top-edge button: rectangle x … x2, y 0 … 32. */
const top = (name: string, x: number, x2: number): ChromeButton => ({
  ...button(name, 0, 32, 'top'), rolloverOffset: { x: (x + x2) / 2, y: 0 }, buttonW: x2 - x,
})

describe('buttonHitRect', () => {
  // **Horizontally from the rollover pair, vertically from the normal one** — which is what the
  // renderer draws at rest, and the asymmetry is the whole reason this function exists rather than
  // the caller doing the arithmetic.
  //
  // Mutation: `left = normalOffset.x - halfW`. Gives 28 instead of 20, so the target sits a slide's
  // width away from the pixels the user is aiming at.
  it('places a side button around its rollover x and its normal y', () => {
    expect(buttonHitRect(ACTION)).toEqual({ left: 20, top: 565, right: 44, bottom: 675 })
  })

  // Mutation: measure every anchor from `normalOffset.y`. The home button's rect moves to 1355 and
  // the target stops matching the pixels it is drawn on.
  it('measures a top-anchored button from its rollover offset', () => {
    const home = button('home', 1400, 90, 'top')
    expect(buttonHitRect(home).top).toBe(1370)
  })
})

// The targets the viewer renders as elements for the browser to hit-test (#785). What
// `pickButton` used to decide per pointer event is now decided once per layout, so the #783 cases
// carry over as properties of the rectangles.
describe('buttonTargets', () => {
  // Fixture side buttons sit at x 20…44, centred on 32. Along the edge they grow by the reach;
  // towards the device they stop at that centre (see the frame-body case below); outwards they stop
  // at the frame's box, x 0.
  //
  // Mutation: grow by `reach / 2`, or not at all. The target shrinks along the edge, towards the
  // ~10 CSS px a side button is drawn at.
  it('grows a lone button by the reach along its edge', () => {
    expect(buttonTargets([ACTION], FAR_SCREEN, BOX, REACH)).toEqual([{ left: 0, top: 465, right: 32, bottom: 775 }])
  })

  // An element can overflow its container, and the old hit test could not: it ran in the
  // container's handlers. Unclipped, a target reached about 35 CSS px past the frame, and a click in
  // the gap between device and status card pressed Power — found by adversarial review of #785.
  //
  // Mutation: drop the clamp on any side. `left` becomes -80, `right` 990, `top` -100 or `bottom` 1865.
  it('stops at the edge of the frame\'s box, never past it', () => {
    const power = { ...button('power', 900, 200, 'right'), rolloverOffset: { x: 878, y: 900 } } // x 866 … 890
    const [left] = buttonTargets([ACTION], FAR_SCREEN, BOX, REACH)
    const [right] = buttonTargets([power], { x: 62, y: 0, width: 780, height: 2000 }, { width: 900, height: 2000 }, REACH)
    expect(left.left).toBe(0)
    expect(right.right).toBe(900)
    // The top and bottom edges: an iPad's power button, and the SE home button below the screen.
    const [ipad] = buttonTargets([top('power', 1333, 1555)], { x: 120, y: 130, width: 1488, height: 2266 }, { width: 1728, height: 2516 }, REACH)
    const home = { ...button('home', 1700, 130, 'bottom'), onTop: true } // y 1635 … 1765
    const [se] = buttonTargets([home], { x: 82, y: 222, width: 750, height: 1334 }, { width: 914, height: 1778 }, REACH)
    expect(ipad.top).toBe(0)
    expect(se.bottom).toBe(1778)
  })

  // The #783 defect as a layout fact. Action ends at 675, Volume Up starts at 710; the midline is
  // 692.5, and y=715 — inside Volume Up, nearer Action's centre — is Volume Up's.
  //
  // Mutation: skip the cut, so the two grown rectangles overlap and stacking order decides.
  it('splits the gap between two stacked buttons at the midline, with no overlap', () => {
    const [action, up] = buttonTargets(BUTTONS, FAR_SCREEN, BOX, REACH)
    expect(action.bottom).toBe(692.5)
    expect(up.top).toBe(692.5)
    expect(up.top <= 715 && 715 <= up.bottom).toBe(true)
  })

  // Mutation: cut only the earlier button (or only the later one). The answer then depends on the
  // order the agent listed them in, which is the other half of what #783 fixed.
  it('gives the same boundary whatever order the buttons are listed in', () => {
    const [up, action] = buttonTargets([VOLUME_UP, ACTION], FAR_SCREEN, BOX, REACH)
    expect(action.bottom).toBe(692.5)
    expect(up.top).toBe(692.5)
  })

  // The frame's body is not a button. The device chrome centres an edge button on the body's edge
  // (measured: body at 30 against a centre of 32 on an iPhone 15 Pro), so the target stops there.
  // Stopping at the screen instead — x 74 here, as the hit test before #785 did — made the bezel
  // between button and screen press Volume Down, found by hand on the simulator.
  //
  // Mutation: stop every button at the screen edge. `right` becomes 74.
  it('stops a left-edge button at its own centre line, where the frame body begins', () => {
    const [action] = buttonTargets([ACTION], { x: 74, y: 0, width: 500, height: 2000 }, BOX, REACH)
    expect(action.right).toBe(32)
    expect(action.left).toBe(0)
  })

  // Mutation: drop the `right` case. The power button's target then covers the right bezel.
  it('stops a right-edge button at its centre line', () => {
    const power = { ...button('power', 900, 200, 'right'), rolloverOffset: { x: 878, y: 900 } } // x 866 … 890
    const [t] = buttonTargets([power], { x: 62, y: 0, width: 780, height: 2000 }, BOX, REACH)
    expect(t.left).toBe(878)
    expect(t.right).toBe(990)
  })

  // An iPad's power button, and an iPad mini's volume pair, sit on the top edge. This one lies wholly
  // left of the screen's left edge, as a button near a corner can, so a test of where it sits against
  // the screen would read it as a left-edge button and cut it on the wrong axis.
  //
  // Mutation: decide the side from position rather than `anchor`. `right` is then cut to 12 and
  // `bottom` is left at the full reach, over the bezel.
  it('takes the side facing the device from the anchor, not from position', () => {
    const corner = { ...button('power', 0, 32, 'top'), rolloverOffset: { x: 12, y: 0 } } // x 0 … 24, y 0 … 32
    const [t] = buttonTargets([corner], { x: 40, y: 60, width: 800, height: 1000 }, BOX, REACH)
    expect(t.bottom).toBe(16)
    expect(t.right).toBe(124)
  })

  // A button drawn on the device's face has no body edge to stop at — its whole face is bezel — so it
  // stops where the screen begins. A tap inside the screen is a screen tap.
  //
  // Mutation: treat it like an edge button. Its target then ends at its own centre and loses the half
  // of its face nearest the screen.
  it('stops a button on the device face (the SE home button) at the screen', () => {
    const home = { ...button('home', 1700, 130, 'bottom'), onTop: true } // y 1635 … 1765
    const [t] = buttonTargets([home], { x: 0, y: 0, width: 2000, height: 1556 }, BOX, REACH)
    expect(t.top).toBe(1556)
  })

  // Top-edge buttons sit side by side, so the gap between neighbours is horizontal.
  //
  // Mutation: only ever cut on y. Two side-by-side targets then overlap across their whole height.
  it('splits side-by-side buttons at the horizontal midline', () => {
    const left = { ...button('a', 0, 20, 'top'), rolloverOffset: { x: 100, y: 0 } }  // x 88 … 112
    const right = { ...button('b', 0, 20, 'top'), rolloverOffset: { x: 200, y: 0 } } // x 188 … 212
    const [a, b] = buttonTargets([left, right], FAR_SCREEN, BOX, REACH)
    expect(a.right).toBe(150)
    expect(b.left).toBe(150)
  })

  // WCAG 2.5.8 accepts a target under 24 × 24 CSS px when a 24 px circle centred on it touches no
  // other target and no other such circle. Clipped to the frame's box a side target is about 13 CSS
  // px across, so the spacing exception is the one it meets. Checked on layouts measured from real
  // chrome on 2026-10-01: an iPhone 15 Pro's left edge (display scale ≈ 0.42 CSS px per composite
  // px, so the circle is 58 composite px across) and an iPad mini's top edge, where three buttons
  // share it (≈ 0.29, so 83).
  //
  // Mutation: no midline cut. Neighbouring targets then overlap, and a circle lands on another target.
  it.each([
    ['iPhone 15 Pro, left edge', 58, { width: 910, height: 1776 }, { x: 62, y: 36, width: 786, height: 1704 }, [
      side('action', 16, 286, 354), side('volume-up', 16, 378, 506), side('volume-down', 16, 536, 664),
    ]],
    ['iPad mini (A17 Pro), top edge', 83, { width: 1728, height: 2516 }, { x: 120, y: 130, width: 1488, height: 2266 }, [
      top('volume-down', 154, 284), top('volume-up', 306, 436), top('power', 1333, 1555),
    ]],
  ] as const)('meets the 24 px spacing exception on %s', (_name, circle, box, screen, buttons) => {
    const targets = buttonTargets(buttons, screen, box, REACH)
    const r = circle / 2
    const centre = (t: Rect) => ({ x: (t.left + t.right) / 2, y: (t.top + t.bottom) / 2 })
    const distTo = (p: { x: number; y: number }, t: Rect) =>
      Math.hypot(Math.max(t.left - p.x, 0, p.x - t.right), Math.max(t.top - p.y, 0, p.y - t.bottom))
    targets.forEach((a, i) => targets.forEach((b, j) => {
      if (i === j) return
      expect(distTo(centre(a), b), `${buttons[i].name} circle reaches ${buttons[j].name}`).toBeGreaterThanOrEqual(r)
      expect(Math.hypot(centre(a).x - centre(b).x, centre(a).y - centre(b).y)).toBeGreaterThanOrEqual(circle)
    }))
  })

  it('answers nothing for a device with no buttons', () => {
    expect(buttonTargets([], FAR_SCREEN, BOX, REACH)).toEqual([])
  })
})
