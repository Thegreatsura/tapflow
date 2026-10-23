import type { ServiceFeature, ServiceTier, ServiceTierName } from '@tapflowio/protocol'

/** Runtime mirrors of protocol's tier unions, for the reason given on `SESSION_START_FAILURES`. */
const TIER_NAMES: Record<ServiceTierName, true> = { stock: true, lean: true, slim: true }
const FEATURES: Record<ServiceFeature, true> = {
  push: true, storekit: true, 'app-store': true, 'universal-links': true, spotlight: true, siri: true, icloud: true,
  'keychain-sync': true, contacts: true, calendar: true, reminders: true, mail: true, photos: true, health: true,
  homekit: true, imessage: true, widgets: true, wallet: true, maps: true, weather: true, news: true, 'game-center': true,
  'find-my': true, 'screen-time': true,
}

/** Every feature a run can keep on, for help text and error messages. */
export const SERVICE_FEATURES = Object.keys(FEATURES) as ServiceFeature[]

/**
 * A tier from what a person typed: a name and a comma-separated feature list. **An unknown name or feature is an
 * error, never dropped**: a typo in `--allow` would boot slim with the very service the app needed switched off,
 * and the run would fail somewhere far from the cause.
 */
export function parseServiceTier(name: string, allow: string | undefined): ServiceTier {
  if (!Object.hasOwn(TIER_NAMES, name)) throw new Error(`unknown service tier "${name}" (expected: ${Object.keys(TIER_NAMES).join(', ')})`)
  const features = (allow ?? '').split(',').map((f) => f.trim()).filter(Boolean)
  const unknown = features.filter((f) => !Object.hasOwn(FEATURES, f))
  if (unknown.length > 0) throw new Error(`unknown feature${unknown.length > 1 ? 's' : ''} ${unknown.map((f) => `"${f}"`).join(', ')} (expected: ${SERVICE_FEATURES.join(', ')})`)
  return { name: name as ServiceTierName, allow: [...new Set(features)] as ServiceFeature[] }
}
