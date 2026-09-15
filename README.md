# 🎓 Educative Course Hub

A unified local web app to browse and read all your Educative course downloads in one place.

![Courses: Blind 75, Grind 75, Low-Level Design]

## ✨ Features

- **Single dashboard** listing all 3 courses with live progress bars
- **Sidebar navigation** grouped by section/category with collapsible folders
- **In-app lesson viewer** — no need to open files manually
- **Side code panel** — view source code files (`Solution`, `Java`, `Python`, `C++`, `C#`, tests) for any lesson that has them (LLD lessons with up to 9 code dirs included)
- **Instant search** across all courses (`Ctrl+K`)
- **Progress tracking** — mark lessons complete, progress saved locally in your browser
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

## 🗂 How It Works

- `server.js` scans the three course folders next to this project and exposes a JSON API (`/api/courses`, `/api/search`, `/api/lesson/:key/*`, `/api/asset/:key/*`).
- The frontend (`public/index.html`) renders everything: dashboard → sidebar → lesson views in an iframe, plus the code panel.
- Completion data is stored in `localStorage` — nothing is written to your course files.

## 📚 Supported Courses

Automatically detected from the folder names:

- Grokking Blind 75 (JavaScript)
- Grokking Grind 75 (JavaScript)
- Grokking the Low Level Design Interview

## ⚙️ Requirements

- Node.js 12+ (Express is bundled after `npm install`)