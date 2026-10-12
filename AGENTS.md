# Interactive lineup website

- This directory is a standalone public project, separate from the older prediction workspace.
- Preserve the typography-led poster, English default, bilingual profiles, day filters and wishlist.
- Use classic ES2017 scripts, local relative asset paths and no runtime dependencies/network requests.
- Keep browser clipboard/download code only in platform-web.js. The offline bundle includes platform-xhs.js instead; native APIs must match the official documented bridge contract.
- No fake stage assignments, start/end times, maps or conflict detection before official information exists.
- Add a Schedule subtab only when the schedule module has verified official data. Reuse artist IDs, wishlist state and the Canvas export path.
- Before changes ship: run node scripts/check.js; check JS syntax; build both targets with python3 scripts/build.py web/xhs; verify desktop and mobile UI.
- Browser smoke tests and static audits do not establish Chrome 61 or Xiaohongshu real-device compatibility.
- License code under MIT; do not claim third-party photographs/artwork are MIT licensed.
