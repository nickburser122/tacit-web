# Tacit

A quiet start page for the web. One line opens any link or contact, answers small questions, and keeps the little things you would otherwise lose. Keyboard first, installable, offline, English and Arabic.

Charcoal by night, bone by day, with one ember accent. The sun/moon button in the corner flips the theme in a tap, and `Alt + T` does the same from the keyboard. A faint glow crosses the top of the page with the real hour of the day.

## What you can type

| Type | Result |
| --- | --- |
| `gmail`, `maps`, a contact name | Open it (typo tolerant, Arabic and Latin both match) |
| `5 km in miles`, `15% of 340`, `255 in hex` | Calculator and unit converter |
| `time in tokyo`, `5pm dubai in tokyo`, `days until christmas` | Time zones and dates |
| `+ call the bank` | Add a task. `+` alone lists tasks |
| `25m timer tea`, `remind me in 5 minutes to call mom`, `pomodoro` | Start a timer. The tab title counts down and a chime plays |
| `#3b82a0`, `rgb(59 130 160)`, `hsl(198 46% 43%)` | Colour converter |
| `>uuid`, `>password`, `>timestamp` | Copy a UUID, a strong password or the Unix time |
| `@name`, `;snippet`, `cb text` | People, snippets, clipboard history |
| `g cats`, `yt lofi`, `w tacit` | Search with an engine prefix |

Press `/` anywhere to focus the field, arrow keys to move between tiles, `Enter` to open, `Ctrl/Cmd + Enter` for a new tab, `Tab` for actions, `Alt + 1…9` to open a tile directly, `Ctrl/Cmd + ,` for the panel, `Alt + T` for the theme.

## Use it as your start page

1. Deploy the folder to any static host. GitHub Pages works as is.
2. Set the page as your browser's home or startup page, or install it as an app from the browser menu.
3. Optional: in the panel, open Data and copy the search address into your browser's custom search engines.

Everything is stored in your browser only. Nothing is sent anywhere.

## Develop

No build step and no dependencies. Serve the folder with any static server and open `index.html`. Open `selftest.html` to run the self tests, which are reported in the page and the console.

Fonts are Readex Pro (SIL Open Font License, see `fonts/OFL.txt`), self hosted and split so the Arabic file only loads when Arabic text appears.
