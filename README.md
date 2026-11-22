# clockenflap2026lineup

A fan-made, interactive Clockenflap 2026 lineup poster by [juju-w](https://github.com/juju-w).

**[Open the website](https://juju-w.github.io/clockenflap2026lineup/)**

Hover a name to meet the artist. Click to open a record-sleeve-style profile with a biography and recommended albums. Save your picks in a wishlist and export your own lineup poster.

- English by default, with Chinese throughout the interface and artist biographies.
- Day filters, real photographs and album covers, full artist names.
- Live poster typography and original SVG illustrations, with interactive artist names and a reflowed mobile layout.
- One-tap picks grouped by day, with removal, undo and a direct return from artist profiles.
- One shareable Canvas PNG for any combination of one, two or three days. Download it or share it directly where the browser supports PNG sharing.
- Keyboard navigation, reduced-motion support and mobile layouts.
- No accounts, analytics or backend. Picks are stored on the current device.

The poster retains the official billing. The Schedule tab has 83 performances across six music stages on 4–6 December, verified against the official timetable on 22 November 2026. Nono and Summertime Sadness share a joint set; Luci Gang is billed with Rujé and Rohann. Previously saved artists carry into the timetable.

## Run locally

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. All scripts, artwork and styles are local, with no runtime package installation.

To preview the web-only large images, build the website and open `http://127.0.0.1:8765/dist/web/` instead.

## Build and check

```sh
node scripts/check.js
python3 scripts/build.py web
python3 scripts/build.py xhs
```

The website is in `dist/web/`; the offline mini-tool is in `dist/xhs/`. Each ZIP has `index.html` at its root. GitHub Actions checks both variants, deploys the website to Pages, and retains the Xiaohongshu ZIP as a workflow artifact.

The two outputs share their UI, artist IDs, data, styles, wishlist storage and Canvas export. Only the platform adapter changes:

| Capability | Website | Xiaohongshu mini-tool |
| --- | --- | --- |
| Copy release title | Browser clipboard, then selected-text fallback | Selected-text fallback |
| Save PNG | Browser download / image preview | Official native album-save bridge |
| Runtime images | Local thumbnails plus large images loaded on enlargement | Local compressed images |
| Routing | Shareable artist hash | In-page dialogs |
| Share | Web Share API when available | Native share panel (client 9.53+, full-screen only): tool card + exported lineup PNG |
| Picks storage | localStorage | Storage JS API (client 9.46+) with localStorage mirror/fallback |
| Haptics | — | `vibrateShort` on saving a pick (client 9.50+) |

See [compatibility notes](docs/COMPATIBILITY.md) for test coverage and the container baseline.

## Maintain the lineup

- `data.js`: artist IDs, official days, biographies, local photographs and release references.
- `locales.js`: English biographies and paired interface translations.
- `app.js`: poster order, colors and interactions.
- `style.css`: poster and record-sleeve styles, with feature-based fallbacks.
- `platform-web.js` / `platform-xhs.js`: capabilities belonging to each host.
- `scripts/build.py`: allowlisted packaging; excludes documentation, designs, Git files and the other platform adapter.
- `web-assets/`: larger versions of the same photographs/artwork, included only in the website build. Refresh from the recorded sources with `python3 scripts/prepare_web_images.py` (requires ffmpeg and ffprobe). Images keep their original proportions and are never upscaled; source resolution limits still apply.

The older prediction workspace is not part of this repository. This public project is the maintained interactive guide.

## Official timetable

The **Schedule** tab reuses the artist profiles and wishlist. Browse the six-stage grid or chronological list, select individual performances, see exact overlaps and tight stage changes, and export one PNG containing any selected combination of days. Tap **Official timetable** to read the packaged source image. A separate button opens the official family programme.

`schedule-data.js` records the official sources, explicit Hong Kong timestamps, stable performance IDs and shared artist IDs. `schedule.js` renders the timetable and uses the same platform image-save adapter as the poster. `scripts/check-schedule.js` validates references and checks overlap boundaries, cross-day comparisons and joint sets.

Several labels are cropped in the official Sunday source image. Their times were transcribed from the labelled grid boundaries and carry `timeBasis: official-grid-boundaries`. No walking-time estimates are supplied without a verified map. Stage times may change. The data contract is documented in [the schedule notes](docs/SCHEDULE.md).

## 中文

这是 `juju-w` 做的鸡飞阵容互动大字报。点名字可以看艺人背景、推荐专辑；想看清单按日整理，也可以保存成个人阵容海报。默认英文，支持中文切换。

网页和小红书小工具共用一套代码。「时间表」已接入 11 月 22 日核对的官方六舞台、83 场演出，支持分日舞台表、时间线、按场勾选、撞场及提前换舞台提示，选一天、两天或三天导出同一张图片。原先收藏的艺人会带入排程。周日原图少数时间文字被遮挡，对应场次已按官方时间网格核读。

代码采用 MIT 协议；艺人照片、专辑封面和品牌名称不在 MIT 授权范围内。来源说明见 [ASSETS.md](ASSETS.md)。
