# Website and Xiaohongshu compatibility

One UI, two explicitly selected classic-script adapters. No UA detection, frameworks, CDN scripts, modules, service workers or runtime network requests are required. Runtime resources use relative paths so Pages repository subpaths and offline ZIP roots both work.

## Container rules used

Prepared against the official `minitool-zip-builder` 1.6.0 contract supplied by the project owner:

- ES2017 / Android 8.1's Chrome/WebView 61 baseline.
- Classic external scripts; no `type="module"`, inline JavaScript, eval or WASM.
- No external assets or network requests.
- The offline package excludes browser clipboard and file-download code entirely, rather than relying on an unreachable branch.
- `platform-xhs.js` selects release-name text for manual copying.
- Album saving is triggered by the user's Save button. A generated Blob becomes a complete data URI via FileReader, then goes to `writeTempFile({data})` and `saveImageToPhotosAlbum({filePath})`.
- Blob URLs are used only for image preview and are revoked when the preview closes.
- Local selections are device/container-local; browser and mini-tool wishlists are not automatically shared.

## Layout and animation

Core height rules retain `vh` fallbacks before `svh`. Fixed overlays have physical edge properties. Album art has intrinsic square dimensions. `:has()` is replaced by a state class; keyboard focus and `:focus-visible` have a baseline path. Flex gap support is measured once through actual layout; older engines use scoped margins. Animations feature-detect Web Animations and animation-finished promises; an unavailable animation API does not prevent opening/closing a dialog. Native `inert` is an enhancement; closing-state pointer blocking and the modal keyboard handler provide the baseline interaction path.

## Package gates

`python3 scripts/build.py xhs` checks a root entry, local runtime references, supported file types, no symlinks, <=200 files, <=10 MiB, and banned runtime API patterns. Current output is 78 files and approximately 4.28 MiB. The official recommended 2 MiB budget is exceeded to retain readable portraits/covers; this is below the documented 10 MiB hard limit. No base64 artwork is embedded in source files.

## Verification and limits

- Node syntax/data/translation/image-reference checks and a mocked native-save contract check run in CI.
- Both package variants are built in CI.
- Current desktop and mobile-sized browser layouts have been checked, including bilingual profiles, wishlist/undo, return navigation and PNG generation/download.
- The native bridge contract is tested with a stub; no actual album permission is exercised by CI.
- **Chrome 61 CSS compatibility has not been tested on the actual engine. Xiaohongshu real-device compatibility, native album saving and device performance have not been measured.** Static checks and modern desktop browser screenshots do not establish real-device acceptance.
