import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { WebSocket } from 'ws'
import { RelayServer } from '../RelayServer'
import { initDb, closeDb } from '../db'
import { waitForOpen, waitForType, waitForTypeOrNull } from '@tapflowio/test-utils'
import type { AgentRegistered, AgentsListed, DeviceBoot, DeviceBootError, DeviceBootWaiting, GenericError, SessionJoined } from '@tapflowio/protocol'

// The wiring half of `admission/HostBootGate.ts`. The gate's rules are in `hostBootGate.test.ts`; these check
// that the relay's messages reach it, and the claims a unit test cannot make — that the paths which must *not*
// release a slot (a correlator's TTL, a rebind) really do not, since the gate has no input for them at all.
describe('the relay routes boots through the per-Mac boot gate', () => {
  let server: RelayServer
  let port: number
  let tmpDir: string
  const sockets: WebSocket[] = []

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tapflow-boot-gate-'))
    initDb(path.join(tmpDir, 'test.db'))
  })
  afterAll(() => {
    closeDb()
    fs.rmSync(tmpDir, { recursive: true })
  })
  afterEach(async () => {
    for (const s of sockets.splice(0)) s.close()
    await server.stop()
  })

  async function start(opts: Partial<ConstructorParameters<typeof RelayServer>[0]> = {}): Promise<void> {
    server = new RelayServer({ port: 0, ...opts })
    await server.start()
    port = (server.address() as { port: number }).port
  }

  async function open(): Promise<WebSocket> {
    const ws = new WebSocket(`ws://localhost:${port}`)
    sockets.push(ws)
    await waitForOpen(ws)
    return ws
  }

  /** An agent on Mac `agentId` with the named devices, all shut down. */
  async function agent(agentId: string, deviceIds: string[], platform = 'ios') {
    const ws = await open()
    ws.send(JSON.stringify({
      type: 'agent:register', agentId, agentName: `${agentId}-${platform}`, platform,
      devices: deviceIds.map((id) => ({ id, name: id, platform, status: 'shutdown' })),
    }))
    const reply = await waitForType<AgentRegistered>(ws, 'agent:registered')
    return { ws, session: new Map(reply.registeredSessions.map((r) => [r.deviceId, r.sessionId])) }
  }

  async function join(sessionId: string, clientKind?: 'flow-runner'): Promise<WebSocket> {
    const ws = await open()
    ws.send(JSON.stringify({ type: 'session:start', sessionId, ...(clientKind ? { clientKind } : {}) }))
    await waitForType<SessionJoined>(ws, 'session:joined')
    return ws
  }

  function boot(browser: WebSocket, sessionId: string, deviceId: string, requestId = `${sessionId}-boot`): void {
    browser.send(JSON.stringify({ type: 'device:boot', sessionId, requestId, payload: { deviceId } }))
  }

  const resources = (cpuPercent: number) => JSON.stringify({
    type: 'agent:resources',
    resources: { cpuPercent, memUsedMB: 4000, memTotalMB: 16000, slotsAvailable: 1, slotsTotal: 2, reportedAt: Date.now() },
  })

  it('refuses a second automated cold boot on the same Mac with host-booting', async () => {
    await start()
    const mac = await agent('mac-1', ['a', 'b'])
    const first = await join(mac.session.get('a')!, 'flow-runner')
    const second = await join(mac.session.get('b')!, 'flow-runner')

    boot(first, mac.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    boot(second, mac.session.get('b')!, 'b')
    const refused = await waitForType<DeviceBootError>(second, 'device:boot-error')
    expect(refused.reason).toBe('host-booting')
    expect(refused.requestId).toBe(`${mac.session.get('b')}-boot`)
  })

  it('counts an iOS and an Android agent on one Mac together, and other Macs apart', async () => {
    await start()
    const ios = await agent('mac-1', ['a'])
    const android = await agent('mac-1', ['p'], 'android')
    const elsewhere = await agent('mac-2', ['q'], 'android')
    boot(await join(ios.session.get('a')!, 'flow-runner'), ios.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(ios.ws, 'device:boot')

    const sameMac = await join(android.session.get('p')!, 'flow-runner')
    boot(sameMac, android.session.get('p')!, 'p')
    expect((await waitForType<DeviceBootError>(sameMac, 'device:boot-error')).reason).toBe('host-booting')

    boot(await join(elsewhere.session.get('q')!, 'flow-runner'), elsewhere.session.get('q')!, 'q')
    await waitForType<DeviceBoot>(elsewhere.ws, 'device:boot')
  })

  it('holds a person behind an automated boot and sends theirs when the agent reports the first was warm', async () => {
    await start()
    const mac = await agent('mac-1', ['a', 'b'])
    const robot = await join(mac.session.get('a')!, 'flow-runner')
    const person = await join(mac.session.get('b')!)

    boot(robot, mac.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    boot(person, mac.session.get('b')!, 'b')
    expect(await waitForTypeOrNull(mac.ws, 'device:boot', 150)).toBeNull()

    mac.ws.send(JSON.stringify({ type: 'device:ready', sessionId: mac.session.get('a'), requestId: `${mac.session.get('a')}-boot`, payload: { deviceId: 'a', cold: false } }))
    const forwarded = await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    expect(forwarded.sessionId).toBe(mac.session.get('b'))
  })

  it('tells a held person their boot is waiting, and until when', async () => {
    await start()
    const mac = await agent('mac-1', ['a', 'b'])
    boot(await join(mac.session.get('a')!, 'flow-runner'), mac.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    const person = await join(mac.session.get('b')!)
    const before = Date.now()
    boot(person, mac.session.get('b')!, 'b')
    const waiting = await waitForType<DeviceBootWaiting>(person, 'device:boot-waiting')
    expect(waiting.requestId).toBe(`${mac.session.get('b')}-boot`)
    expect(waiting.until).toBeGreaterThanOrEqual(before + 60_000)
  })

  it('reports each Mac\'s admission on the device listing, the same on both of its agents', async () => {
    await start()
    const ios = await agent('mac-1', ['a'])
    const android = await agent('mac-1', ['p'], 'android')
    ios.ws.send(resources(95))
    await new Promise((r) => setTimeout(r, 50))
    const lister = await open()
    const list = async () => {
      lister.send(JSON.stringify({ type: 'agents:list' }))
      return (await waitForType<AgentsListed>(lister, 'agents:listed')).sessions.map((s) => [s.platform, s.admission])
    }
    // CPU over the line and no boot: a new join would be refused, on the Mac's iOS agent; Android's own reading is idle.
    await vi.waitFor(async () => expect(await list()).toEqual(expect.arrayContaining([['ios', { booting: false, overloaded: true, memoryRefuses: [] }]])))

    boot(await join(android.session.get('p')!, 'flow-runner'), android.session.get('p')!, 'p')
    await waitForType<DeviceBoot>(android.ws, 'device:boot')
    // A boot holds the Mac: both agents say so, and the CPU is the boot's, so the join gate is paused.
    await vi.waitFor(async () => expect(await list()).toEqual(expect.arrayContaining([
      ['ios', { booting: true, overloaded: false, memoryRefuses: [] }],
      ['android', { booting: true, overloaded: false, memoryRefuses: [] }],
    ])))
  })

  it('keeps a Mac short of memory open while it has a device up to rejoin, and names the devices it would refuse', async () => {
    await start()
    const mac = await agent('mac-1', ['a', 'b'])
    const memFull = JSON.stringify({ type: 'agent:resources', resources: { cpuPercent: 10, memUsedMB: 15_500, memTotalMB: 16_000, slotsAvailable: 1, slotsTotal: 2, reportedAt: Date.now() } })
    mac.ws.send(memFull)
    await new Promise((r) => setTimeout(r, 50))
    const lister = await open()
    const admission = async () => {
      lister.send(JSON.stringify({ type: 'agents:list' }))
      return (await waitForType<AgentsListed>(lister, 'agents:listed')).sessions[0]!.admission
    }
    // Nothing up: a person could not get in anywhere on this Mac.
    await vi.waitFor(async () => expect(await admission()).toEqual({ booting: false, overloaded: true, memoryRefuses: ['a', 'b'] }))

    // Bring one device up through the relay (memory was fine then), and the Mac opens again — for that device.
    mac.ws.send(resources(10))
    await new Promise((r) => setTimeout(r, 50))
    const person = await join(mac.session.get('a')!)
    boot(person, mac.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    mac.ws.send(JSON.stringify({ type: 'device:ready', sessionId: mac.session.get('a'), requestId: `${mac.session.get('a')}-boot`, payload: { deviceId: 'a', cold: false } }))
    mac.ws.send(memFull)
    await new Promise((r) => setTimeout(r, 50))
    await vi.waitFor(async () => expect(await admission()).toEqual({ booting: false, overloaded: false, memoryRefuses: ['b'] }))
  })

  it('sends a held person after the longest wait even with the slot still taken', async () => {
    await start({ bootGate: { humanWaitMs: 100 } })
    const mac = await agent('mac-1', ['a', 'b'])
    boot(await join(mac.session.get('a')!, 'flow-runner'), mac.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    boot(await join(mac.session.get('b')!), mac.session.get('b')!, 'b')
    const forwarded = await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    expect(forwarded.sessionId).toBe(mac.session.get('b'))
  })

  it('answers a held boot whose person left, and never sends it', async () => {
    await start()
    const mac = await agent('mac-1', ['a', 'b'])
    boot(await join(mac.session.get('a')!, 'flow-runner'), mac.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    const person = await join(mac.session.get('b')!)
    boot(person, mac.session.get('b')!, 'b')
    await new Promise((r) => setTimeout(r, 50))
    person.send(JSON.stringify({ type: 'session:leave', sessionId: mac.session.get('b') }))
    // The held boot is answered on the socket that asked, and nothing is forwarded when the slot frees.
    expect((await waitForType<DeviceBootError>(person, 'device:boot-error')).requestId).toBe(`${mac.session.get('b')}-boot`)
    mac.ws.send(JSON.stringify({ type: 'device:ready', sessionId: mac.session.get('a'), payload: { deviceId: 'a', cold: false } }))
    expect(await waitForTypeOrNull(mac.ws, 'device:boot', 150)).toBeNull()
  })

  it('lets a person join an up device at high CPU while a boot holds the Mac, and not otherwise', async () => {
    await start()
    const mac = await agent('mac-1', ['a', 'b'])
    mac.ws.send(resources(95))
    await new Promise((r) => setTimeout(r, 50))

    const refusedBefore = await open()
    refusedBefore.send(JSON.stringify({ type: 'session:start', sessionId: mac.session.get('b') }))
    expect((await waitForType<GenericError>(refusedBefore, 'error')).reason).toBe('agent-resources-exhausted')

    // A boot already holding the slot was let in before the CPU rose; its CPU is the boot's.
    mac.ws.send(resources(10))
    await new Promise((r) => setTimeout(r, 50))
    boot(await join(mac.session.get('a')!, 'flow-runner'), mac.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    mac.ws.send(resources(95))
    await new Promise((r) => setTimeout(r, 50))
    await join(mac.session.get('b')!)
  })

  it('keeps the slot past the boot correlator\'s TTL — the device is still booting', async () => {
    await start({ pendingBootTtlMs: 30 })
    const mac = await agent('mac-1', ['a', 'b'])
    boot(await join(mac.session.get('a')!, 'flow-runner'), mac.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    await new Promise((r) => setTimeout(r, 100))

    const second = await join(mac.session.get('b')!, 'flow-runner')
    boot(second, mac.session.get('b')!, 'b')
    expect((await waitForType<DeviceBootError>(second, 'device:boot-error')).reason).toBe('host-booting')
  })

  it('keeps the slot across an agent restart that rebinds the booting session', async () => {
    await start()
    const mac = await agent('mac-1', ['a', 'b'])
    const robot = await join(mac.session.get('a')!, 'flow-runner')
    boot(robot, mac.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(mac.ws, 'device:boot')

    // The same agent restarts and registers the same devices: the sessions are rebound, not replaced.
    await agent('mac-1', ['a', 'b'])
    const second = await join(mac.session.get('b')!, 'flow-runner')
    boot(second, mac.session.get('b')!, 'b')
    expect((await waitForType<DeviceBootError>(second, 'device:boot-error')).reason).toBe('host-booting')
  })

  it('frees the slot when the booting session ends', async () => {
    await start()
    const mac = await agent('mac-1', ['a', 'b'])
    const robot = await join(mac.session.get('a')!, 'flow-runner')
    boot(robot, mac.session.get('a')!, 'a')
    await waitForType<DeviceBoot>(mac.ws, 'device:boot')
    robot.send(JSON.stringify({ type: 'session:end', sessionId: mac.session.get('a') }))
    await new Promise((r) => setTimeout(r, 50))

    boot(await join(mac.session.get('b')!, 'flow-runner'), mac.session.get('b')!, 'b')
    expect((await waitForType<DeviceBoot>(mac.ws, 'device:boot')).sessionId).toBe(mac.session.get('b'))
  })
})
