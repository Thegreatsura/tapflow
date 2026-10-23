import type { ServiceTier } from '@tapflowio/protocol'

/**
 * Whether two service tiers switch off the same services: the same name and the same allowed features, in any
 * order. Shared because the agent decides from it whether a running device must restart onto a tier, and the relay
 * decides from it whether that boot costs a cold boot — the two must not disagree.
 */
export function sameServiceTier(a: ServiceTier, b: ServiceTier): boolean {
  return a.name === b.name && a.allow.length === b.allow.length && a.allow.every((f) => b.allow.includes(f))
}
