import http from 'http'
import fs from 'fs'
import path from 'path'
import busboy from 'busboy'
import { randomUUID } from 'crypto'
import { getDb } from '../db.js'
import { requireRole, requireAuth } from '../middleware/auth.js'
import { json } from '../router.js'
import { pipeUpload, unlinkSafe } from '../lib/uploads.js'

export function handleGetSettings(req: http.IncomingMessage, res: http.ServerResponse): void {
  const auth = requireAuth(req, res)
  if (!auth) return

  const db = getDb()
  const settings = db.prepare('SELECT team_name, logo_path FROM team_settings WHERE id = 1').get() as
    { team_name: string; logo_path: string | null } | undefined

  json(res, 200, {
    team_name: settings?.team_name ?? 'tapflow',
    logo_url: settings?.logo_path ? `/uploads/team/${path.basename(settings.logo_path)}` : null,
  })
}

export function handleUpdateSettings(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  uploadsDir: string
): void {
  const auth = requireRole(req, res, ['Admin'])
  if (!auth) return

  const bb = busboy({ headers: req.headers, limits: { fileSize: 2 * 1024 * 1024 } })
  const fields: Record<string, string> = {}
  let logoPath = ''
  let stagedPath = ''
  let written: Promise<void> | null = null
  let sizeError = false

  bb.on('field', (name, val) => { fields[name] = val })

  bb.on('file', (_field, stream, info) => {
    // busboy destroys a file's stream with an error when the body ends inside it, and a stream with no
    // `'error'` listener throws. The response is `bb`'s own `'error'` handler's job.
    stream.on('error', () => {})
    const allowed = ['image/png', 'image/jpeg']
    if (!allowed.includes(info.mimeType)) { stream.resume(); return }
    const ext = info.mimeType === 'image/png' ? '.png' : '.jpg'
    logoPath = path.join(uploadsDir, 'team', `logo${ext}`)
    fs.mkdirSync(path.dirname(logoPath), { recursive: true })

    // **Staged, then renamed into place.** It used to be written straight over the live image, so an upload
    // that failed partway left the current one empty or truncated. busboy also stops at the size limit
    // rather than erroring, which `'limit'` reports.
    stagedPath = `${logoPath}.${randomUUID()}.part`
    stream.on('limit', () => { sizeError = true })
    written = pipeUpload(stream, stagedPath, 'staged team logo')
  })

  bb.on('finish', async () => {
    if (sizeError) {
      if (stagedPath) unlinkSafe(stagedPath, 'oversized team logo')
      return json(res, 400, { error: 'Max 2MB for logo' })
    }
    if (written) {
      try {
        await written
        fs.renameSync(stagedPath, logoPath)
      } catch {
        unlinkSafe(stagedPath, 'staged team logo')
        return json(res, 500, { error: 'Update failed' })
      }
    }

    const db = getDb()
    const updates: string[] = ['updated_at = datetime(\'now\')']
    const params: unknown[] = []

    if (fields.team_name) { updates.push('team_name = ?'); params.push(fields.team_name) }
    if (logoPath) { updates.push('logo_path = ?'); params.push(logoPath) }

    params.push(1)
    db.prepare(`UPDATE team_settings SET ${updates.join(', ')} WHERE id = ?`).run(...params)

    json(res, 200, { ok: true })
  })

  bb.on('error', () => json(res, 500, { error: 'Update failed' }))
  req.pipe(bb)
}
