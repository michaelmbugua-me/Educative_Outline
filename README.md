# 🎓 Educative Course Hub

A unified local web app to browse and read all your Educative course downloads in one place.

![Courses: Blind 75, Grind 75, Low-Level Design]

## ✨ Features

- **Single dashboard** with all 5 courses, today's plan, due reviews and a revisit list
- **Sidebar navigation** — one course at a time (switcher with % done), numbered chapters with progress, problem + solution merged into a single row with difficulty and time estimates
- **In-app lesson viewer** — no need to open files manually
- **Side code panel** — view source code files (`Solution`, `Java`, `Python`, `C++`, `C#`, tests) for any lesson that has them (LLD lessons with up to 9 code dirs included)
- **Instant search** across all courses (`Ctrl+K`)
- **Progress tracking** — mark lessons complete (click again to undo); saved server-side in `.data/state.json`, so it survives port changes and cleared browser data
- **Today's plan** — set a daily minutes budget; the dashboard fills it with your next unfinished lessons (System Design weighted 3:1 over Coding Interview) using per-lesson time estimates
- **Adjustable sidebar text** — A− / A+ in the course header (five steps, remembered in your settings); lesson rows are 13.5px in the main text colour, chapters 14px semibold
- **Notes & bookmarks** — per-lesson one-line takeaway plus free-form notes (`N`), bookmark to revisit (`B`); a Notes page groups everything by course and chapter, filters it, and exports Markdown. Notes live in `.data/notes.json`
- **Spaced review** — after marking a lesson done, rate it (1 shaky · 2 okay · 3 solid) and it comes back at 1 → 3 → 7 → 21 → 60 days. Due reviews show on the dashboard, count against the daily budget (~3 min each), and open a recall card that reveals your own takeaway before you rate Again / Good / Easy. `R` schedules or changes a review on the current lesson
- **Reader aids** — scroll position remembered per lesson; "On this page" outline (`O`)
- **Clean lessons** — Educative's in-page Back / Mark as Completed / Next row, "Report an Issue" strip and cookie banner are removed, and buttons that need Educative's servers (Run, Save, Reset, Submit, Submit Answer, Reset Quiz, Show Answer, Show Solution) are hidden; questions, quiz options and code stay visible
- **Prev / Next lesson** navigation arrows
- **Dark / light mode** toggle (`Ctrl+D`)
- **Deep-linking** — your current lesson is kept in the URL hash, so refresh/bookmark keeps your place

## 🚀 Quick Start

```bash
cd course-hub
npm install
npm start
```

Then open **http://localhost:3000** in your browser. The server listens on `127.0.0.1` only; set `HOST=0.0.0.0` to reach it from another device, or `PORT=...` to change the port.

### One-command start (opens browser automatically)

```bash
./start.command
```

(On macOS you can also double-click `start.command` in Finder. It waits for the server — the first run indexes the large courses — before opening the browser.)

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `Ctrl/⌘ + K` | Focus search |
| `Ctrl/⌘ + D` | Toggle dark / light mode |
| `Ctrl/⌘ + ←` / `→` | Previous / Next lesson |
| `O` | Toggle "On this page" outline |
| `N` | Toggle the notes panel |
| `B` | Bookmark / un-bookmark the lesson |
| `R` | Schedule (or re-rate) a review for the lesson |
| `1` `2` `3` | Rate in the review toast / card |
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