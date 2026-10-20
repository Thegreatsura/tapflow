import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppSidebar } from '@/components/AppSidebar'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { withQuery } from './withQuery'

// Below 768px the sidebar is a modal sheet. Following a link in it changes the page behind the sheet, so the
// sheet has to close itself, or the page just opened stays covered. Each closing case is paired with the same
// sheet staying open until the click (contributing/test-and-guard-coverage.md rule 2).

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, email: 'a@test.local', displayName: 'Ann', avatarUrl: null, role: 'Admin' }, loading: false }),
}))
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }))

function stubPhone() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: true, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }))
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })))
}

async function openSheet() {
  stubPhone()
  const user = userEvent.setup()
  render(withQuery(
    <MemoryRouter initialEntries={['/app-center']}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarTrigger />
        <Routes><Route path="*" element={null} /></Routes>
      </SidebarProvider>
    </MemoryRouter>,
  ))
  await user.click(screen.getByRole('button', { name: /toggle sidebar/i }))
  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  return user
}

describe('the mobile sidebar sheet', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('stays open until something in it is chosen', async () => {
    await openSheet()
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it.each(['Mac Resources', 'Team', 'Docs'])('closes when the %s row is followed', async (name) => {
    const user = await openSheet()
    await user.click(screen.getByRole('link', { name }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes when the team logo is followed', async () => {
    const user = await openSheet()
    await user.click(screen.getByRole('link', { name: /tapflow/i }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
