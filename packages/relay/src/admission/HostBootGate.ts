import type { BootRefusalReason } from '@tapflowio/protocol'
import { isSettled, SETTLE } from './settle.js'

/**
 * One cold boot at a time per Mac, and a person never refused for it.
 *
 * A device that has finished booting does not slow the other sessions on its Mac; the boot does, for 30–90 s
 * (`contributing/simulator-boot-contention.md`). So each Mac has one boot **slot**, held from the moment a cold
 * boot is let through until the device has settled. An automated client (flow runner, MCP) that finds it taken is
 * refused with `host-booting` and retries on its own. A person is never refused: their boot waits in the Mac's
 * one-place **reservation**, which goes ahead of any automated retry, for at most `humanWaitMs`.
 *
 * Pure state: no sockets and no timers. Every call returns what the relay should do, and `nextDeadline()` says
 * when it must call `tick()`. That is read after the relay has carried out the effects rather than returned with
 * them, because carrying one out can feed the gate again (a held boot whose agent has gone is answered and
 * released), and a deadline returned before that would already be stale. The message a held boot carries rides in the gate as `M`, so there
 * is one owner of a held boot rather than a gate entry and a relay map that can disagree.
 *
 * **What releases a slot is a closed list** (`GateEvent`), not a general release call. A rebind, a correlator's
 * TTL or an evicted boot record does not appear in it, because the device is still booting on that Mac through
 * all three — the slot is about the Mac, `pendingBoots` is about who is waiting for an answer.
 */

export type BooterClass = 'interactive' | 'automated'

export interface GateTiming {
  /** A slot still `booting` after this is let go. The clients' own boot deadline: past it nobody is waiting. */
  bootMs: number
  /** A settling slot is let go this long after ready, settled or not. The slowest measured settle was 84 s. */
  settleCapMs: number
  /** With no CPU sample at all since ready, the slot is let go after this. Covers 76–84 s unmodified settles. */
  noSampleMs: number
  /** A person's boot waits in the reservation at most this long, then goes ahead regardless. */
  humanWaitMs: number
  /** After a rebind during booting, a slot whose session sends no new boot for this long is taken as abandoned. */
  reboundMs: number
  /** After this many people in a row took the slot while an automated client was being refused… */
  agingCount: number
  /** …the next free slot is kept for automation this long. Longer than the clients' largest backoff. */
  agingWindowMs: number
  /** An automated refusal counts as someone still waiting for this long. About twice the largest backoff. */
  recentRefusalMs: number
}

/** Numbers and their sources: L2 admission plan, appendix 숫자 결정. */
export const GATE_DEFAULTS: GateTiming = {
  bootMs: 180_000,
  settleCapMs: 120_000,
  noSampleMs: 90_000,
  humanWaitMs: 60_000,
  reboundMs: 30_000,
  agingCount: 3,
  agingWindowMs: 45_000,
  recentRefusalMs: 60_000,
}

export interface BootRequest<M> {
  hostKey: string
  sessionId: string
  requestId: string
  cost: 'cold' | 'warm'
  booterClass: BooterClass
  message: M
}

export type GateLogEvent =
  | 'overlap'
  | 'boot-timeout'
  | 'settle-timeout'
  | 'no-samples'
  | 'human-wait-expired'
  | 'rebound-abandoned'
  | 'aging-window'

export type Effect<M> =
  /** Send this boot to its agent now. */
  | { kind: 'deliver'; sessionId: string; requestId: string; message: M }
  /** Answer this automated boot with `device:boot-error` and the reason; it was never forwarded. */
  | { kind: 'refuse'; sessionId: string; requestId: string; reason: BootRefusalReason; message: M }
  /** A person's boot is now held; tell them, and when it goes ahead regardless. */
  | { kind: 'waiting'; sessionId: string; requestId: string; until: number; message: M }
  /** A held boot that will not go ahead: answer it with `device:boot-error`. */
  | { kind: 'withdraw'; sessionId: string; requestId: string; why: 'cancelled' | 'replaced'; message: M }
  | { kind: 'log'; event: GateLogEvent; hostKey: string; sessionId?: string }

export type GateEvent =
  /** The agent's `device:ready`. `cold` is its own account, absent from an agent that predates it. */
  | { kind: 'ready'; hostKey: string; sessionId: string; cold?: boolean }
  /** One `agent:resources` report from any agent on that Mac. */
  | { kind: 'sample'; hostKey: string; cpuPercent: number }
  /** The agent's `device:boot-error`. No `requestId` is an Android stream that died outside a boot. */
  | { kind: 'boot-error'; sessionId: string; requestId?: string }
  | { kind: 'shutdown-done'; sessionId: string }
  | { kind: 'session-removed'; sessionId: string }
  /** The person's socket went away or they left: a held boot has nobody to show it to. */
  | { kind: 'browser-closed'; sessionId: string }
  /** The session moved to a restarted agent while its device may still be booting. */
  | { kind: 'rebound'; sessionId: string }

interface Slot {
  sessionId: string
  /** The boot whose failure releases the slot. Empty for a slot claimed from a ready, which no failure names. */
  requestId: string
  phase: 'booting' | 'settling'
  since: number
  readyAt: number | null
  /** CPU since ready, the first report dropped. */
  samples: number[]
  droppedFirst: boolean
  lastSampleAt: number | null
  reboundAt: number | null
}

interface Held<M> {
  sessionId: string
  requestId: string
  message: M
  since: number
}

interface Host<M> {
  slot: Slot | null
  reservation: Held<M> | null
  /** People given the slot in a row while automation was being refused. */
  humanStreak: number
  lastAutomatedRefusalAt: number | null
  agingWindowUntil: number | null
}

/**
 * Two agents on one Mac each report every 5 s, and each report is the host's CPU averaged since that agent's
 * previous one. Taking both would make `SETTLE.samples` mean half the time it was measured at, so a report
 * closer than this to the last one taken is skipped.
 */
const MIN_SAMPLE_GAP_MS = 4_000

export class HostBootGate<M> {
  private readonly hosts = new Map<string, Host<M>>()

  constructor(
    private readonly now: () => number,
    private readonly timing: GateTiming = GATE_DEFAULTS,
  ) {}

  admit(req: BootRequest<M>): Effect<M>[] {
    const fx: Effect<M>[] = []
    const host = this.host(req.hostKey)
    const now = this.now()

    if (host.reservation?.sessionId === req.sessionId) {
      // The same person asked again (a reconnect re-sends its boot). Keep their place and their clock.
      fx.push({ kind: 'withdraw', sessionId: req.sessionId, requestId: host.reservation.requestId, why: 'replaced', message: host.reservation.message })
      if (req.cost === 'warm') {
        host.reservation = null
        fx.push(this.deliverOf(req))
      } else {
        host.reservation = { ...host.reservation, requestId: req.requestId, message: req.message }
        fx.push({ kind: 'waiting', sessionId: req.sessionId, requestId: req.requestId, until: host.reservation.since + this.timing.humanWaitMs, message: req.message })
      }
      return fx
    }

    if (host.slot?.sessionId === req.sessionId) {
      // A re-boot of the device already holding the slot: the agent supersedes its own boot, and the Mac is
      // paying for one boot, not two. The slot follows the newest correlator so only its failure releases it.
      Object.assign(host.slot, { requestId: req.requestId, phase: 'booting', since: now, readyAt: null, samples: [], droppedFirst: false, reboundAt: null })
      fx.push(this.deliverOf(req))
      return fx
    }

    if (req.cost === 'warm') {
      fx.push(this.deliverOf(req))
      return fx
    }

    const windowOpen = host.agingWindowUntil !== null
    if (req.booterClass === 'automated') {
      if (host.slot === null && (windowOpen || host.reservation === null)) {
        this.takeSlot(host, req)
        host.humanStreak = 0
        host.agingWindowUntil = null
        fx.push(this.deliverOf(req))
      } else {
        host.lastAutomatedRefusalAt = now
        fx.push({ kind: 'refuse', sessionId: req.sessionId, requestId: req.requestId, reason: 'host-booting', message: req.message })
      }
      return fx
    }

    if (host.slot === null && !windowOpen) {
      this.takeSlot(host, req)
      this.noteHumanGrant(host)
      fx.push(this.deliverOf(req))
    } else if (host.reservation === null) {
      host.reservation = { sessionId: req.sessionId, requestId: req.requestId, message: req.message, since: now }
      fx.push({ kind: 'waiting', sessionId: req.sessionId, requestId: req.requestId, until: now + this.timing.humanWaitMs, message: req.message })
    } else {
      // The one place is taken. A second person at once is rare enough to let through rather than queue.
      fx.push({ kind: 'log', event: 'overlap', hostKey: req.hostKey, sessionId: req.sessionId })
      fx.push(this.deliverOf(req))
    }
    return fx
  }

  onEvent(ev: GateEvent): Effect<M>[] {
    const fx: Effect<M>[] = []
    switch (ev.kind) {
      case 'ready': {
        const found = this.slotOf(ev.sessionId)
        if (found) {
          if (ev.cold === false) {
            // Charged as cold, and the agent found the device running: nothing to wait for.
            this.release(found.key, found.host, fx)
          } else {
            Object.assign(found.host.slot!, { phase: 'settling', readyAt: this.now(), samples: [], droppedFirst: false, lastSampleAt: null })
          }
        } else if (ev.cold === true) {
          // Let through as warm, and the agent had to bring it up after all (stopped between our view and its).
          const host = this.host(ev.hostKey)
          if (host.slot === null) {
            const now = this.now()
            host.slot = { sessionId: ev.sessionId, requestId: '', phase: 'settling', since: now, readyAt: now, samples: [], droppedFirst: false, lastSampleAt: null, reboundAt: null }
          } else {
            fx.push({ kind: 'log', event: 'overlap', hostKey: ev.hostKey, sessionId: ev.sessionId })
          }
        }
        break
      }
      case 'sample': {
        const slot = this.hosts.get(ev.hostKey)?.slot
        if (!slot || slot.phase !== 'settling') break
        const now = this.now()
        if (slot.lastSampleAt !== null && now - slot.lastSampleAt < MIN_SAMPLE_GAP_MS) break
        if (slot.lastSampleAt !== null && now - slot.lastSampleAt > SETTLE.freshMs) slot.samples = []
        slot.lastSampleAt = now
        if (!slot.droppedFirst) { slot.droppedFirst = true; break }
        slot.samples.push(ev.cpuPercent)
        if (isSettled(slot.samples)) this.release(ev.hostKey, this.host(ev.hostKey), fx)
        break
      }
      case 'boot-error': {
        const found = this.slotOf(ev.sessionId)
        if (found && (ev.requestId === undefined || ev.requestId === found.host.slot!.requestId)) {
          this.release(found.key, found.host, fx)
        }
        break
      }
      case 'shutdown-done':
      case 'session-removed': {
        this.withdrawHeld(ev.sessionId, fx)
        const found = this.slotOf(ev.sessionId)
        if (found) this.release(found.key, found.host, fx)
        break
      }
      case 'browser-closed':
        this.withdrawHeld(ev.sessionId, fx)
        break
      case 'rebound': {
        const found = this.slotOf(ev.sessionId)
        if (found) found.host.slot!.reboundAt = this.now()
        break
      }
      default: {
        const never: never = ev
        throw new Error(`unhandled gate event ${JSON.stringify(never)}`)
      }
    }
    return fx
  }

  /** Act on every deadline that has passed. */
  tick(): Effect<M>[] {
    const fx: Effect<M>[] = []
    const now = this.now()
    const t = this.timing
    for (const [key, host] of this.hosts) {
      const slot = host.slot
      if (slot) {
        let expired: GateLogEvent | null = null
        // Only while booting: once the device is up its slot runs on the settle clocks, and the automated clients
        // re-boot after a rebind only when their next step needs it, so a settling device would be released early.
        if (slot.phase === 'booting' && slot.reboundAt !== null && now >= slot.reboundAt + t.reboundMs) expired = 'rebound-abandoned'
        else if (slot.phase === 'booting' && now >= slot.since + t.bootMs) expired = 'boot-timeout'
        else if (slot.phase === 'settling' && slot.readyAt !== null) {
          if (now >= slot.readyAt + t.settleCapMs) expired = 'settle-timeout'
          else if (slot.lastSampleAt === null && now >= slot.readyAt + t.noSampleMs) expired = 'no-samples'
        }
        if (expired) {
          fx.push({ kind: 'log', event: expired, hostKey: key, sessionId: slot.sessionId })
          this.release(key, host, fx)
        }
      }
      if (host.agingWindowUntil !== null && now >= host.agingWindowUntil) {
        host.agingWindowUntil = null
        host.humanStreak = 0
        this.dispatchReservation(host, fx)
      }
      const held = host.reservation
      if (held && now >= held.since + t.humanWaitMs) {
        host.reservation = null
        fx.push({ kind: 'log', event: 'human-wait-expired', hostKey: key, sessionId: held.sessionId })
        fx.push({ kind: 'deliver', sessionId: held.sessionId, requestId: held.requestId, message: held.message })
      }
    }
    return fx
  }

  /** Whether a cold boot is being paid for on this Mac now. The relay pauses its CPU join gate while it is. */
  isBooting(hostKey: string): boolean {
    return this.hosts.get(hostKey)?.slot != null
  }

  private release(key: string, host: Host<M>, fx: Effect<M>[]): void {
    host.slot = null
    const now = this.now()
    const automationWaiting = host.lastAutomatedRefusalAt !== null && now - host.lastAutomatedRefusalAt <= this.timing.recentRefusalMs
    if (automationWaiting && host.humanStreak >= this.timing.agingCount) {
      host.agingWindowUntil = now + this.timing.agingWindowMs
      fx.push({ kind: 'log', event: 'aging-window', hostKey: key })
      return
    }
    this.dispatchReservation(host, fx)
  }

  private dispatchReservation(host: Host<M>, fx: Effect<M>[]): void {
    const held = host.reservation
    if (!held || host.slot !== null || host.agingWindowUntil !== null) return
    host.reservation = null
    this.takeSlot(host, held)
    this.noteHumanGrant(host)
    fx.push({ kind: 'deliver', sessionId: held.sessionId, requestId: held.requestId, message: held.message })
  }

  private noteHumanGrant(host: Host<M>): void {
    const automationWaiting = host.lastAutomatedRefusalAt !== null && this.now() - host.lastAutomatedRefusalAt <= this.timing.recentRefusalMs
    host.humanStreak = automationWaiting ? host.humanStreak + 1 : 0
  }

  private withdrawHeld(sessionId: string, fx: Effect<M>[]): void {
    for (const host of this.hosts.values()) {
      if (host.reservation?.sessionId !== sessionId) continue
      fx.push({ kind: 'withdraw', sessionId, requestId: host.reservation.requestId, why: 'cancelled', message: host.reservation.message })
      host.reservation = null
    }
  }

  private takeSlot(host: Host<M>, req: { sessionId: string; requestId: string }): void {
    host.slot = { sessionId: req.sessionId, requestId: req.requestId, phase: 'booting', since: this.now(), readyAt: null, samples: [], droppedFirst: false, lastSampleAt: null, reboundAt: null }
  }

  private deliverOf(req: BootRequest<M>): Effect<M> {
    return { kind: 'deliver', sessionId: req.sessionId, requestId: req.requestId, message: req.message }
  }

  private slotOf(sessionId: string): { key: string; host: Host<M> } | null {
    for (const [key, host] of this.hosts) if (host.slot?.sessionId === sessionId) return { key, host }
    return null
  }

  private host(key: string): Host<M> {
    let host = this.hosts.get(key)
    if (!host) {
      host = { slot: null, reservation: null, humanStreak: 0, lastAutomatedRefusalAt: null, agingWindowUntil: null }
      this.hosts.set(key, host)
    }
    return host
  }

  /** When `tick()` must next run, or null when nothing is pending. */
  nextDeadline(): number | null {
    const t = this.timing
    let next: number | null = null
    const consider = (at: number): void => { if (next === null || at < next) next = at }
    for (const host of this.hosts.values()) {
      const slot = host.slot
      if (slot) {
        if (slot.phase === 'booting' && slot.reboundAt !== null) consider(slot.reboundAt + t.reboundMs)
        if (slot.phase === 'booting') consider(slot.since + t.bootMs)
        else if (slot.readyAt !== null) {
          consider(slot.readyAt + t.settleCapMs)
          if (slot.lastSampleAt === null) consider(slot.readyAt + t.noSampleMs)
        }
      }
      if (host.agingWindowUntil !== null) consider(host.agingWindowUntil)
      if (host.reservation) consider(host.reservation.since + t.humanWaitMs)
    }
    return next
  }
}
