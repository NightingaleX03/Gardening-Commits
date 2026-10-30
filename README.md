# Contribution Garden

This turns my GitHub contributions into a cozy little garden instead of the usual green squares. Every day of the last year is a tile on a floating garden island, and the more I code, the more stuff grows. It updates itself with a GitHub Action, so I don't have to do anything once it's set up.

There's a sunny afternoon version and a cozy evening version with lanterns and fireflies, and you can pick how it switches between them (see [Pick how it looks](#pick-how-it-looks)).

## How the tiles grow

Each tile is one day, and it grows based on how much I coded that day (the same levels GitHub uses for the green squares).

| That day | What grows |
| --- | --- |
| Nothing | Just grass, maybe a pebble or a little clover |
| A little | A tiny sprout |
| Some | A bush with a bud on it |
| A lot | A bush with flowers |
| A LOT | A full bloom in a wooden planter box |

The weeks go along the island from left to right. Sunday to Wednesday are behind the stone path, and Thursday to Saturday are in front of it.

## Goals

This is the fun part: the garden unlocks things based on how many contributions I have in the year.

| Contributions | What you get |
| --- | --- |
| 100 | A starter cottage and a little wooden fence |
| 250 | A cherry blossom tree and garden lanterns |
| 1,000 | A wooden bench (with a tiny teapot), and the cottage becomes a cozy cottage with a porch, climbing roses and smoke coming out of the chimney |
| 2,000 | The storybook cottage, with a whole second floor, a window on the roof and a round attic window |

Other things that show up:

- **Streaks:** if I code 7 or more days in a row, a little wooden arch with vines grows over the path at that week. The longest streak gets the biggest arch.
- **Stars:** every star on my repos is a butterfly (up to 12).
- **Forks:** every fork is a bee (up to 8).
- **Evening mode:** the lanterns and cottage windows light up, and there are fireflies.

## Flowers for each language

Every language is its own kind of flower, and the colors are softer versions of GitHub's language colors.

| Language | Flower | | Language | Flower |
| --- | --- | --- | --- | --- |
| TypeScript | Hydrangea | | C | Daisy |
| JavaScript | Sunflower | | C++ | Dahlia |
| Python | Iris | | C# | Camellia |
| Rust | Rose | | Ruby | Peony |
| Go | Forget-me-not | | PHP | Lavender |
| HTML | Tulip | | Swift | Marigold |
| CSS | Cosmos | | Kotlin | Anemone |
| Java | Poppy | | Shell | Lily |
| | | | Dart | Bluebell |

Any other language gets whichever flower isn't being used yet. Tiny languages (under 3%) are grouped together as "other" and show up as wildflowers.

The flower on each day comes from whichever language I committed to most that day. On the side, there's a bouquet in a teapot that matches my language percentages, so if I'm 60% TypeScript, most of the bouquet is hydrangeas. There's a little legend next to it and a wooden sign with my stats.

## How to set it up

1. Put all of this in your profile repo (the one with the same name as your username).
2. If you already have another contribution graphic set up, delete its workflow file in `.github/workflows/` and any folders it generated, so the two don't both run.
3. Go to **Settings > Actions > General > Workflow permissions** and choose **Read and write permissions**.
4. Pick how you want it to look (see the next section) and add the picture to your profile `README.md`.
5. Push it, then go to the **Actions** tab and run "Contribution garden" once so you don't have to wait.

After that, it runs every hour by itself and only commits when the garden has actually changed.

## Pick how it looks

There are three options. Pick one in `garden.config.ts` under `look`:

| Option | What it does |
| --- | --- |
| `'sun'` | Follows the sun where you live: the afternoon garden during the day and the evening garden after sunset. It uses real sunrise and sunset times for your location, so it changes with the seasons. |
| `'light'` | Always the sunny afternoon garden. |
| `'dark'` | Always the cozy evening garden. |

For `'sun'`, you also need to add roughly where you live:

```ts
look: {
  mode: 'sun',
  latitude: 40.7,
  longitude: -74.0,
},
```

Just use a nearby city. You don't need your exact location (one decimal place is about 10 km, so nobody can find your house from it). You can look up your city's coordinates online.

Then, for all three options, put this in your profile `README.md`:

```html
<img alt="My contribution garden" src="garden/garden.svg" width="100%">
```

The Action checks every hour, so it switches to evening within an hour of sunset. If you picked `'light'` or `'dark'`, you don't need it to run hourly. You can change the cron in `.github/workflows/garden.yml` to `'17 3 * * *'` so it only runs once a day.

**Bonus option:** if you'd rather it match whoever is looking at it (light if their GitHub is in light mode, dark if it's in dark mode), use this instead:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="garden/garden-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="garden/garden-light.svg">
  <img alt="My contribution garden" src="garden/garden-light.svg" width="100%">
</picture>
```

## Private contributions

By default, it only uses public data and the normal GitHub token, so there's nothing to set up. If you want private contributions counted:

- Turn on "Include private contributions on my profile" in your GitHub profile settings.
- Create a fine-grained personal access token that's read-only and has an expiration date.
- Add it as a repository secret called `GARDEN_TOKEN`.
- If you also want private repo languages and stars counted, set `includePrivate: true` in `garden.config.ts`.

Heads up: this shows private activity counts and languages in the picture (but never repo names).

## Previewing it on your computer

```bash
npm install
npm run preview:demo
```

That makes a garden with sample data and opens it in your browser. To see your real one:

```bash
GITHUB_TOKEN=your_token GARDEN_USERNAME=your_username npm run preview
```

On Windows PowerShell, use `$env:GITHUB_TOKEN="your_token"; $env:GARDEN_USERNAME="your_username"; npm run preview`.

## Changing things

Everything you'd want to change is in `garden.config.ts`:

- `look`: sun, light or dark (see above).
- `milestones`: how many contributions you need for each goal.
- `species`: which flower goes with which language.
- `languageColors`: change a language's color.
- `excludeLanguages`: languages to leave out (Jupyter Notebook is left out by default because it throws off the percentages).
- `bouquet`: how many stems there are and the cutoff for "other".
- `critters`: the maximum number of butterflies and bees.
- `themes`: all the colors for light and dark mode.

## What's in here

| File | What it does |
| --- | --- |
| `garden.config.ts` | All the settings |
| `src/github.ts` | Gets the contribution data from GitHub |
| `src/model.ts` | Works out the flower for each day, the streaks and the bouquet |
| `src/flowers.ts` | Draws all the flowers |
| `src/render.ts` | Draws the whole garden |
| `src/index.ts` | Makes the SVG files |
| `src/sun.ts` | Works out whether the sun is up where you live |
| `src/preview.ts` | The local preview |
| `src/demo.ts` | Sample data for the preview |
| `.github/workflows/garden.yml` | The Action that keeps it updated |

## License

MIT, so feel free to use it for your own profile. See `LICENSE`.
