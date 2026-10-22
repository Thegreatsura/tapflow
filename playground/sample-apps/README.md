# Tree measurement sample apps

Small apps whose screens are known in advance, so the UI tree can be measured against them: does each
element appear in the tree (recall), and does a tap on what the tree reported actually land (round trip).
Each app sets a `status` label to `tapped:<key>` when an element is used, which is how a landed tap is
proven without looking at the screen.

| | |
|---|---|
| `ios/` | One xcodegen project, two targets with the same screens: `SampleUIKit` and `SampleSwiftUI` |
| `expected/` | What each app's screens should expose, per screen and group |
| `build.sh` | Builds both iOS targets into `playground/test-builds/` (gitignored) |
| `measure.ts` | Uploads a build, drives it through the relay, prints recall and round trip per group |

Only source is committed. Nothing built here is, for the same reasons as `packages/ios-agent/netprobe`.

## Run it

```sh
playground/sample-apps/build.sh                      # → test-builds/sample-uikit.app.zip, sample-swiftui.app.zip
cp playground/sample-apps/.env.example playground/sample-apps/.env   # then add a token for the local relay
pnpm dev:relay & pnpm dev:ios &                      # from the repo root
pnpm --filter @tapflowio/playground measure-tree \
  --expected sample-apps/expected/ios-uikit.json \
  --zip test-builds/sample-uikit.app.zip --device <udid> --out <file.json>
```

`--device` takes a name or the device id. A name repeats once per installed runtime, so the id is the safe
choice. `--dump` prints each screen's tree, which is how a miss in the tree is told apart from a miss in the
matching.

## Reading a result

Groups are scored apart. `basic` is what a tester expects to work; `hard` and `web` are there to fail
sometimes, and folding them into `basic` would make every number meaningless.

A failure is sorted into one of two kinds before anything is changed:

- **Our input or parsing differs from the platform's** — fix it once, for every widget. A zero-length tap
  that `UISwitch` ignores is this kind, and so was an identifier with the placeholder glued on (#1035).
- **A widget reports itself oddly** — record it, do not add a per-widget rule. A SwiftUI `Toggle` reported
  as one row-wide switch is this kind.

If a WebView renders blank, reboot the simulator before reading anything into it. A simulator was seen to
get into a state where WebKit drew nothing at all, in this app and in Safari alike, and a reboot cleared it.
