import type { DeviceStatus } from '@tapflowio/agent-core'
import type { DeviceBoot } from '@tapflowio/protocol'

/**
 * Whether a boot will cost the Mac a boot: `cold` brings a device up, `warm` finds it running and only opens a
 * stream. Decided before the boot is forwarded, because that is when the gate has to charge it — the agent's
 * own answer (`device:ready.payload.cold`) comes after, and corrects this one in the gate when they differ.
 *
 * `deviceStatus` is what the relay last heard: the agent's list at registration, then `booted` on every ready and
 * `shutdown` on every shutdown. Only `'full-erase'` restarts a running device; `'app-only'`, which the dashboard
 * sends on every boot, does not.
 */
export function classifyBoot(deviceStatus: DeviceStatus, resetMode: DeviceBoot['payload']['resetMode']): 'cold' | 'warm' {
  return deviceStatus === 'booted' && resetMode !== 'full-erase' ? 'warm' : 'cold'
}
