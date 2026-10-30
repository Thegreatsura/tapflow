import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import http from 'http'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { RelayServer } from '../RelayServer'
import { initDb, getDb, closeDb } from '../db'
import { makePasswordHash } from '../api/auth'
import { signJwt } from '../middleware/auth'
import { routeUploadToApp, upsertApp } from '../api/builds'

/**
 * **An app can have a different bundle ID on each platform** (#1086). A product whose iOS and Android IDs differ
 * (`no.vg.lab.kupp` / `com.vgkupp`) used to become two apps: an upload naming the iOS app with `app_id` was sent to a
 * new app because its ID did not match. The rules live in `lib/appBundleIds.ts`: an ID belongs to one app whatever the
 * platform, and an app has at most one ID per platform.
 */

type Platform = 'ios' | 'android'
// The role is read from the users row, so a Viewer is its own user.
const cookie = (role = 'Admin') => role === 'Viewer'
  ? `tapflow_token=${signJwt({ userId: 2, email: 'v@example.com', role })}`
  : `tapflow_token=${signJwt({ userId: 1, email: 'a@example.com', role })}`

function request(port: number, method: string, urlPath: string, body?: object, role = 'Admin'): Promise<{ status: number; body: Record<string, unknown> }> {
  const payload = body ? Buffer.from(JSON.stringify(body)) : undefined
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1', port, path: urlPath, method,
      headers: { Cookie: cookie(role), ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}) },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(Buffer.concat(chunks).toString() || '{}') as Record<string, unknown> }))
    })
    req.on('error', reject)
    req.end(payload)
  })
}

const ids = (appId: number) => {
  const rows = getDb().prepare('SELECT platform, bundle_id FROM app_bundle_ids WHERE app_id = ?').all(appId) as { platform: Platform; bundle_id: string }[]
  return Object.fromEntries(rows.map((r) => [r.platform, r.bundle_id]))
}
const platformOf = (appId: number) => (getDb().prepare('SELECT platform FROM apps WHERE id = ?').get(appId) as { platform: string } | undefined)?.platform
const route = (appId: number | null, bundleId: string | null, platform: Platform) => {
  const r = routeUploadToApp(getDb(), { appId, bundleId, appName: 'Uploaded', platform, isAndroidArtifact: platform === 'android' })
  return r.kind === 'ok' ? r.appId : r.kind
}
const addBuild = (appId: number, platform: Platform, bundleId: string | null = null) =>
  Number(getDb().prepare('INSERT INTO builds (app_id, bundle_id, file_path, platform) VALUES (?, ?, ?, ?)')
    .run(appId, bundleId, platform === 'android' ? '/b/x.apk' : '/b/x.app.zip', platform).lastInsertRowid)
const appOf = (buildId: number) => (getDb().prepare('SELECT app_id FROM builds WHERE id = ?').get(buildId) as { app_id: number }).app_id

let tmpDir: string
beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tapflow-app-ids-'))
  initDb(path.join(tmpDir, 'test.db'))
  getDb().prepare('INSERT INTO users (id, email, display_name, role, password_hash) VALUES (1, ?, ?, ?, ?)')
    .run('a@example.com', 'Admin', 'Admin', makePasswordHash('password123'))
  getDb().prepare('INSERT INTO users (id, email, display_name, role, password_hash) VALUES (2, ?, ?, ?, ?)')
    .run('v@example.com', 'Viewer', 'Viewer', makePasswordHash('password123'))
})
afterAll(() => {
  closeDb()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('upload routing', () => {
  it('adds an upload\'s ID to the app named by app_id when it has none on that platform (#1086)', () => {
    const kupp = upsertApp('Kupp', 'no.vg.lab.kupp', 'ios')
    expect(route(kupp, 'com.vgkupp', 'android')).toBe(kupp)
    expect(ids(kupp)).toEqual({ ios: 'no.vg.lab.kupp', android: 'com.vgkupp' })
    expect(platformOf(kupp)).toBe('both')
    // From then on the ID alone finds it.
    expect(route(null, 'com.vgkupp', 'android')).toBe(kupp)
  })

  it('joins the same ID on another platform, as before', () => {
    const app = upsertApp('Same', 'com.same', 'ios')
    expect(route(null, 'com.same', 'android')).toBe(app)
    expect(ids(app)).toEqual({ ios: 'com.same', android: 'com.same' })
  })

  // A build flavor (`com.app.staging`) stays its own app.
  it('sends a different ID for a platform the app already has to that ID\'s own app', () => {
    const app = upsertApp('Flavored', 'com.flavor', 'android')
    const staging = route(app, 'com.flavor.staging', 'android')
    expect(staging).not.toBe(app)
    expect(ids(app)).toEqual({ android: 'com.flavor' })
    expect(ids(staging as number)).toEqual({ android: 'com.flavor.staging' })
  })

  it('sends an ID another app holds to that app, on whichever platform it holds it', () => {
    const owner = upsertApp('Owner', 'com.owned', 'ios')
    const named = upsertApp('Named', 'com.named', 'ios')
    expect(route(named, 'com.owned', 'android')).toBe(owner)
    expect(ids(named)).toEqual({ ios: 'com.named' })
  })

  // Without a rule for it, a new app would take X on Android while A holds it on iOS: one ID, two apps.
  it('routes to the owner without adding when the owner has a different ID on that platform', () => {
    const a = upsertApp('Two IDs', 'com.two.ios', 'ios')
    expect(route(a, 'com.two.android', 'android')).toBe(a)
    expect(route(null, 'com.two.ios', 'android')).toBe(a)
    expect(ids(a)).toEqual({ ios: 'com.two.ios', android: 'com.two.android' })
  })
})

describe('the apps API', () => {
  let server: RelayServer
  let port: number
  let uploadsDir: string

  beforeEach(async () => {
    uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tapflow-app-ids-up-'))
    server = new RelayServer({ port: 0, uploadsDir })
    await server.start()
    port = (server.address() as { port: number }).port
  })
  afterEach(async () => {
    await server.stop()
    fs.rmSync(uploadsDir, { recursive: true, force: true })
  })

  const listed = async (appId: number) =>
    ((await request(port, 'GET', '/api/v1/apps')).body.items as Array<Record<string, unknown>>).find((a) => a.id === appId)!
  const merge = (target: number, fromAppId: number, platform: string, role?: string) =>
    request(port, 'POST', `/api/v1/apps/${target}/merge`, { fromAppId, platform }, role)

  it('lists each app\'s ID per platform, and keeps `bundle_id_key` for older clients', async () => {
    const app = upsertApp('Listed', 'org.listed', 'ios')
    route(app, 'com.listed', 'android')
    addBuild(app, 'android', 'com.listed')
    expect(await listed(app)).toMatchObject({
      bundle_ids: { ios: 'org.listed', android: 'com.listed' },
      bundle_id_key: 'org.listed',
      build_platforms: ['android'],
    })
  })

  it('creates an app on both platforms with one ID, and refuses an ID another app holds or the reserved one', async () => {
    const r = await request(port, 'POST', '/api/v1/apps', { name: 'Both', bundle_id_key: 'com.created', platform: 'both' })
    expect(r.status).toBe(201)
    expect(ids(Number(r.body.id))).toEqual({ ios: 'com.created', android: 'com.created' })
    expect((await request(port, 'POST', '/api/v1/apps', { name: 'Again', bundle_id_key: 'com.created', platform: 'android' })).status).toBe(409)
    expect((await request(port, 'POST', '/api/v1/apps', { name: 'Unknown', bundle_id_key: '__unknown__', platform: 'ios' })).status).toBe(400)
    expect((await request(port, 'POST', '/api/v1/apps', { name: 'Web', bundle_id_key: 'com.web', platform: 'web' })).status).toBe(400)
  })

  describe('merging', () => {
    it('moves an app\'s only platform into another, with its builds and what hangs off them, and removes it', async () => {
      const ios = upsertApp('WDIO', 'org.wdiodemoapp', 'ios')
      const android = upsertApp('WDIO Android', 'com.wdiodemoapp', 'android')
      const built = addBuild(android, 'android', 'com.wdiodemoapp')
      getDb().prepare("INSERT INTO comments (build_id, author_id, body) VALUES (?, 1, 'looks off')").run(built)

      const r = await merge(ios, android, 'android')
      expect(r.status).toBe(200)
      expect(r.body).toMatchObject({ appId: ios, removedAppId: android })
      expect(ids(ios)).toEqual({ ios: 'org.wdiodemoapp', android: 'com.wdiodemoapp' })
      expect(platformOf(ios)).toBe('both')
      expect(platformOf(android)).toBeUndefined()
      expect(appOf(built)).toBe(ios)
      expect((getDb().prepare('SELECT COUNT(*) AS n FROM comments WHERE build_id = ?').get(built) as { n: number }).n).toBe(1)
      expect((await listed(ios)).name).toBe('WDIO')
      // The next upload of that ID lands in the merged app, and so does one naming the removed app.
      expect(route(null, 'com.wdiodemoapp', 'android')).toBe(ios)
      expect(route(android, 'com.wdiodemoapp', 'android')).toBe(ios)
    })

    it('moves one platform out of an app that has two, leaving the other', async () => {
      const source = upsertApp('Split', 'com.split', 'ios')
      route(null, 'com.split', 'android')
      const iosBuild = addBuild(source, 'ios', 'com.split')
      const androidBuild = addBuild(source, 'android', 'com.split')
      const target = upsertApp('Target', 'org.target', 'ios')

      const r = await merge(target, source, 'android')
      expect(r.status).toBe(200)
      expect(r.body.removedAppId).toBeUndefined()
      expect(ids(source)).toEqual({ ios: 'com.split' })
      expect(platformOf(source)).toBe('ios')
      expect(appOf(iosBuild)).toBe(source)
      expect(appOf(androidBuild)).toBe(target)
      expect(ids(target)).toEqual({ ios: 'org.target', android: 'com.split' })
    })

    // An iOS build whose bundle could not be read, uploaded with app_id, sits under an app with no iOS ID. Moving the
    // app's Android ID must not leave it under an app that is then deleted — or delete it with the app.
    it('keeps a platform that has builds but no ID, so moving the last ID strands nothing', async () => {
      const source = upsertApp('Half', 'com.half', 'android')
      const noId = addBuild(source, 'ios')
      const target = upsertApp('Whole', 'org.whole', 'ios')

      expect((await merge(target, source, 'android')).status).toBe(200)
      expect(platformOf(source)).toBe('ios')
      expect(appOf(noId)).toBe(source)

      expect((await merge(target, source, 'ios')).body).toMatchObject({ removedAppId: source })
      expect(appOf(noId)).toBe(target)
      expect(ids(target)).toEqual({ ios: 'org.whole', android: 'com.half' })
    })

    it('refuses a platform the target already has an ID on, changing nothing', async () => {
      const a = upsertApp('A', 'com.a.one', 'android')
      const b = upsertApp('B', 'com.b.one', 'android')
      const built = addBuild(b, 'android', 'com.b.one')
      expect((await merge(a, b, 'android')).status).toBe(409)
      expect(ids(b)).toEqual({ android: 'com.b.one' })
      expect(appOf(built)).toBe(b)
    })

    it('keeps builds no ID could be read for apart', async () => {
      const unknown = Number(route(null, null, 'android'))
      const real = upsertApp('Real', 'com.real.one', 'ios')
      expect((await merge(real, unknown, 'android')).status).toBe(400)
      const other = upsertApp('Other', 'com.real.two', 'android')
      expect((await merge(unknown, other, 'android')).status).toBe(400)
    })

    it('refuses what cannot be merged, and lets a Viewer merge nothing', async () => {
      const a = upsertApp('Solo', 'com.solo', 'ios')
      const b = upsertApp('Solo 2', 'com.solo.two', 'ios')
      expect((await merge(a, a, 'ios')).status).toBe(400)
      expect((await merge(a, 999999, 'ios')).status).toBe(404)
      expect((await merge(a, b, 'android')).status).toBe(400)
      expect((await merge(a, b, 'web')).status).toBe(400)
      expect((await merge(a, b, 'ios', 'Viewer')).status).toBe(403)
      expect(ids(b)).toEqual({ ios: 'com.solo.two' })
    })
  })

  // `both` is an app's; a build is one platform. The filter and the webhook read the app's and lost both-app builds.
  it('filters builds by the build\'s platform', async () => {
    const app = upsertApp('Filtered', 'com.filtered', 'ios')
    route(null, 'com.filtered', 'android')
    const built = addBuild(app, 'android', 'com.filtered')
    const r = await request(port, 'GET', `/api/v1/builds?platform=android&app_id=${app}`)
    expect((r.body.items as Array<{ id: number }>).map((b) => b.id)).toEqual([built])
  })
})
