# clockenflap2026lineup

A fan-made, interactive Clockenflap 2026 lineup poster by [juju-w](https://github.com/juju-w).

**[Open the website](https://juju-w.github.io/clockenflap2026lineup/)**

Hover a name to meet the artist. Click to open a record-sleeve-style profile with a biography and recommended albums. Save your picks in a wishlist and export your own lineup poster.

- English by default, with Chinese throughout the interface and artist biographies.
- Official day filters, real photographs and album covers, full artist names.
- Wishlist grouped by day, with removal/undo and a direct return from artist profiles.
- Canvas PNG export: one selected day or all saved days, without cutting names off.
- Keyboard navigation, reduced-motion support and mobile layouts.
- No accounts, analytics or backend. Picks are stored on the current device.

This is a fan project, not an official festival website. The current data contains the first 19 announced artists and their days. Stage assignments and set times have not been added.

## Run locally

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. All scripts, artwork and styles are local, with no runtime package installation.

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
| Runtime images | Packaged local images | The same packaged local images |
| Routing | Shareable artist hash | In-page dialogs |

See [compatibility notes](docs/COMPATIBILITY.md) for test coverage and the container baseline.

## Maintain the lineup

- `data.js`: artist IDs, official days, biographies, local photographs and release references.
- `locales.js`: English biographies and paired interface translations.
- `app.js`: poster order, colors and interactions.
- `style.css`: poster and record-sleeve styles, with feature-based fallbacks.
- `platform-web.js` / `platform-xhs.js`: capabilities belonging to each host.
- `scripts/build.py`: allowlisted packaging; excludes documentation, designs, Git files and the other platform adapter.

The older prediction workspace is not part of this repository. This public project is the maintained interactive guide.

## When the official timetable arrives

A **Schedule** subtab will reuse the artists and wishlist. It will show the official timetable by day/stage, flag overlapping picks, and export a personal timetable PNG. No provisional stage names or invented set times are shown now. The data contract and planned flow are in [the schedule roadmap](docs/SCHEDULE.md).

## 中文

这是 `juju-w` 做的鸡飞阵容互动大字报。点名字可以看艺人背景、推荐专辑；想看清单按日整理，也可以保存成个人阵容海报。默认英文，支持中文切换。

网页和小红书小工具共用一套代码。后续正式时间表公布后再加排程子页，支持冲突提示、舞台信息和图片导出。现在只使用已公布的分日，不猜时间和舞台。

代码采用 MIT 协议；艺人照片、专辑封面和品牌名称不在 MIT 授权范围内。来源说明见 [ASSETS.md](ASSETS.md)。
