# Tacit

A quiet start page for the web. One line opens any link or contact, answers small questions, and keeps the little things you would otherwise lose. Keyboard first, installable, offline, English and Arabic.

Charcoal by night, bone by day, with one ember accent. The sun/moon button in the corner flips the theme in a tap, and `Alt + T` does the same from the keyboard. A faint glow crosses the top of the page with the real hour of the day. The search bar never moves: the clock fades out above it while you type, and the results open below.

## What you can type

| Type | Result |
| --- | --- |
| `gmail`, `maps`, a contact name | Open it (typo tolerant, Arabic and Latin both match) |
| `5 km in miles`, `15% of 340`, `255 in hex` | Calculator and unit converter |
| `time in tokyo`, `5pm dubai in tokyo`, `days until christmas` | Time zones and dates |
| `hijri`, `hijri 2026-10-12`, `hijri 1448-05-01` | Today's Hijri date, or convert either way (Umm al-Qura) |
| `+ call the bank` | Add a task. `+` alone lists tasks |
| `note call the plumber` | Jot a note. `note ` alone lists them. Turn one into a task, snippet or link from its menu |
| `25m timer tea`, `remind me in 5 minutes to call mom`, `pomodoro` | Start a timer. The tab title counts down and a chime plays |
| `#3b82a0`, `rgb(59 130 160)`, `hsl(198 46% 43%)` | Colour converter |
| `>uuid`, `>password`, `>timestamp` | Copy a UUID, a strong password or the Unix time |
| `pw`, `pw 32`, `pw 24 u30 d20 s10`, `pw 16 lud`, `pw 12 x5` | Password with full control: length, classes (`l` `u` `d` `s`), per-class percent (`s10`, `s0` removes), count (`x5`). Extras: `hex`, `amb`, `no=il`, `sym=!@#`. Shows entropy |
| `pin 6`, `uuid 5`, `uuid upper nodash` | PINs and UUIDs |
| `rand 1 100`, `rand 0 1 f3`, `rand 1 50 x10 uniq sort`, `rand 5..9`, `rand 6` | Random integer or float between two numbers. `f3` decimals, `x10` count, `uniq`, `sort`, `sep=,`. One bound means 1 to N |
| `table 10 1..100 0..1f2 pw:12 uuid` | Random table, one token per column: `a..b` range, `pw:16:u30`, `pin:4`, `uuid`, `id:100:5`, `pick:a,b,c`, `bool`, `date:2024-01-01..2024-12-31`, `hex:8`, `str:10`. `name=spec` labels a column, `h` adds a header, `csv` `json` `md` pick the format. Enter copies TSV for Excel and Sheets; Alt+Enter converts |
| `@name`, `;snippet`, `cb text` | People, snippets, clipboard history |
| `b64 hello`, `unb64 aGVsbG8=`, `url a b`, `sha256 text`, `json {...}`, `slug`, `upper`, `lower`, `count`, `digits ١٢٣` | Text tools. Enter copies the result |
| `fix hgsghl` | Retype text typed on the wrong keyboard layout (Latin ↔ Arabic) |
| `>copy links` | Copy every link as Markdown, plain URLs, CSV, JSON, or save a bookmarks file |
| `owner/repo`, `r/privacy`, `u/name` | Jump straight to a GitHub repository, subreddit or Reddit user |
| `https://site.com/?utm_source=x` | Opens with tracking parameters removed |
| `morning` (a launch set) | Opens every link in the set at once |
| `g cats`, `b cats`, `d hello`, `tr bonjour`, `tr>fr bonjour` | Search with a provider prefix |

Press `/` anywhere to focus the field, arrow keys to move between tiles, `Enter` to open, `Ctrl/Cmd + Enter` for a new tab, `Tab` and `Shift + Tab` to switch search provider, `Alt + Enter` (or right-click, or long-press) for actions, `Alt + 1…9` to open a tile directly, `Ctrl/Cmd + ,` for the panel, `Alt + T` for the theme.

## Providers

Typing a query shows a row of providers under the bar, ordered by what you typed: an Arabic word brings the dictionary and translator forward, `owner/repo` brings code search forward. Click one to search with it, or press `Tab` to step through them and `Enter` to open. A dot marks providers that respect your privacy.

| Prefix | Provider | Category |
| --- | --- | --- |
| `ddg` (default) `b` `sp` `mj` `qw` `sx` | DuckDuckGo, Brave Search, Startpage, Mojeek, Qwant, SearXNG | Web |
| `g` `bing` `ec` `gi` | Google, Bing, Ecosia, Google Images | Web |
| `px` `ai` `gpt` | Perplexity, Duck.ai, ChatGPT (no sign-in). Question-shaped text ranks these first | AI |
| `w` `wolf` `sch` `arc` | Wikipedia, WolframAlpha, Google Scholar, Internet Archive | Knowledge |
| `d` `am` `ud` | Wiktionary, Almaany (Arabic), Urban Dictionary (English) | Dictionary |
| `tr` `gt` | Translate (Lingva), Google Translate; `tr>fr text` picks the target | Translate |
| `gh` `cg` `mdn` `so` `npm` `pypi` `ciu` `fd` | GitHub, Codeberg, MDN, Stack Overflow, npm, PyPI, Can I use, F-Droid | Code |
| `r` `hn` | Reddit, Hacker News | Social |
| `yt` `imdb` `spot` | YouTube, IMDb, Spotify | Media |
| `amz` `gp` | Amazon, Google Play | Shopping |
| `map` `gm` | OpenStreetMap, Google Maps | Maps |

Only the first few providers show under the search bar (Settings, Look: providers shown). Every prefix still works.

## Library

Panel, Library lists every built-in provider and every Fihrist app as a pill. One click removes it, one click brings it back, and Remove all or Restore all work per section. Removed items stay removed when new built-ins ship later. Deleting a built-in row from the Providers or Links tables does the same.

## Copy as another format

Alt+Enter on a link copies it as a Markdown link, an HTML link, its domain, or without tracking parameters. On a launch set it copies the addresses or a Markdown list. Generated tables and number lists convert to CSV, JSON, Markdown or comma separated the same way.

Reddit, YouTube, Translate and SearXNG are front-end addresses you can change in Settings, under Front-ends. Paste a Redlib, Piped, Invidious, Lingva or SearXNG instance, or your own, and every search and direct jump follows it. SearXNG stays hidden until you give it an address. Public front-ends come and go, so keep one you trust.

The Providers tab edits the list. A template can use `%s` (query, spaces as `+`), `{q}` (query, spaces as `%20`), `{lang}` (`ar` or `en` from the text), `{from}` and `{to}` (translation), and `{host}` (the front-end address). Translation targets are set in Settings: Arabic text goes to English and other text goes to Arabic unless you say otherwise.

## Sets, notes and backups

A launch set is a name with several addresses. Add one from the Sets tab or the `Add launch set` command. Your browser may ask once to allow pop-ups.

Backups live in the panel under Data. `Export encrypted` protects the file with a passphrase (AES-256-GCM, key derived with PBKDF2). Importing detects an encrypted file and asks for the passphrase. Encryption needs https or localhost.

## Use it as your start page

1. Deploy the folder to any static host. GitHub Pages works as is.
2. Set the page as your browser's home or startup page, or install it as an app from the browser menu.
3. Optional: in the panel, open Data and copy the search address into your browser's custom search engines.

## Privacy and safety

Everything is stored in your browser only. Tacit makes no network requests of its own: the page's content security policy only allows files from its own origin, and links you open do not receive a referrer. Addresses starting with `javascript:`, `data:`, `vbscript:`, `blob:` or `file:` are refused everywhere, including in imported backups and CSV files. Tracking parameters (`utm_*`, `fbclid`, `gclid` and similar) are stripped from links you type or save, and the `Remove tracking from copied link` command cleans whatever link is on your clipboard. Both can be switched off in Settings.

## Develop

No build step and no dependencies. Serve the folder with any static server and open `index.html`. Open `selftest.html` to run the self tests, which are reported in the page and the console. When you add a script, list it in `index.html`, `selftest.html` and the asset list in `sw.js`; a self test fails if the service worker list falls out of step.

Fonts are Readex Pro (SIL Open Font License, see `fonts/OFL.txt`), self hosted and split so the Arabic file only loads when Arabic text appears.
