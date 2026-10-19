// `docs-production` follows the newest stable release and nothing else. See `scripts/docs-production.mjs`.
//
// Each skip case is paired with a move case judged by the same function on the same tag list
// (`contributing/test-and-guard-coverage.md` rule 2): "does not move" is also what a function that
// never moves reports. The workflow wiring is checked too, because a correct decision that no step
// acts on — or that runs before publish — is the same silence.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { docsProductionDecision } from '../docs-production.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('docsProductionDecision', () => {
  const tags = ['v0.26.1', 'v0.27.0', 'v0.27.1', 'v0.28.0-next.0']

  it('moves for the newest stable tag, even with a newer-looking prerelease present', () => {
    expect(docsProductionDecision('v0.27.1', tags)).toEqual({ move: true })
  })

  it('skips a prerelease', () => {
    expect(docsProductionDecision('v0.28.0-next.0', tags).move).toBe(false)
  })

  it('skips a backport tagged after a newer release', () => {
    const withBackport = [...tags, 'v0.26.2']
    expect(docsProductionDecision('v0.26.2', withBackport)).toEqual({ move: false, reason: 'v0.27.0 is newer than v0.26.2' })
    expect(docsProductionDecision('v0.27.1', withBackport)).toEqual({ move: true })
  })

  it('compares numerically, not as strings', () => {
    const t = ['v0.9.0', 'v0.10.0']
    expect(docsProductionDecision('v0.10.0', t)).toEqual({ move: true })
    expect(docsProductionDecision('v0.9.0', t).move).toBe(false)
  })

  it('skips a tag that is not vX.Y.Z', () => {
    expect(docsProductionDecision('0.27.1', ['0.27.1']).move).toBe(false)
    expect(docsProductionDecision('v0.27', ['v0.27']).move).toBe(false)
  })
})

describe('release.yml wiring', () => {
  const yml = readFileSync(join(ROOT, '.github', 'workflows', 'release.yml'), 'utf8')
  const publishAt = yml.indexOf('id: publish')
  const docsAt = yml.indexOf('node scripts/docs-production.mjs')

  it('asks the script, after the publish step, and only when publish succeeded', () => {
    expect(publishAt).toBeGreaterThan(-1)
    expect(docsAt).toBeGreaterThan(publishAt)
    expect(yml).toContain("steps.publish.outcome == 'success'")
  })

  it('pushes the tagged commit to docs-production only on `move`', () => {
    const step = yml.slice(yml.lastIndexOf('- name:', docsAt))
    expect(step).toMatch(/if \[ "\$decision" = move \]/)
    expect(step).toContain(':refs/heads/docs-production')
  })
})
