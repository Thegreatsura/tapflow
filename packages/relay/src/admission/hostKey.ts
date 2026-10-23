import type { Session } from '../SessionManager.js'

/**
 * Which Mac a session's device runs on. The boot gate counts per Mac, not per agent socket: an iOS and an Android
 * agent on one Mac page against the same memory. Both agents send the machine's IOPlatformUUID as `agentId`; an
 * agent that predates it is keyed by its name, so two old agents on one Mac are counted apart — a residual gap,
 * accepted because it fails open (two boots at once, as before) rather than shut. The session id is the last
 * resort for an agent with neither, which gates that one session against nothing.
 */
export function hostKeyOf(session: Pick<Session, 'id' | 'agentId' | 'agentName'>): string {
  return session.agentId ?? session.agentName ?? `session:${session.id}`
}
