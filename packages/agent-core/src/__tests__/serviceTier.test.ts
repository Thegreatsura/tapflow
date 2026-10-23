import { describe, it, expect } from 'vitest'
import { sameServiceTier } from '../utils/serviceTier.js'

describe('sameServiceTier', () => {
  it('compares the name, and the features as a set', () => {
    expect(sameServiceTier({ name: 'slim', allow: ['push', 'photos'] }, { name: 'slim', allow: ['photos', 'push'] })).toBe(true)
    expect(sameServiceTier({ name: 'slim', allow: ['push'] }, { name: 'lean', allow: ['push'] })).toBe(false)
    expect(sameServiceTier({ name: 'slim', allow: ['push'] }, { name: 'slim', allow: [] })).toBe(false)
  })

  it('does not count a repeated feature as a different one', () => {
    expect(sameServiceTier({ name: 'slim', allow: ['push', 'push'] }, { name: 'slim', allow: ['push', 'photos'] })).toBe(false)
    expect(sameServiceTier({ name: 'slim', allow: ['push', 'push'] }, { name: 'slim', allow: ['push'] })).toBe(true)
  })

  it('treats stock as stock whatever it allows, since it switches nothing off and records no marker', () => {
    expect(sameServiceTier({ name: 'stock', allow: ['push'] }, { name: 'stock', allow: [] })).toBe(true)
  })
})
