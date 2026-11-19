# Rick's games site

Static site on GitHub Pages: repo `xrolenks/games`, live at https://xrolenks.github.io/games/ (project site, so every absolute link needs the `/games/` prefix).

- `index.html` — home page; one `<a class="card">` per game, plus a game count next to "Games".
- `404.html` — "Back to the games" links to `/games/`.
- `wasteland/index.html` — **Wild Wasteland**, the whole game in one file (HTML + CSS + JS, no build, no dependencies, no image files). Notes: `wasteland/CLAUDE.md`.
- `hexisles/` — **Hex Isles**, a hex-island building board game (no build step). Since 2026-11-19 (Rick's request) it's split by job: `index.html` (page HTML), `css/style.css`, `js/*.js`, `sound-effects/*.wav` (see `hexisles/CLAUDE.md` for the file map). Notes: `hexisles/CLAUDE.md`.
- `fatalfists/index.html` — **Fatal Fists**, a one-on-one arcade fighter. "Coming soon" placeholder only (not built yet).
- `.nojekyll` — serve files as-is.

**Originality rule (Rick's update, 2026-11-18):** a game may use features and rules similar to an existing game (game rules and mechanics themselves can't be owned; fan-made games like colonist.io work this way), as long as everything you see and read is our own:
- **Own name** for the game and its modes/expansions (never another game's title or brand, e.g. not "Catan", "Settlers", "Cities & Knights").
- **Everyday words are fine** for cards, pieces, resources and goods, even when another game uses the same ones (Rick's update, 2026-11-18): generic words like wood, brick, sheep, wheat, ore, knight, road, city, robber, paper, cloth or coin aren't anyone's trademark. Only made-up brand names and titles are off limits.
- **Own art and look**: drawn in code in our style, never copied or traced from the other game.
- **Own wording**: rules text, card text and messages written fresh, never copied from a rulebook or the other game.
- Own characters (no characters, logos or branding from the other game).
Rick describing a feature with another game's words, or pointing at its rulebook, is fine: build the feature, keeping our own game/mode names, art and wording (everyday words for cards and resources are OK). Don't rename existing things in a game unless Rick asks.

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
