import type { FormFactor } from '@tapflowio/protocol'

const PHONE = { width: 324, height: 720 }

/**
 * The shape the viewer draws while a device boots, before its chrome says how big it really is.
 *
 * Two shapes, by decision: a phone, and a tablet turned the way its platform boots one. An iPad comes
 * up upright (3:4, between the iPad Pro 13's 0.77 and the mini's 0.69). An Android tablet comes up on
 * its side — the SDK's current tablet profile defaults to landscape, and the real viewer draws one at
 * about 720×450 — so its skeleton does too. A foldable boots unfolded and near square (Pixel 9 Pro
 * Fold 2076×2152), which the tablet shape is far closer to than the phone. Anything else, or nothing,
 * is a phone: what this drew for every device before there was a form factor. The long side is the
 * viewers' own limit, 720.
 */
export function skeletonSize(formFactor: FormFactor | undefined, platform: string): { width: number; height: number } {
  if (formFactor !== 'tablet' && formFactor !== 'foldable') return PHONE
  return platform === 'android' ? { width: 720, height: 450 } : { width: 540, height: 720 }
}
