import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

vi.mock('node:fs', () => ({ existsSync: vi.fn() }))
vi.mock('node:os', () => ({ homedir: () => '/Users/dev' }))

import { ValidationError } from '@tapflowio/agent-core'
import { getAdbPath, getEmulatorPath } from '../sdk'

const STUDIO_SDK = '/Users/dev/Library/Android/sdk'

/** Only these paths exist on the fake disk. */
function onDisk(...paths: string[]): void {
  const present = new Set(paths)
  vi.mocked(existsSync).mockImplementation((p) => present.has(String(p)))
}

describe('Android SDK resolution', () => {
  beforeEach(() => {
    vi.stubEnv('ADB_PATH', '')
    vi.stubEnv('ANDROID_HOME', '')
    vi.stubEnv('ANDROID_SDK_ROOT', '')
    vi.stubEnv('PATH', '/usr/bin:/bin')
    vi.mocked(existsSync).mockReset()
  })

  afterEach(() => vi.unstubAllEnvs())

  // #903: Android Studio's SDK, platform-tools on PATH, no ANDROID_HOME. doctor passed and the agent
  // reported 0 devices, because this lookup threw and the caller swallowed it.
  it('finds the Android Studio SDK without ANDROID_HOME', () => {
    onDisk(join(STUDIO_SDK, 'platform-tools', 'adb'), join(STUDIO_SDK, 'emulator', 'emulator'))

    expect(getAdbPath()).toBe(join(STUDIO_SDK, 'platform-tools', 'adb'))
    expect(getEmulatorPath()).toBe(join(STUDIO_SDK, 'emulator', 'emulator'))
  })

  it('prefers ANDROID_HOME over the standard location', () => {
    vi.stubEnv('ANDROID_HOME', '/opt/sdk')
    onDisk('/opt/sdk/platform-tools/adb', join(STUDIO_SDK, 'platform-tools', 'adb'))

    expect(getAdbPath()).toBe('/opt/sdk/platform-tools/adb')
  })

  it('reads ANDROID_SDK_ROOT when ANDROID_HOME is unset', () => {
    vi.stubEnv('ANDROID_SDK_ROOT', '/opt/sdk-root')
    onDisk('/opt/sdk-root/emulator/emulator', join(STUDIO_SDK, 'emulator', 'emulator'))

    expect(getEmulatorPath()).toBe('/opt/sdk-root/emulator/emulator')
  })

  // A stale ANDROID_HOME used to be taken on trust and fail at spawn time instead.
  it('moves past an ANDROID_HOME that does not hold the tool', () => {
    vi.stubEnv('ANDROID_HOME', '/stale/sdk')
    onDisk(join(STUDIO_SDK, 'emulator', 'emulator'))

    expect(getEmulatorPath()).toBe(join(STUDIO_SDK, 'emulator', 'emulator'))
  })

  // The agent registers on `which adb`, so an adb it registered on has to be one it can also run.
  it('falls back to adb on PATH when no SDK candidate holds it', () => {
    vi.stubEnv('PATH', '/usr/bin:/opt/homebrew/bin')
    onDisk('/opt/homebrew/bin/adb')

    expect(getAdbPath()).toBe('/opt/homebrew/bin/adb')
  })

  it('falls back to the emulator on PATH too', () => {
    vi.stubEnv('PATH', '/usr/bin:/opt/android/emulator')
    onDisk('/opt/android/emulator/emulator')

    expect(getEmulatorPath()).toBe('/opt/android/emulator/emulator')
  })

  it('keeps ADB_PATH as an explicit override', () => {
    vi.stubEnv('ADB_PATH', '/custom/adb')
    onDisk(join(STUDIO_SDK, 'platform-tools', 'adb'))

    expect(getAdbPath()).toBe('/custom/adb')
  })

  it('names ANDROID_HOME in the error when nothing is found', () => {
    onDisk()

    expect(() => getAdbPath()).toThrow(ValidationError)
    expect(() => getEmulatorPath()).toThrow(/ANDROID_HOME/)
  })
})
