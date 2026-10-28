#!/usr/bin/env node
// Writes the record that ties the committed `bin/duo-helper` to its source. `build-duo-helper.sh` runs this
// as its last step. The refusal below and `--after-build` exist for the reasons spelled out in
// `record-nethook-artifact.mjs`.
import fs from 'node:fs'
import path from 'node:path'
import { computeRecord, readRecord, RECORD, SHIPPED_HELPER } from './lib/duo-helper-artifact.mjs'

const repo = path.resolve(import.meta.dirname, '..')
const record = computeRecord(repo)
if (record.helperBytes === 0) {
  console.error(`No helper at ${SHIPPED_HELPER} — build it before recording.`)
  process.exit(1)
}

const afterBuild = process.argv.includes('--after-build')
const previous = readRecord(repo)
if (!afterBuild && previous && previous.sources !== record.sources && previous.helper === record.helper) {
  console.error(
    'The duo-helper source changed but the binary did not — it has not been rebuilt.\n'
    + '  Run packages/ios-agent/build-duo-helper.sh, which rebuilds and records in one step.',
  )
  process.exit(1)
}
fs.writeFileSync(path.join(repo, RECORD), `${JSON.stringify(record, null, 2)}\n`)
console.log(`recorded ${RECORD}: ${record.sourceFileCount} sources, ${record.helperBytes} bytes`)
