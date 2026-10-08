import { describe, it, expect, afterEach } from 'vitest'
import { PassThrough } from 'stream'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { pipeUpload } from '../lib/uploads'

// `stream.pipe(writer)` leaves the writer open and the partial file on disk when the source fails. Every
// upload handler writes through this instead.
describe('pipeUpload', () => {
  let dir = ''
  afterEach(() => { if (dir) fs.rmSync(dir, { recursive: true, force: true }) })

  it('writes the whole upload and resolves', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tapflow-pipe-'))
    const dest = path.join(dir, 'f')
    const src = new PassThrough()
    const written = pipeUpload(src, dest, 'test')
    src.end('complete')
    await written
    expect(fs.readFileSync(dest, 'utf8')).toBe('complete')
  })

  it('on a failed source, closes the writer, removes the partial file and rejects', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tapflow-pipe-'))
    const dest = path.join(dir, 'f')
    const src = new PassThrough()
    const written = pipeUpload(src, dest, 'test')
    src.write('partial')
    await new Promise((r) => setTimeout(r, 20))
    src.destroy(new Error('source failed'))
    await expect(written).rejects.toThrow('source failed')
    await new Promise((r) => setTimeout(r, 20))
    expect(fs.existsSync(dest)).toBe(false)
  })
})
