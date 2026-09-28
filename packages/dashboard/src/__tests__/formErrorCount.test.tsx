// #824. A field's error used to be both its input's description and a polite live region, so the field
// focus lands on after a refused submit was read twice. Now the message is the description only, and one
// hidden region per form says how many fields need attention. Nothing on screen changes.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { withQuery } from './withQuery'

vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'light' }) }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, email: 'a@b.c', displayName: 'Duchan', avatarUrl: null, role: 'Viewer' }, loading: false }),
}))

import { Setup } from '@/src/pages/Setup'
import { DefaultSettings } from '@/src/pages/settings/Default'
import { invalidFieldCount } from '@/components/ui/form-error-count'

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ initialized: false, canInitialize: true }), { status: 200 }),
  )
})
afterEach(() => vi.restoreAllMocks())

async function renderSetup() {
  const view = render(withQuery(
    <MemoryRouter initialEntries={['/setup']}>
      <Routes><Route path="/setup" element={<Setup />} /></Routes>
    </MemoryRouter>,
  ))
  await screen.findByLabelText(/admin email/i)
  return view
}

/** The form's count region: the one polite live region the page has. */
function countRegion(container: HTMLElement) {
  const regions = container.querySelectorAll('[aria-live="polite"]')
  expect(regions).toHaveLength(1)
  return regions[0] as HTMLElement
}

const submit = () => userEvent.click(screen.getByRole('button', { name: /create admin account/i }))

describe('a refused submit', () => {
  it('says how many fields need attention, in a region nobody sees', async () => {
    const { container } = await renderSetup()
    const region = countRegion(container)
    expect(region).toHaveTextContent('')
    await submit()

    // Email and password; the confirm rule is a refine that zod runs only once the rest parses.
    await waitFor(() => expect(region.textContent?.trim()).toBe('2 fields need attention'))
    expect(region).toHaveClass('sr-only')
  })

  it('leaves each field error a description only, looking as it did', async () => {
    await renderSetup()
    await submit()

    const email = screen.getByLabelText(/admin email/i)
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    const error = document.getElementById(email.getAttribute('aria-describedby')!)!
    expect(error).toHaveTextContent('Enter a valid email')
    expect(error).not.toHaveAttribute('aria-live')
    expect(error).not.toHaveAttribute('role')
    expect(error).toHaveClass('text-sm', 'text-destructive')
    expect(error).not.toHaveClass('sr-only')
  })

  it('does not count down while the fields are being fixed', async () => {
    const { container } = await renderSetup()
    const region = countRegion(container)
    await submit()
    await waitFor(() => expect(region.textContent?.trim()).toBe('2 fields need attention'))

    await userEvent.type(screen.getByLabelText(/admin email/i), 'someone@example.com')
    await waitFor(() => expect(screen.queryByText('Enter a valid email')).toBeNull())
    expect(region.textContent?.trim()).toBe('2 fields need attention')
  })

  it('changes the region on a second refusal with the same count, so it is announced again', async () => {
    const { container } = await renderSetup()
    const region = countRegion(container)
    await submit()
    await waitFor(() => expect(region.textContent?.trim()).toBe('2 fields need attention'))
    const first = region.textContent

    await submit()
    await waitFor(() => expect(region.textContent).not.toBe(first))
    expect(region.textContent?.trim()).toBe('2 fields need attention')
  })
})

describe('after a refusal is fixed and the submit goes through', () => {
  it('leaves nothing behind, even when the form resets itself on success', async () => {
    // Default's password form calls `reset()` in its success handler, which takes the submit count to 0
    // and straight back to 1 — the value it had at the refusal — so a region keyed on the count alone
    // kept saying fields needed attention under a "Password changed" toast.
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) =>
      String(input) === '/api/v1/auth/change-password'
        ? new Response('{}', { status: 200 })
        : new Response('{}', { status: 404 }))
    render(withQuery(<MemoryRouter><DefaultSettings /></MemoryRouter>))
    const button = screen.getByRole('button', { name: 'Change password' })
    const region = button.closest('form')!.querySelector('[aria-live="polite"]') as HTMLElement

    await userEvent.click(button)
    await waitFor(() => expect(region.textContent?.trim()).toBe('2 fields need attention'))

    await userEvent.type(screen.getByLabelText('Current password'), 'old-password')
    await userEvent.type(screen.getByLabelText('New password'), 'password123')
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'password123')
    await userEvent.click(button)

    await waitFor(() => expect(screen.getByLabelText('Current password')).toHaveValue(''))
    expect(region).toHaveTextContent('')
  })
})

describe('invalidFieldCount', () => {
  it('counts field errors with a message and leaves the relay\'s refusal out', () => {
    expect(invalidFieldCount({
      email: { message: 'Enter a valid email' },
      password: { message: 'too short' },
      root: { message: 'Invalid email or password' },
      avatar: undefined,
    })).toBe(2)
  })
})

// A new form with field errors and no count would bring the #824 gap back in the other direction: its
// fields would be read by nothing when focus does not move. Checked by source, since rendering every
// dialog to find out is most of the dashboard.
describe('every form with field errors carries a count', () => {
  const root = path.resolve(__dirname, '../..')
  const walk = (dir: string): string[] =>
    fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => {
      const rel = path.join(dir, e.name)
      if (e.isDirectory()) return e.name === '__tests__' ? [] : walk(rel)
      return rel.endsWith('.tsx') ? [rel] : []
    })
  const files = ['src', 'components'].flatMap((dir) => walk(dir))
  const withFieldErrors = files.filter((f) => /<FieldError id=/.test(fs.readFileSync(path.join(root, f), 'utf8')))

  it('finds the forms it is about', () => {
    // Anti-vacuity: the nine forms of #824 live in these seven files.
    expect(withFieldErrors.length).toBe(7)
  })

  it.each(withFieldErrors)('%s', (file) => {
    const src = fs.readFileSync(path.join(root, file), 'utf8')
    const forms = (src.match(/<form[\s>]/g) ?? []).length
    expect((src.match(/<FormErrorCount /g) ?? []).length).toBe(forms)
  })
})
