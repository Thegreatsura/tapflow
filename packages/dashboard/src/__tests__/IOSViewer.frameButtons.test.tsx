import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * **The device frame's physical buttons are pressed through elements the browser hit-tests (#785).**
 *
 * The container used to work out which button a pointer was over by hand — composite-space
 * arithmetic, a nearest-rectangle search, and an inverse of the landscape rotation. Each button now
 * has an element laid out by `buttonTargets`, so the browser does all three. `buttonHit.test.ts`
 * holds the geometry; jsdom has no layout, so this file holds what a press *sends*, and that the
 * targets stay out of the accessibility tree — the frame is part of the streamed device, which
 * this package deliberately leaves out of scope (AGENTS.md).
 */

vi.mock('@/hooks/useClientRecording', () => ({
  useClientRecording: () => ({
    recordState: 'idle', recordCanvasRef: { current: null },
    setComposeFrame: () => {}, startClientRecording: () => {}, stopClientRecording: () => {},
  }),
}))
vi.mock('@/hooks/useDecoderStream', () => ({ useDecoderStream: () => {} }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }))

import { IOSViewer } from '@/components/device/IOSViewer'

const sideButton = (name: string, title: string, y: number) => ({
  name, accessibilityTitle: title, anchor: 'left', onTop: false,
  normalOffset: { x: 10, y }, rolloverOffset: { x: 8, y },
  buttonW: 12, buttonH: 100, usagePage: 0, usage: 0, buttonPng: 'AA==',
})

const chrome = {
  framePng: '', bezelWidth: 600, bezelHeight: 1200,
  compositeWidth: 640, compositeHeight: 1240,
  padding: { left: 20, right: 20, top: 20, bottom: 20 },
  screenRect: { x: 40, y: 40, width: 560, height: 1160 },
  screenCornerRadius: 40, logicalWidth: 390, logicalHeight: 844,
  buttons: [sideButton('action', 'Action', 300), sideButton('volume_up', 'Volume Up', 500)],
}

function renderViewer() {
  const send = vi.fn()
  const props = {
    sessionId: 's1', send, openUrl: vi.fn(), launchApp: vi.fn(),
    connected: true, joined: true, deviceReady: true, installing: false, installed: true,
    installError: null, bootError: null, launching: false, chrome,
    binaryFrameHandlerRef: { current: undefined }, clipboardHandlerRef: { current: undefined },
    clipboardSupported: true, networkHandlerRef: { current: undefined }, networkSupported: false,
    swKeyboardVisible: false, swKeyboardPending: false, onKbdToggle: vi.fn(),
    rebootPending: false, onReboot: vi.fn(), restartButtonRef: { current: null },
  // The prop surface is wide and none of it is what this file is about.
  } as unknown as React.ComponentProps<typeof IOSViewer>
  return { ...render(<IOSViewer {...props} />), send }
}

type Sent = { type: string; payload?: { name?: string; phase?: string } }
const sent = (send: ReturnType<typeof vi.fn>, type: string): Sent[] =>
  send.mock.calls.map(([m]) => m as Sent).filter((m) => m.type === type)
const phases = (send: ReturnType<typeof vi.fn>) =>
  sent(send, 'input:button').map((m) => `${m.payload?.name}:${m.payload?.phase}`)

const target = (container: HTMLElement, name: string) =>
  container.querySelector<HTMLElement>(`[data-frame-button="${name}"]`)!

// jsdom implements no pointer capture.
Element.prototype.setPointerCapture ??= () => {}

describe('IOSViewer — frame buttons are pressed through their own elements', () => {
  afterEach(() => vi.restoreAllMocks())

  // Mutation: render no target. Nothing on the frame can be pressed any more.
  it('gives every frame button a target', () => {
    const { container } = renderViewer()
    expect(target(container, 'action')).toBeTruthy()
    expect(target(container, 'volume_up')).toBeTruthy()
  })

  // The recorded decision: the frame is the streamed device, so its controls are neither named nor
  // focusable. Keyboard access to volume and power belongs in the toolbar, as on Android.
  //
  // Mutation: render a `<button aria-label>`, the shape #785 first proposed.
  it('keeps the targets out of the accessibility tree and the tab order', () => {
    const { container } = renderViewer()
    expect(screen.queryByRole('button', { name: 'Volume Up' })).toBeNull()
    const t = target(container, 'volume_up')
    expect(t.getAttribute('aria-hidden')).toBe('true')
    expect(t.tabIndex).toBe(-1)
  })

  // The release is not the target's own handler: it bubbles to the container, which sends `up` for
  // the button it recorded. So this also holds that the press recorded it.
  //
  // Mutation: let the press bubble too. The container then also starts a screen touch.
  it('presses down and releases, without touching the screen', () => {
    const { send, container } = renderViewer()
    fireEvent.pointerDown(target(container, 'volume_up'), { pointerId: 1, button: 0 })
    fireEvent.pointerUp(target(container, 'volume_up'), { pointerId: 1, button: 0 })
    expect(phases(send)).toEqual(['volume_up:down', 'volume_up:up'])
    expect(sent(send, 'input:touch:start')).toHaveLength(0)
  })

  // Mutation: not recording `pressedButton`. The cancel path then has nothing to release and the
  // HID button stays down on the device.
  it('releases a held button when the pointer is cancelled', () => {
    const { send, container } = renderViewer()
    fireEvent.pointerDown(target(container, 'volume_up'), { pointerId: 1, button: 0 })
    fireEvent.pointerCancel(target(container, 'volume_up'), { pointerId: 1 })
    expect(phases(send)).toEqual(['volume_up:down', 'volume_up:up'])
  })

  // Option + drag is a pinch wherever it starts, as when the container decided everything.
  //
  // Mutation: drop the `isOptionHeld` early return. The button is pressed instead.
  it('lets a pinch start on a frame button while Option is held', () => {
    const { send, container } = renderViewer()
    fireEvent.keyDown(window, { key: 'Alt', code: 'AltLeft' })
    fireEvent.pointerDown(target(container, 'volume_up'), { pointerId: 1, button: 0 })
    expect(sent(send, 'input:button')).toHaveLength(0)
    fireEvent.keyUp(window, { key: 'Alt', code: 'AltLeft' })
  })

  // Hover is the target's now. The tooltip names the button the pointer is on, and leaving it
  // removes the tooltip rather than leaving the last one up.
  //
  // The pointer leaves onto the frame, still inside the viewer: leaving the viewer altogether is
  // cleared by the container's own handler, which would hide a target that never clears its hover.
  //
  // Mutation: make the target's leave handler a no-op. The tooltip stays up over the bare frame.
  it('shows the button name while the pointer is over its target', () => {
    const { container } = renderViewer()
    const t = target(container, 'volume_up')
    fireEvent.pointerEnter(t)
    expect(screen.getByText('Volume Up')).toBeTruthy()
    fireEvent.pointerLeave(t, { relatedTarget: t.parentElement })
    expect(screen.queryByText('Volume Up')).toBeNull()
  })
})
