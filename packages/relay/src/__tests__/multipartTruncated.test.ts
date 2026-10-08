import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import fs from 'fs'
import http from 'http'
import os from 'os'
import path from 'path'
import WebSocket from 'ws'
import { RelayServer } from '../RelayServer'
import { initDb, closeDb } from '../db'

// An upload that ends early ends that request and nothing else. The upload handlers listened on the
// multipart parser but not on each file's stream, and a stream with no `'error'` listener throws.

/** Sends the upload to `/api/v1/invitations/accept`; resolves once the request is over. */
function sendTruncatedUpload(port: number): Promise<void> {
  const boundary = '----tapflowtruncated'
  // A file part that is opened and never closed: no closing boundary follows the bytes.
  const body = Buffer.from(
    `--${boundary}\r\n` +
    'Content-Disposition: form-data; name="avatar"; filename="a.png"\r\n' +
    'Content-Type: image/png\r\n\r\n' +
    'partial-bytes',
  )
  return new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1', port, path: '/api/v1/invitations/accept', method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    }, (res) => { res.resume(); res.on('end', () => resolve()) })
    // The relay may reply before reading the rest, or drop the socket; either way the request is over.
    req.on('error', () => resolve())
    req.on('close', () => resolve())
    req.end(body)
  })
}

function connects(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`)
    ws.on('open', () => { ws.close(); resolve(true) })
    ws.on('error', () => resolve(false))
  })
}

describe('RelayServer — an upload that ends early', () => {
  let tmpDir: string
  let server: RelayServer | null = null
  const uncaught: unknown[] = []
  const onUncaught = (err: unknown) => { uncaught.push(err) }

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tapflow-multipart-'))
    initDb(path.join(tmpDir, 'test.db'))
    process.on('uncaughtException', onUncaught)
  })
  afterAll(() => {
    process.off('uncaughtException', onUncaught)
    closeDb()
    fs.rmSync(tmpDir, { recursive: true })
  })
  afterEach(async () => { await server?.stop(); server = null; uncaught.length = 0 })

  it('survives an upload that ends inside a file part, and keeps serving', async () => {
    server = new RelayServer({ port: 0 })
    await server.start()
    const port = (server.address() as { port: number }).port

    await sendTruncatedUpload(port)
    await new Promise((r) => setTimeout(r, 50))

    expect(uncaught, 'the error escaped the file stream').toEqual([])
    expect(await connects(port), 'the relay stopped serving').toBe(true)
  })
})
