# Rick's games site

Static site on GitHub Pages: repo `xrolenks/games`, live at https://xrolenks.github.io/games/ (project site, so every absolute link needs the `/games/` prefix).

- `index.html` — home page; one `<a class="card">` per game, plus a game count next to "Games".
- `404.html` — "Back to the games" links to `/games/`.
- `wasteland/index.html` — **Wild Wasteland**, the whole game in one file (HTML + CSS + JS, no build, no dependencies, no image files).
- `.nojekyll` — serve files as-is.

## Working with Rick

- Rick is learning; explain in plain English, briefly. He commits and pushes himself with **GitHub Desktop**. Don't commit or push unless asked.
- He sometimes edits `README.md` on github.com, which causes "pull first" conflicts. Before git work, fetch and check `status -sb`; resolve README conflicts keeping his wording.
- No `git`, `python` or `node` on PATH. Use GitHub Desktop's bundled git:
  `$git = Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName`

## Previewing / testing

The Browser pane's `file://` preview does **not** run the game's JS (buttons do nothing). Always serve over http. A minimal PowerShell server (run in the background, write it to the scratchpad), which also maps the `/games` prefix:

```powershell
param([string]$Root,[int]$Port=8765)
$l=New-Object System.Net.HttpListener;$l.Prefixes.Add("http://localhost:$Port/");$l.Start()
$t=@{'.html'='text/html; charset=utf-8';'.css'='text/css';'.js'='text/javascript';'.png'='image/png';'.svg'='image/svg+xml';'.json'='application/json'}
while($l.IsListening){$c=$l.GetContext();$p=[Uri]::UnescapeDataString($c.Request.Url.AbsolutePath) -replace '^/games',''
 $f=Join-Path $Root $p.TrimStart('/');if(Test-Path $f -PathType Container){$f=Join-Path $f 'index.html'}
 $code=200;if(-not(Test-Path $f -PathType Leaf)){$f=Join-Path $Root '404.html';$code=404}
 $b=[IO.File]::ReadAllBytes($f);$c.Response.StatusCode=$code;$x=[IO.Path]::GetExtension($f)
 $c.Response.ContentType=$(if($t[$x]){$t[$x]}else{'application/octet-stream'});$c.Response.OutputStream.Write($b,0,$b.Length);$c.Response.Close()}
```

Then open `http://localhost:8765/games/wasteland/`.

- Bring the test tab to the front first: background tabs pause `requestAnimationFrame`, and the game stays "busy" mid-animation. The pane can also throttle to ~7 fps with slow timers — don't mistake that for a game bug.
- Fast test setup: edit the autosave in `localStorage` (`bunker9-auto`), reload, click Continue (`#mcont`). E.g. put the player next to an exit, plant items, set `WM.time`.
- Cheat codes (press `` ` ``): `testdummy` (harmless 1 HP enemy beside you), `boomstick`, `pewpew`, `zeus`, `kaboom`, `deadeye`, `heavyweaponsguy`, `firestarter`, `batterup`, `homerun`, `antioch`, `ironclad`.
- After testing, reset the tab: clear `localStorage` but keep `bunker9-cursor`.
- Check the console for errors after every edit, and test at phone size (`resize_window` mobile) when layout changes.

## Wild Wasteland: story and flow

You're a wanderer. In a cave you find sealed **Bunker 9**; a voice on the intercom offers to let you join if you bring back the **reactor control chip**. Title → Start → character creator (name, sex, hat, shirt) → intro → **Bunker 9 Gate** (cave). Step on a red **exit square** to open the **world map**; walk freely, discover locations, click one you're standing on to enter. The chip is in the **Old Power Plant** (node id `tower`). Using the intercom while holding the chip opens the door and wins.

## Code map (`wasteland/index.html`)

The code is compact: many functions are one long line. **Never put a `//` comment mid-line inside a one-line function** — it comments out the rest of the line and breaks the whole game. Use `/* */` or put the comment on its own line. Match the surrounding terse style.

**Grid & tiles.** Area is `W=18` × `H=14`; index `ix(x,y)`. `T[i]` tile types: 0 floor, 1 crate, 2 cactus, 3 shack wall, 4–7 car halves, 8 rock, 9 bunker door, 10 intercom. `items[i]`: `'s'` stim, `'a'` ammo crate, `'g:<gearId>'` gear, `'c'` control chip. `E` enemies, `P` player tile, `BD` bodies, `F` shack floor, `SK` shack.
- `newLevel()` generates desert areas from `lv` (danger tier); `buildCave()` builds the gate from the `CAVE` text grid.
- Exits: `EX` (east edge) plus open tiles above/below it — `isExit(i)`, `openExits()`.

**World map.** `WMN` = locations (`t` tier, `safe`, `cave`, `fin`, `ent` re-entry tile, `l` roads, `x/y` on a 480×300 canvas). `WMS` = saved map state: `at`, `vis` (entered), `seen` (spotted), `areas` (saved area snapshots), `pos`, `open`, `time`, `ic` (intercom uses), `chip`, `done`, `noloot`. Free travel: `wmGo`, `wmStep`, `wmSpot`, `wmInfo`, `wmEnter`, `drawMap`. Tuning: `SEE` (discovery range), `WSPD` (speed), `MPP` (minutes per map pixel). Names stay `???` until `vis`. `enterArea()`/`leaveArea()` swap area state; `placeChip()` puts the chip in the `fin` area.

**Clock.** `WMS.time` = minutes since day 1 midnight (starts 480 = 8 AM). `tick(min)`; steps and combat turns cost 1. `nightF()` 0 by day, 1 from 8 PM–6 AM (half-hour fades). Night = blue wash + stars in `drawIso`, wash + `drawClock()` on the map.

**Turns & combat.** `tap(i)` handles clicks; `step(n)` moves; `attack(e)`; `endTurn()` → `enemyTurn()`. Enemies idle until alerted (`e.al`): `detect()` (sight `SIGHT={R:7,r:5}` + line of sight), `noise()` on attacks. Out of combat (`inCombat()` false) walking is free and AP refills in `after(cb)`. `busy()` = animation running; `play()` runs queued walk/hit phases; `animate()` runs weapon FX (`FX`); `kick(ms)` keeps redraws going for idle animations.

**Items & ammo.** `GEAR` (weapons `k:'w'`, armor `k:'a'`, stim `k:'u'`). Every gun has its own ammo: `AMMO` keyed by pool, `SHARED={tesla:'laser'}`, helpers `ak/ainf/am/addAmmo/ammoName/ammoFor`. `AM` = spare ammo, `MAG` = loaded per slot, `LOADED` = carried guns' rounds, `GOT` = guns already found (starter ammo once). Stims heal 12–20 (`useStim`). Inventory UI: `fillInv()`.

**Drawing.** `drawIso()` draws backdrop → tiles (row by row; draw order = occlusion) → effects → night wash → `drawSpeech()`/`drawPops()` → minimap. Player sprite from `buildPlayer()` (`LOOK`, `SHIRTS`, `HEADS`, `BODY`, letter-grid `SPR`). Icons: `ICONS` letter grids → `icoCanvas()`; ground gear via `groundGear()/groundIcon()`. Cave pieces: `caveBackdrop`, `rockBlock`, `bunkerDoor` (drawn once at the first door tile; later door tiles skip their floor so it isn't painted over), `intercomPost`. Floating dialogue: `speak(i,txt,voice)`.

**UI.** Bottom row: End turn, Inventory, Menu. `#pause` menu (Menu button or Esc): Resume, Save, Load, Controls, Settings, New game (two-click confirm). Settings: crosshair size slider (`CURS`, saved as `bunker9-cursor`); the pixel crosshair shows only in combat, red when `canHit()` fails. Touch screens get an extra action row (`.tctl`), hold-to-inspect and pinch zoom.

## Saves

`snap()` / `restore()`; keys `bunker9-auto` (autosaved on every `render()`) and `bunker9-slot` (manual). **Old saves must keep loading**: when adding state, give it a default in `restore()` and migrate older shapes there (see the existing migrations for `ammo`→`AM`, road map→`seen/pos`, desert gate→cave, missing `time`).
