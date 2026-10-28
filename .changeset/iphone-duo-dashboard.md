---
"@tapflowio/relay": minor
---

The dashboard shows and folds the iPhone Duo. The fold control Android foldables already have appears for it, and while it folds the screen says **Folding...** or **Unfolding...** and the new panel fades in. Both panels are drawn at one scale, so the cover shows at half the unfolded device, and a booting Duo is drawn as the folded cover. The device is turned the way it is held, frame and screen together, and **Rotate** turns it a quarter clockwise, the frame first and the screen after it.

Every iOS device now turns on screen in 0.3 s when rotated instead of jumping, and a tap or frame-button press made while it turns is not sent, so it cannot land somewhere other than where it was aimed. Other iPhones and iPads still toggle between portrait and landscape.

A recording of an iOS device turned to landscape is no longer saved sideways: it is saved the way the device is shown, on every iOS device, and keeps the size it started with if the device turns or folds during it.
