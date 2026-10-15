# 🎓 Educative Course Hub

A unified local web app to browse and read all your Educative course downloads in one place.

![Courses: Blind 75, Grind 75, Low-Level Design]

## ✨ Features

- **Single dashboard** listing all 3 courses with live progress bars
- **Sidebar navigation** grouped by section/category with collapsible folders
- **In-app lesson viewer** — no need to open files manually
- **Side code panel** — view source code files (`Solution`, `Java`, `Python`, `C++`, `C#`, tests) for any lesson that has them (LLD lessons with up to 9 code dirs included)
- **Instant search** across all courses (`Ctrl+K`)
- **Progress tracking** — mark lessons complete (click again to undo); saved server-side in `.data/state.json`, so it survives port changes and cleared browser data
- **Today's plan** — set a daily minutes budget; the dashboard fills it with your next unfinished lessons (System Design weighted 3:1 over Coding Interview) using per-lesson time estimates
- **Reader aids** — scroll position remembered per lesson; "On this page" outline (`O`)
- **Prev / Next lesson** navigation arrows
- **Dark / light mode** toggle (`Ctrl+D`)
- **Deep-linking** — your current lesson is kept in the URL hash, so refresh/bookmark keeps your place

## 🚀 Quick Start

```bash
cd course-hub
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

### One-command start (opens browser automatically)

```bash
./start.command
```

(On macOS you can also double-click `start.command` in Finder.)

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl/⌘ + K` | Focus search |
| `Ctrl/⌘ + D` | Toggle dark / light mode |
| `Ctrl/⌘ + ←` / `→` | Previous / Next lesson |
| `O` | Toggle "On this page" outline |
| `Esc` | Close outline |

## 🗂 How It Works

- `server.js` scans the three course folders next to this project and exposes a JSON API (`/api/courses`, `/api/search`, `/api/lesson/:key/*`, `/api/asset/:key/*`).
- The frontend (`public/index.html`) renders everything: dashboard → sidebar → lesson views in an iframe, plus the code panel.
- Study state (completion, resume points, scroll positions, daily budget) is stored in `.data/state.json` (git-ignored) — nothing is written to your course files. Progress from an older browser-only version is imported automatically on first load.

## 📚 Supported Courses

Automatically detected from the folder names:

- Grokking Blind 75 (JavaScript)
- Grokking Grind 75 (JavaScript)
- Grokking the Low Level Design Interview
- Grokking the Coding Interview: Patterns for Coding Questions (DesignGurus page-saves, 543 lessons)
- Grokking Modern System Design Interview for Engineers & Managers (Educative page-saves, 175 lessons)

### Indexed courses (`gci`, `sd`)

These two courses are folders of multi-MB browser page-saves, so on first start the server indexes
them into `.cache/<key>/` (TOC + lesson bodies, git-ignored): `gci` in about 5 s, `sd` in about
30 s. Re-run with `npm run index:gci` / `npm run index:sd` if the source files change. Delete the
cache folder to force a rebuild on next start.

- **gci** — lesson text, figures and math, plus the Java editor code from the saved page. A few
  editors were only partially rendered when saved; the affected lessons are patched from
  `scripts/gci-patches.json` and labelled *reconstructed*.
- **sd** — the article body with the page's own styling. "Show Answer" content was never present
  in the saved pages, and quizzes are shown static.

## ⚙️ Requirements

- Node.js 12+ (Express is bundled after `npm install`)