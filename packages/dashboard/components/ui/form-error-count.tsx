import { useState } from 'react'

/** How many fields a refused submit left invalid. `root` is the relay's refusal, not a field. */
export function invalidFieldCount(errors: object): number {
  return Object.entries(errors).filter(([key, error]) =>
    key !== 'root' && typeof (error as { message?: unknown } | undefined)?.message === 'string').length
}

function sentence(count: number, submitCount: number): string {
  if (count === 0) return ''
  const text = count === 1 ? '1 field needs attention' : `${count} fields need attention`
  // A live region announces a change, and the same count twice in a row is no change. A trailing
  // no-break space on every other submit is one, and a screen reader does not read it (#824).
  return submitCount % 2 === 0 ? text : `${text}\u00a0`
}

/**
 * What a screen reader hears when a submit is refused for invalid fields: **how many**, never which
 * (#824). The messages themselves are each field's description, read when focus reaches the field —
 * react-hook-form moves it to the first — so saying them here too read the first one twice. What the
 * count keeps is the two cases a description misses: Enter pressed in the field that already has focus,
 * where no focus event fires and nothing would be said, and the second and later fields, which focus
 * never reaches.
 *
 * **`aria-live`, not `role="status"`**: Team and Tokens already put a `role="status"` region in their
 * dialogs, and a second one would make `getByRole('status')` ambiguous there.
 *
 * **Visible to nobody else.** The fields already show their errors, so `sr-only` changes nothing on
 * screen. Set once per submit, from the submit's own result, rather than following `errors` as fields
 * are fixed: a count that ticked down with every keystroke would talk over the person typing.
 */
export function FormErrorCount({ errors, submitCount }: { errors: object; submitCount: number }) {
  const [said, setSaid] = useState({ submitCount, text: '' })
  const count = invalidFieldCount(errors)
  if (said.submitCount !== submitCount) setSaid({ submitCount, text: sentence(count, submitCount) })
  // Cleared once nothing is invalid, whatever the submit count says. A form that calls `reset()` in its
  // success handler goes to 0 and back to 1 in one render (react-hook-form counts the submit after the
  // handler), so the count alone would leave "2 fields need attention" behind a password that was just
  // changed. Emptying a live region is never announced, so this cannot talk over anyone.
  else if (count === 0 && said.text !== '') setSaid({ submitCount, text: '' })
  return <p aria-live="polite" className="sr-only">{said.text}</p>
}
