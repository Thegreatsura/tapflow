import { createLogger } from '../logger.js'

/** Local wall-clock time as `HH:MM:SS.mmm`, the stamp every logger line starts with. */
export function formatClock(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`
}

export interface RelayLoss {
  code?: number
  reason?: string
  /** `code` of the last socket error after registration (ETIMEDOUT, ECONNRESET, …), if any. */
  errorCode?: string
  /** When the relay last pinged this connection; `null` when it never did. */
  lastPingAt?: number | null
  now: number
}

/**
 * The detail for an agent's "relay disconnected" line. The close code alone cannot say who ended the
 * connection — a relay terminating an agent that stopped answering, a relay crash and a network loss all
 * arrive as 1006. The time since the relay's last ping separates them: a recent ping means the link was
 * up and the agent was the one that went quiet; a long silence with a socket error means the network.
 */
export function describeRelayLoss(loss: RelayLoss): string {
  if (loss.code === undefined) return 'no close details'
  const parts = [`code ${loss.code}${loss.reason ? ` ${loss.reason}` : ''}`]
  if (loss.errorCode) parts.push(`error ${loss.errorCode}`)
  parts.push(loss.lastPingAt == null
    ? 'no ping received'
    : `last ping ${Math.round((loss.now - loss.lastPingAt) / 1000)}s ago`)
  return parts.join(', ')
}

export interface StallReport {
  blockedMs: number
  startedAt: Date
  /** CPU time this process used during the stall: high means JavaScript was busy, near zero means it
   *  was waiting (a synchronous child process) or not scheduled. */
  cpuMs: number
  /** Major page faults during the stall: high on a host that is swapping. */
  majorFaults: number
}

export interface LoopStallWatchOptions {
  onStall: (report: StallReport) => void
  intervalMs?: number
  thresholdMs?: number
  /** Monotonic clock. macOS stops it while the system sleeps, so a sleeping laptop is not a stall. */
  now?: () => number
  wallNow?: () => number
  cpuMicros?: () => number
  majorFaults?: () => number
  setInterval?: (fn: () => void, ms: number) => ReturnType<typeof setInterval>
  clearInterval?: (t: ReturnType<typeof setInterval>) => void
}

/**
 * Notices when this process's event loop was held. A synchronous child process on the boot or install
 * path freezes the loop, and with it the WebSocket's automatic pong, which is how the relay comes to
 * terminate a live agent. One line per stall, not per tick.
 */
export function createLoopStallWatch(opts: LoopStallWatchOptions): { start(): void; stop(): void } {
  const intervalMs = opts.intervalMs ?? 1000
  const thresholdMs = opts.thresholdMs ?? 2000
  const now = opts.now ?? (() => performance.now())
  const wallNow = opts.wallNow ?? (() => Date.now())
  const cpuMicros = opts.cpuMicros ?? (() => { const u = process.cpuUsage(); return u.user + u.system })
  const majorFaults = opts.majorFaults ?? (() => process.resourceUsage().majorPageFault)
  const set = opts.setInterval ?? ((fn, ms) => setInterval(fn, ms))
  const clear = opts.clearInterval ?? ((t) => clearInterval(t))

  let timer: ReturnType<typeof setInterval> | null = null
  let last = 0
  let lastCpu = 0
  let lastFaults = 0

  const tick = (): void => {
    const t = now()
    const cpu = cpuMicros()
    const faults = majorFaults()
    const blockedMs = t - last - intervalMs
    if (blockedMs >= thresholdMs) {
      opts.onStall({
        blockedMs: Math.round(blockedMs),
        startedAt: new Date(wallNow() - blockedMs),
        cpuMs: Math.round((cpu - lastCpu) / 1000),
        majorFaults: faults - lastFaults,
      })
    }
    last = t; lastCpu = cpu; lastFaults = faults
  }

  return {
    start(): void {
      if (timer) return
      last = now(); lastCpu = cpuMicros(); lastFaults = majorFaults()
      timer = set(tick, intervalMs)
      timer.unref?.()
    },
    stop(): void {
      if (timer) clear(timer)
      timer = null
    },
  }
}

let holders = 0
let shared: { start(): void; stop(): void } | null = null

/**
 * One watch per process, however many relays and agents it hosts — `tapflow start` runs the relay and up
 * to two agents together, and one stall would otherwise be reported once by each. Returns a release
 * function; safe to call more than once. A no-op under vitest, where tests move the clock on purpose.
 */
export function acquireLoopStallWatch(): () => void {
  if (process.env.VITEST) return () => {}
  if (holders++ === 0) {
    const log = createLogger('stall')
    shared = createLoopStallWatch({
      onStall: (r) => log.warn(
        `event loop blocked for ${(r.blockedMs / 1000).toFixed(1)}s ` +
        `(from ${formatClock(r.startedAt)}; cpu ${(r.cpuMs / 1000).toFixed(1)}s; ${r.majorFaults} major page faults)`,
      ),
    })
    shared.start()
  }
  let released = false
  return () => {
    if (released) return
    released = true
    if (--holders === 0) { shared?.stop(); shared = null }
  }
}
