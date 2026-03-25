# VelocoRepo

**See how fast your repo really moves.** VelocoRepo is a desktop app that turns your Git history into charts you can reason about—daily insertions, deletions, net velocity, and trend analytics—without ever letting the app touch a write to your repository.

Whether you’re measuring the impact of a new workflow (say, leaning hard into an AI editor), comparing branches, or just curious how “busy” the last quarter felt in *lines*, VelocoRepo is built to visualize that story.

---

## Why this exists

Git already knows how much you changed each day. VelocoRepo **aggregates that signal** into:

- **Velocity over time** — see bursts, quiet weeks, and long-run drift.
- **Direction** — linear trend on **net** or **total churn** (`|insertions| + |deletions|`), with R² so you know how noisy the story is.
- **Shift detection** — a simple changepoint split that highlights **when** average activity stepped to a new level (great for “before / after we adopted X”).
- **Smoothing** — EWMA curves when you want a calmer line than raw daily bars.
- **Rolling windows** — optional calendar rolling average on **net** (tunable or off).

All of it runs **locally**, against a folder you pick. No cloud, no account, no pushing your history anywhere.

---

## What makes it safe

The UI never runs arbitrary Git commands. The **main process** only invokes a **read-only** set of Git operations (`log` with `--numstat`, `rev-parse`, `branch`, etc.), with `GIT_OPTIONAL_LOCKS` / `--no-optional-locks` where appropriate. The renderer is **sandboxed** with **context isolation** and a small `window.velo` API—no Node in the page, no shell escapes.

---

## Stack

| Layer | Choice |
|--------|--------|
| Shell | Electron + Vite |
| UI | React 18, TypeScript, Tailwind (dark by default) |
| Charts | Apache ECharts |
| Packaging | electron-builder (e.g. Windows NSIS) |

The npm package name is `velocorapid`; the product and installer name is **VelocoRepo**.

---

## Quick start

```bash
git clone <your-fork-or-url> velocorapid
cd velocorapid
npm install
npm run dev
```

Pick a local Git repo, choose a branch and optional date range, then **Analyze velocity**. Tune **Net** vs **Churn** for trend lines, toggle rolling net, EWMA, linear trend, and shift marker as you like. Preferences (last repo, filters, chart options) are saved under the app user data folder.

---

## Build

```bash
npm run build
```

Produces renderer + main bundles and a **Windows installer** under `release/<version>/` (e.g. `VelocoRepo_<version>.exe`).

---

## Who it’s for

- **Engineering leads** who want a tangible view of delivery rhythm over time.  
- **Individuals** proving to themselves (or their team) that a tool or process change correlated with a real jump in output.  
- **Anyone** who prefers charts over staring at `git log` raw output.

VelocoRepo doesn’t replace code review or quality metrics—it **augments** your intuition about *pace* and *change* with numbers tied to real diffs.

---

## License

MIT
