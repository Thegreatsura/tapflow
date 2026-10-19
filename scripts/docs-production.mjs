#!/usr/bin/env node
// Decides whether a release tag moves `docs-production`, the branch tapflow.dev deploys from.
//
//   node scripts/docs-production.mjs v0.28.0   # prints `move` or `skip: <reason>`, exits 0 either way
//
// The docs live on main, but a self-hosted user runs what npm published, so between releases main's
// docs describe features nobody can install yet — on 2026-10-19, 49 docs commits since v0.27.1, most
// of them unreleased. Vercel's production branch is therefore `docs-production`, and
// `.github/workflows/release.yml` points it at each release tag. It also keeps the `tapflow.dev/...#id`
// links that published packages print landing on the docs they were released with.
//
// Only the newest stable tag moves it. A prerelease would publish docs for a version `npm install`
// does not pick, and a backport (v0.26.2 tagged after v0.27.1) would roll the site back a minor.
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const STABLE = /^v(\d+)\.(\d+)\.(\d+)$/

/** `[major, minor, patch]` for a stable tag, or `null` for anything else — prereleases included. */
function stableVersion(tag) {
  const m = STABLE.exec(tag)
  return m ? m.slice(1).map(Number) : null
}

function compare(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i]
  return 0
}

/**
 * Whether `tag` should move `docs-production`, judged against every tag in the repository.
 * `tags` includes `tag` itself — the workflow checks out with `fetch-depth: 0`.
 *
 * @param {string} tag
 * @param {string[]} tags
 * @returns {{ move: true } | { move: false, reason: string }}
 */
export function docsProductionDecision(tag, tags) {
  const version = stableVersion(tag)
  if (!version) return { move: false, reason: `${tag} is not a stable vX.Y.Z tag` }
  const newer = tags.find((t) => {
    const v = stableVersion(t)
    return v && compare(v, version) > 0
  })
  if (newer) return { move: false, reason: `${newer} is newer than ${tag}` }
  return { move: true }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const tag = process.argv[2]
  if (!tag) {
    console.error('usage: node scripts/docs-production.mjs <tag>')
    process.exit(1)
  }
  const tags = execFileSync('git', ['tag', '-l', 'v*'], { encoding: 'utf8' }).split('\n').filter(Boolean)
  // An empty list means the tags were not fetched, not that this is the first release: `tag` itself
  // is always among them. Refusing beats reporting `move` off a list that judged nothing.
  if (!tags.includes(tag)) {
    console.error(`${tag} is not among the ${tags.length} local tags — was the checkout shallow?`)
    process.exit(1)
  }
  const decision = docsProductionDecision(tag, tags)
  console.log(decision.move ? 'move' : `skip: ${decision.reason}`)
}
