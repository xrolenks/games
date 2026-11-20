# Rick's games site

Static site on GitHub Pages: repo `xrolenks/games`, live at https://xrolenks.github.io/games/ (project site, so every absolute link needs the `/games/` prefix).

- `index.html` — home page; one `<a class="card">` per game, plus a game count next to "Games". Card pictures are small SVGs, except Hex Isles, which uses a real 3D-board screenshot `hexisles/thumb.jpg` (960x600, Rick's request 2026-11-20; made by rendering the Three.js canvas straight to a JPEG mid-way through an all-computer game).
- `404.html` — "Back to the games" links to `/games/`.
- `wasteland/` — **Wild Wasteland**, a turn-based wasteland RPG (no build, no dependencies, no image files): `index.html`, `css/style.css`, `js/*.js` (split 2026-11-20). Notes: `wasteland/CLAUDE.md`.
- `hexisles/` — **Hex Isles**, a hex-island building board game (no build step). Since 2026-11-19 (Rick's request) it's split by job: `index.html` (page HTML), `css/style.css`, `js/*.js`, `sound-effects/*.wav` (see `hexisles/CLAUDE.md` for the file map). Notes: `hexisles/CLAUDE.md`.
- `fatalfists/` — **Fatal Fists**, a one-on-one arcade fighter (vs computer, 2 players on one keyboard, or online): `index.html`, `css/style.css`, `js/*.js` (split 2026-11-20). Notes: `fatalfists/CLAUDE.md`.
- `.nojekyll` — serve files as-is.

**Originality rule (Rick's update, 2026-11-18):** a game may use features and rules similar to an existing game (game rules and mechanics themselves can't be owned; fan-made games like colonist.io work this way), as long as everything you see and read is our own:
- **Own name** for the game and its modes/expansions (never another game's title or brand, e.g. not "Catan", "Settlers", "Cities & Knights").
- **Everyday words are fine** for cards, pieces, resources and goods, even when another game uses the same ones (Rick's update, 2026-11-18): generic words like wood, brick, sheep, wheat, ore, knight, road, city, robber, paper, cloth or coin aren't anyone's trademark. Only made-up brand names and titles are off limits.
- **Own art and look**: drawn in code in our style, never copied or traced from the other game.
- **Own wording**: rules text, card text and messages written fresh, never copied from a rulebook or the other game.
- Own characters (no characters, logos or branding from the other game).
Rick describing a feature with another game's words, or pointing at its rulebook, is fine: build the feature, keeping our own game/mode names, art and wording (everyday words for cards and resources are OK). Don't rename existing things in a game unless Rick asks.

**File layout rule (Rick's request, 2026-11-20): every game is split by type, like Hex Isles**, so the code is organized and readable:
- `index.html` — the page's HTML only (screens, buttons, canvas), with `<link>` / `<script>` tags.
- `css/style.css` — all styles.
- `js/*.js` — the code, one file per job (e.g. data, game logic, computer player, drawing, sound, menus, online, start-up), loaded by plain `<script>` tags at the end of `index.html` in a fixed order (classic scripts sharing one global scope, `'use strict'` in each new game; code that runs while a file loads may only use earlier files, since functions are only hoisted inside their own file).
- Asset folders when there are files (e.g. `sound-effects/`).
- The game's `CLAUDE.md` lists the files and their load order.
All three games use this layout (Wild Wasteland and Fatal Fists split 2026-11-20); new games start in it. After moving code between files, check the console on a fresh load (a "not defined" error at load means something now runs before the file that defines it).

Each game folder has its own `CLAUDE.md` with that game's code map and Rick's rules for it. Read it before working on that game, and add new notes there, not here.

## Working with Rick

- Rick is learning; explain in plain English, briefly. He commits and pushes himself with **GitHub Desktop**. Don't commit or push unless asked.
- He sometimes edits `README.md` on github.com, which causes "pull first" conflicts. Before git work, fetch and check `status -sb`; resolve README conflicts keeping his wording.
- No `git`, `python` or `node` on PATH. Use GitHub Desktop's bundled git:
  `$git = Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" | Sort-Object FullName -Descending | Select-Object -First 1 -ExpandProperty FullName`
- Rick's PC reports "reduce motion", so animations he asks for get **no** reduced-motion opt-out (otherwise he never sees them).

## Previewing / testing

The Browser pane's `file://` preview does **not** run the games' JS (buttons do nothing). Always serve over http. A minimal PowerShell server (run in the background, write it to the scratchpad), which also maps the `/games` prefix:

```powershell
param([string]$Root,[int]$Port=8765)
$l=New-Object System.Net.HttpListener;$l.Prefixes.Add("http://localhost:$Port/");$l.Start()
$t=@{'.html'='text/html; charset=utf-8';'.css'='text/css';'.js'='text/javascript';'.png'='image/png';'.svg'='image/svg+xml';'.json'='application/json';'.wav'='audio/wav'}
while($l.IsListening){$c=$l.GetContext();$p=[Uri]::UnescapeDataString($c.Request.Url.AbsolutePath) -replace '^/games',''
 $f=Join-Path $Root $p.TrimStart('/');if(Test-Path $f -PathType Container){$f=Join-Path $f 'index.html'}
 $code=200;if(-not(Test-Path $f -PathType Leaf)){$f=Join-Path $Root '404.html';$code=404}
 $b=[IO.File]::ReadAllBytes($f);$c.Response.StatusCode=$code;$x=[IO.Path]::GetExtension($f)
 $c.Response.ContentType=$(if($t[$x]){$t[$x]}else{'application/octet-stream'});$c.Response.OutputStream.Write($b,0,$b.Length);$c.Response.Close()}
```

Then open `http://localhost:8765/games/<folder>/`.

- Bring the test tab to the front first: background tabs pause `requestAnimationFrame`. A **hidden** Browser pane also freezes CSS/Web Animations and makes screenshots lag; check animations by pausing them and setting `currentTime`. The pane can throttle to ~7 fps — don't mistake that for a game bug.
- Check the console for errors after every edit, and test at phone size (`resize_window` mobile) when layout changes.
- Clean up test saves in `localStorage` afterwards (each game's file says which keys).
