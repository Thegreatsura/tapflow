import { describe, it, expect, beforeEach } from 'vitest'
import { HostBootGate, GATE_DEFAULTS, type BootRequest, type Effect } from '../admission/HostBootGate.js'
import { isSettled } from '../admission/settle.js'
import { classifyBoot } from '../admission/classifyBoot.js'

const HOST = 'mac-1'
let now = 0
let gate: HostBootGate<string>

function req(sessionId: string, booterClass: 'interactive' | 'automated', over: Partial<BootRequest<string>> = {}): BootRequest<string> {
  return { hostKey: HOST, sessionId, requestId: `${sessionId}-r`, cost: 'cold', booterClass, message: `boot ${sessionId}`, ...over }
}
const kinds = (fx: Effect<string>[]): string[] => fx.filter((e) => e.kind !== 'log').map((e) => `${e.kind}:${e.sessionId}`)
const delivered = (fx: Effect<string>[]): string[] => fx.flatMap((e) => (e.kind === 'deliver' ? [e.sessionId] : []))
const logged = (fx: Effect<string>[]): string[] => fx.flatMap((e) => (e.kind === 'log' ? [e.event] : []))

/** Ready, then reports until the slot settles: one dropped, then three flat ones 5 s apart. */
function settle(sessionId: string): Effect<string>[] {
  const fx = gate.onEvent({ kind: 'ready', hostKey: HOST, sessionId, cold: true })
  for (const cpu of [0, 40, 42, 41]) { now += 5_000; fx.push(...gate.onEvent({ kind: 'sample', hostKey: HOST, cpuPercent: cpu })) }
  return fx
}

beforeEach(() => {
  now = 1_000_000
  gate = new HostBootGate<string>(() => now)
})

describe('isSettled', () => {
  it('wants three flat samples under the ceiling', () => {
    expect(isSettled([40, 45])).toBe(false)
    expect(isSettled([40, 45, 50])).toBe(true)
    expect(isSettled([40, 45, 51])).toBe(false) // spread 11
    expect(isSettled([88, 89, 90])).toBe(false) // one at the ceiling
    expect(isSettled([95, 60, 61, 62])).toBe(true) // only the last three count
  })
})

describe('classifyBoot', () => {
  it('charges only a boot that brings a device up', () => {
    expect(classifyBoot('booted', undefined)).toBe('warm')
    expect(classifyBoot('booted', 'app-only')).toBe('warm')
    expect(classifyBoot('booted', 'full-erase')).toBe('cold')
    expect(classifyBoot('shutdown', undefined)).toBe('cold')
    expect(classifyBoot('unknown', 'app-only')).toBe('cold')
  })
})

describe('HostBootGate', () => {
  it('lets one cold boot through per Mac and refuses the next automated one', () => {
    expect(kinds(gate.admit(req('a', 'automated')))).toEqual(['deliver:a'])
    const second = gate.admit(req('b', 'automated'))
    expect(second).toEqual([{ kind: 'refuse', sessionId: 'b', requestId: 'b-r', reason: 'host-booting', message: 'boot b' }])
    expect(gate.isBooting(HOST)).toBe(true)
  })

  it('does not charge a warm boot, and keeps Macs apart', () => {
    gate.admit(req('a', 'automated'))
    expect(kinds(gate.admit(req('b', 'automated', { cost: 'warm' })))).toEqual(['deliver:b'])
    expect(kinds(gate.admit(req('c', 'automated', { hostKey: 'mac-2' })))).toEqual(['deliver:c'])
  })

  it('holds a person behind a boot and lets them through when it settles', () => {
    gate.admit(req('a', 'automated'))
    const held = gate.admit(req('p', 'interactive'))
    expect(kinds(held)).toEqual([])
    expect(logged(held)).toEqual(['held'])
    expect(delivered(settle('a'))).toEqual(['p'])
    expect(gate.isBooting(HOST)).toBe(true) // the person's boot now holds it
  })

  it('puts the person ahead of an automated retry while they wait', () => {
    gate.admit(req('a', 'automated'))
    gate.admit(req('p', 'interactive'))
    expect(gate.admit(req('b', 'automated'))[0]).toMatchObject({ kind: 'refuse' })
  })

  it('sends a person after humanWaitMs whatever the slot says', () => {
    gate.admit(req('a', 'automated'))
    expect(delivered(gate.admit(req('p', 'interactive')))).toEqual([])
    expect(gate.nextDeadline()).toBe(now + GATE_DEFAULTS.humanWaitMs)
    now += GATE_DEFAULTS.humanWaitMs
    const fx = gate.tick()
    expect(delivered(fx)).toEqual(['p'])
    expect(logged(fx)).toContain('human-wait-expired')
  })

  it('lets a second person through at once rather than queue them', () => {
    gate.admit(req('a', 'automated'))
    gate.admit(req('p', 'interactive'))
    const fx = gate.admit(req('q', 'interactive'))
    expect(delivered(fx)).toEqual(['q'])
    expect(logged(fx)).toContain('overlap')
  })

  it('keeps a reconnecting person in their place and answers the request they replaced', () => {
    gate.admit(req('a', 'automated'))
    const t0 = now
    gate.admit(req('p', 'interactive'))
    now += 10_000
    const again = gate.admit(req('p', 'interactive', { requestId: 'p-r2', message: 'boot p again' }))
    expect(again).toEqual([{ kind: 'withdraw', sessionId: 'p', requestId: 'p-r', why: 'replaced', message: 'boot p' }])
    expect(gate.nextDeadline()).toBe(t0 + GATE_DEFAULTS.humanWaitMs) // the clock did not restart
    const fx = settle('a')
    expect(fx).toContainEqual({ kind: 'deliver', sessionId: 'p', requestId: 'p-r2', message: 'boot p again' })
    expect(delivered(fx)).toEqual(['p']) // once
  })

  it('drops a held boot whose person went away', () => {
    gate.admit(req('a', 'automated'))
    gate.admit(req('p', 'interactive'))
    expect(gate.onEvent({ kind: 'browser-closed', sessionId: 'p' }))
      .toEqual([{ kind: 'withdraw', sessionId: 'p', requestId: 'p-r', why: 'cancelled', message: 'boot p' }])
    expect(delivered(settle('a'))).toEqual([])
  })

  describe('release', () => {
    beforeEach(() => { gate.admit(req('a', 'automated')) })
    const free = (): boolean => !gate.isBooting(HOST)

    it('on settling', () => { settle('a'); expect(free()).toBe(true) })
    it('on shutdown-done', () => { gate.onEvent({ kind: 'shutdown-done', sessionId: 'a' }); expect(free()).toBe(true) })
    it('on session removal', () => { gate.onEvent({ kind: 'session-removed', sessionId: 'a' }); expect(free()).toBe(true) })
    it('on the current boot failing', () => { gate.onEvent({ kind: 'boot-error', sessionId: 'a', requestId: 'a-r' }); expect(free()).toBe(true) })
    it('on a dead stream with no correlator', () => { gate.onEvent({ kind: 'boot-error', sessionId: 'a' }); expect(free()).toBe(true) })
    it('when the agent says the device was already up', () => { gate.onEvent({ kind: 'ready', hostKey: HOST, sessionId: 'a', cold: false }); expect(free()).toBe(true) })

    it('not on a superseded boot failing', () => {
      gate.admit(req('a', 'automated', { requestId: 'a-r2' }))
      gate.onEvent({ kind: 'boot-error', sessionId: 'a', requestId: 'a-r' })
      expect(free()).toBe(false)
    })

    it('not when the person closes their tab', () => {
      gate.onEvent({ kind: 'browser-closed', sessionId: 'a' })
      expect(free()).toBe(false)
    })

    it('after bootMs stuck booting', () => {
      now += GATE_DEFAULTS.bootMs - 1
      gate.tick(); expect(free()).toBe(false)
      now += 1
      expect(logged(gate.tick())).toContain('boot-timeout'); expect(free()).toBe(true)
    })

    it('after settleCapMs of samples that never flatten', () => {
      gate.onEvent({ kind: 'ready', hostKey: HOST, sessionId: 'a', cold: true })
      const readyAt = now
      for (let i = 0; now < readyAt + GATE_DEFAULTS.settleCapMs - 5_000; i++) {
        now += 5_000
        gate.onEvent({ kind: 'sample', hostKey: HOST, cpuPercent: i % 2 ? 30 : 80 })
      }
      gate.tick(); expect(free()).toBe(false)
      now = readyAt + GATE_DEFAULTS.settleCapMs
      expect(logged(gate.tick())).toContain('settle-timeout'); expect(free()).toBe(true)
    })

    it('after noSampleMs with no report at all', () => {
      gate.onEvent({ kind: 'ready', hostKey: HOST, sessionId: 'a', cold: true })
      now += GATE_DEFAULTS.noSampleMs
      expect(logged(gate.tick())).toContain('no-samples'); expect(free()).toBe(true)
    })

    it('after a rebind nobody follows up', () => {
      gate.onEvent({ kind: 'rebound', sessionId: 'a' })
      now += GATE_DEFAULTS.reboundMs
      expect(logged(gate.tick())).toContain('rebound-abandoned'); expect(free()).toBe(true)
    })

    it('not after a rebind once the device is settling: the settle clocks own it then', () => {
      gate.onEvent({ kind: 'ready', hostKey: HOST, sessionId: 'a', cold: true })
      now += 1_000
      gate.onEvent({ kind: 'sample', hostKey: HOST, cpuPercent: 80 })
      gate.onEvent({ kind: 'rebound', sessionId: 'a' })
      now += GATE_DEFAULTS.reboundMs
      gate.tick(); expect(free()).toBe(false)
    })

    it('not after a rebind the session follows up, which inherits the slot', () => {
      gate.onEvent({ kind: 'rebound', sessionId: 'a' })
      now += 1_000
      expect(kinds(gate.admit(req('a', 'automated', { requestId: 'a-r2' })))).toEqual(['deliver:a'])
      now += GATE_DEFAULTS.reboundMs
      gate.tick(); expect(free()).toBe(false)
    })
  })

  it('skips a second agent reporting close behind the first, so three samples stay 15 s', () => {
    gate.admit(req('a', 'automated'))
    gate.onEvent({ kind: 'ready', hostKey: HOST, sessionId: 'a', cold: true })
    for (const cpu of [0, 40, 41, 42]) {
      now += 2_500
      gate.onEvent({ kind: 'sample', hostKey: HOST, cpuPercent: cpu })
    }
    expect(gate.isBooting(HOST)).toBe(true) // only two of those four were taken
  })

  it('claims the slot for a boot let through warm that the agent had to bring up', () => {
    gate.admit(req('a', 'interactive', { cost: 'warm' }))
    gate.onEvent({ kind: 'ready', hostKey: HOST, sessionId: 'a', cold: true })
    expect(gate.isBooting(HOST)).toBe(true)
    expect(gate.admit(req('b', 'automated'))[0]).toMatchObject({ kind: 'refuse' })
  })

  describe('aging', () => {
    /** A person takes the free slot, an automated client is refused behind them, and the person settles. */
    function personRound(id: string): Effect<string>[] {
      expect(kinds(gate.admit(req(id, 'interactive')))).toEqual([`deliver:${id}`])
      expect(gate.admit(req('auto', 'automated'))[0]).toMatchObject({ kind: 'refuse' })
      return settle(id)
    }

    it('keeps the slot for automation after agingCount people in a row while it waited', () => {
      gate.admit(req('first', 'interactive'))
      gate.admit(req('auto', 'automated')) // refused
      settle('first')
      let fx: Effect<string>[] = []
      for (let i = 0; i < GATE_DEFAULTS.agingCount; i++) fx = personRound(`p${i}`)
      expect(logged(fx)).toContain('aging-window')
      // a person now waits, and the next automated retry gets the slot
      expect(logged(gate.admit(req('late', 'interactive')))).toEqual(['held'])
      expect(kinds(gate.admit(req('auto', 'automated')))).toEqual(['deliver:auto'])
    })

    it('does not open the window when nobody automated was refused recently', () => {
      gate.admit(req('auto', 'automated'))
      settle('auto')
      now += GATE_DEFAULTS.recentRefusalMs + 1
      for (let i = 0; i < GATE_DEFAULTS.agingCount + 1; i++) {
        gate.admit(req(`p${i}`, 'interactive'))
        expect(logged(settle(`p${i}`))).not.toContain('aging-window')
      }
    })

    it('hands the slot back to the waiting person when the window passes unused', () => {
      gate.admit(req('first', 'interactive'))
      gate.admit(req('auto', 'automated'))
      settle('first')
      for (let i = 0; i < GATE_DEFAULTS.agingCount; i++) personRound(`p${i}`)
      gate.admit(req('late', 'interactive'))
      now += GATE_DEFAULTS.agingWindowMs
      expect(delivered(gate.tick())).toEqual(['late'])
    })
  })
})
