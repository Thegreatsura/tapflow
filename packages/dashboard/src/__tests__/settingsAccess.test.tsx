import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { maySeeSettingsPage } from '@/lib/settingsAccess'
import { TokenSettings } from '@/src/pages/settings/Tokens'
import { withQuery } from './withQuery'

// Tokens is open to the roles that upload builds; Team stays Admin-only. The sidebar and the route guard
// both read `maySeeSettingsPage`, so this pins the rule once for both.
// Mutations: Developer or QA dropped from the Tokens entry → the uploader cases; Viewer added → the
// Viewer case; the `isAdmin` gate on the Agent option removed → the Developer dialog case.

const auth = vi.hoisted(() => ({ role: 'Developer' }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 2, email: 'd@test.local', displayName: null, avatarUrl: null, role: auth.role }, loading: false }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('maySeeSettingsPage', () => {
  it.each(['Admin', 'Developer', 'QA'])('%s sees Tokens', (role) => {
    expect(maySeeSettingsPage('/settings/tokens', role)).toBe(true)
  })

  it('Viewer does not see Tokens', () => {
    expect(maySeeSettingsPage('/settings/tokens', 'Viewer')).toBe(false)
  })

  it.each(['Developer', 'QA', 'Viewer'])('%s does not see Team', (role) => {
    expect(maySeeSettingsPage('/settings/team', role)).toBe(false)
  })

  it('an unrestricted page is open to everyone, and a restricted one to no one without a role', () => {
    expect(maySeeSettingsPage('/settings/default', 'Viewer')).toBe(true)
    expect(maySeeSettingsPage('/settings/tokens', undefined)).toBe(false)
  })
})

describe('Tokens dialog for a non-Admin', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('offers the API type only: the relay refuses the agent scope to anyone but an Admin', async () => {
    auth.role = 'Developer'
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })))
    render(withQuery(<MemoryRouter><TokenSettings /></MemoryRouter>))
    await userEvent.click(await screen.findByRole('button', { name: /new token/i }))
    await userEvent.click(screen.getByRole('combobox', { name: /type/i }))
    expect(await screen.findByRole('option', { name: /^API/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /^Agent/ })).not.toBeInTheDocument()
  })
})
