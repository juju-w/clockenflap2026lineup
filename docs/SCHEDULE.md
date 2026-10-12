# Schedule subtab after the official timetable is published

The main surface remains the interactive poster. Add a sibling `Lineup / Schedule` view only when a functioning schedule renderer and verified official stage/set-time data are available; do not display a dead placeholder tab.

## Shared state

Keep the same `artist.id` values and wishlist selection. Do not reset existing picks when a timetable is added. A wishlist is an expression of interest; choosing a specific performance becomes a separate `setId` selection if an artist appears more than once.

## Data contract

See `schedule.template.json`. The empty template intentionally contains no guessed stages, set times or maps. Use:

- `stages`: stable stage IDs and localized official names; optional map coordinates only after an official map exists.
- `sets`: stable performance ID, existing `artistId`, `stageId`, start/end timestamps with explicit `+08:00`, and official source reference. Describe a Live/DJ/personal project accurately when applicable.
- `sources`: official URLs and the date checked. Missing times remain missing, and partial announcements remain marked partial.
- `map`: local packaged original/translated official map references. No runtime CDN dependency in the offline output.

## User flow

1. Pick the days being attended (one, two or three).
2. Browse the official day/stage timetable; tap a block for the existing artist profile.
3. Mark performances to watch. Interest saved before the timetable arrived remains visible as a starting point.
4. Identify actual time overlaps. For back-to-back sets on different stages, say to leave early/change stage; add walking estimates only when the map supports them. Do not invent a "0-minute walk".
5. Export either a combined overview or individual-day posters. Include selected dates and all stage/time labels; add the map only if the user chooses it.
6. Share images in the comments to find people with similar picks. No matching accounts, chat, real-time votes or server database are needed.

## Implementation boundary

The new view should be a classic-script module using the existing `CF_PLATFORM.saveImage` capability. Canvas rendering, local images and selection storage work offline. Keep schedule data independent of visual layout so later timetable revisions do not force a rewrite or destroy saved choices. Group all exports behind the same host capability adapter rather than embedding native APIs into the view.
