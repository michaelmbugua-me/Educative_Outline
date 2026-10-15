const express = require('express');
const path = require('path');
const fs = require('fs');
const { build: buildGciCache, SCHEMA: GCI_SCHEMA } = require('./scripts/build-gci');
const { build: buildSdCache, SCHEMA: SD_SCHEMA } = require('./scripts/build-sd');
const zlib = require('zlib');

const app = express();
const PORT = process.env.PORT || 3000;
// Loopback only: the course files are personal, so don't expose them to the local network.
// Set HOST=0.0.0.0 to reach the hub from another device.
const HOST = process.env.HOST || '127.0.0.1';

const COURSES_ROOT = path.resolve(__dirname, '..');

const COURSE_DIRS = [
  {
    key: 'blind75',
    dir: path.join(COURSES_ROOT, 'Grokking_Blind_75'),
    label: 'Grokking Blind 75',
    subtitle: 'JavaScript Mastery through Coding Patterns',
    tag: 'B75',
    color: '#ff6b4f',
    type: 'pattern'
  },
  {
    key: 'grind75',
    dir: path.join(COURSES_ROOT, 'Grokking_Grind_75'),
    label: 'Grokking Grind 75',
    subtitle: 'JavaScript Mastery through Coding Patterns',
    tag: 'G75',
    color: '#f2b13c',
    type: 'pattern'
  },
  {
    key: 'lld',
    dir: path.join(COURSES_ROOT, 'Grokking_the_Low_Level_Design_Interview'),
    label: 'Grokking Low-Level Design',
    subtitle: 'Using OOD Principles',
    tag: 'LLD',
    color: '#54a8ff',
    type: 'lld'
  },
  {
    // SingleFile page-saves of designgurus.io; indexed into .cache/<key> by scripts/build-gci.js
    key: 'gci',
    dir: path.join(COURSES_ROOT, 'Grokking the Coding Interview Patterns for Coding Questions'),
    label: 'Grokking the Coding Interview',
    subtitle: 'Patterns for Coding Questions',
    tag: 'GCI',
    color: '#a78bfa',
    type: 'dg',
    cacheDir: path.join(__dirname, '.cache', 'gci'),
    build: buildGciCache,
    schema: GCI_SCHEMA
  },
  {
    // Save Page WE saves of educative.io, one folder per chapter; indexed by scripts/build-sd.js
    key: 'sd',
    dir: path.join(COURSES_ROOT, 'Grokking Modern System Design Interview for Engineers & Managers'),
    label: 'Grokking Modern System Design',
    subtitle: 'For Engineers & Managers',
    tag: 'SD',
    color: '#f472b6',
    type: 'sd',
    cacheDir: path.join(__dirname, '.cache', 'sd'),
    build: buildSdCache,
    schema: SD_SCHEMA
  }
];

// Courses whose source files are too heavy to serve directly: indexed once into .cache/<key>.
const CACHED_TYPES = new Set(['dg', 'sd']);

function readDgToc(courseDef) {
  try {
    return JSON.parse(fs.readFileSync(path.join(courseDef.cacheDir, 'toc.json'), 'utf8'));
  } catch {
    return null;
  }
}

async function ensureDgCache(courseDef) {
  const toc = readDgToc(courseDef);
  if (toc && toc.schema === courseDef.schema) return;
  if (toc) console.log(`  ${courseDef.label}: cache format changed, re-indexing`);
  if (!fs.existsSync(courseDef.dir)) {
    console.warn(`  ! ${courseDef.label}: source folder not found, skipping (${courseDef.dir})`);
    return;
  }
  console.log(`  Indexing ${courseDef.label} (one-time)...`);
  const t = Date.now();
  await courseDef.build(courseDef.dir, courseDef.cacheDir, m => console.log(`    ${m}`));
  console.log(`  Indexed in ${((Date.now() - t) / 1000).toFixed(1)}s`);
}

function scanDgCourse(courseDef) {
  const toc = readDgToc(courseDef);
  if (!toc) return [];
  const lessonCount = toc.categories.reduce((n, c) => n + c.lessons.filter(l => l.hasContent).length, 0);
  return [{ name: 'Full Course', categories: toc.categories, lessonCount }];
}

const LESSON_PAGE_CSS = `
  :root { --bg:#ffffff; --ink:#1a1a1c; --ink-2:#54545c; --line:#dcdcd6; --code-bg:#f4f4f2; --accent:#067a4e; color-scheme: light; }
  html.dark { --bg:#0b0b0d; --ink:#ececea; --ink-2:#a2a2aa; --line:#26262d; --code-bg:#16161a; --accent:#3fd98c; color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15.5px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .lesson-title { max-width:860px; margin:0 auto; padding:28px 28px 0; }
  .lesson-title .kicker { font:500 11px/1 ui-monospace,'SF Mono',Menlo,monospace; letter-spacing:.14em; text-transform:uppercase; color:var(--ink-2); }
  .lesson-title h1 { margin:10px 0 0; font-size:26px; line-height:1.25; }
  .lesson-body { max-width:860px; margin:0 auto; padding:16px 28px 80px; --courseplayer-accent-color: var(--accent); }
  h2 { font-size:21px; margin:2em 0 .5em; padding-bottom:.3em; border-bottom:1px solid var(--line); }
  h3 { font-size:17.5px; margin:1.6em 0 .4em; }
  h4 { font-size:15.5px; margin:1.4em 0 .3em; }
  p, ul, ol { margin:.8em 0; }
  li { margin:.25em 0; }
  a { color:var(--accent); }
  code { font:13.5px/1.5 ui-monospace,'SF Mono',Menlo,monospace; background:var(--code-bg); padding:.12em .38em; border-radius:4px; }
  pre { background:var(--code-bg); border:1px solid var(--line); border-radius:8px; padding:14px 16px; overflow:auto; margin:1em 0; }
  pre code { background:none; padding:0; font-size:13px; line-height:1.55; white-space:pre; }
  blockquote { margin:1em 0; padding:.1em 1em; border-left:3px solid var(--accent); color:var(--ink-2); }
  table { border-collapse:collapse; margin:1em 0; display:block; overflow:auto; }
  th, td { border:1px solid var(--line); padding:6px 12px; text-align:left; }
  th { background:var(--code-bg); }
  hr { border:0; border-top:1px solid var(--line); margin:2em 0; }
  img { max-width:100%; height:auto; }
  figure { margin:1.4em 0; text-align:center; }
  figure img { background:#fff; padding:8px; border-radius:6px; border:1px solid var(--line); }
  figcaption { margin-top:6px; font-size:12.5px; color:var(--ink-2); }
  mjx-container { display:inline-block; vertical-align:middle; }
  /* DesignGurus "open in new tab" icons arrive unstyled; keep them text-sized and links inline */
  .MuiSvgIcon-root { width:.8em; height:.8em; margin-left:3px; vertical-align:-.05em; fill:currentColor; flex:none; }
  a[style*="inline-flex"] { display:inline !important; }
  mjx-container svg { max-width:none; }
  details.editor { margin:2em 0 0; border:1px solid var(--line); border-radius:8px; }
  details.editor summary { cursor:pointer; padding:10px 14px; font-weight:600; color:var(--ink-2); }
  details.editor pre { margin:0; border:0; border-top:1px solid var(--line); border-radius:0 0 8px 8px; }
`;

// Educative saves bake the dark-theme table colours into inline styles (dark body rows, navy/teal header
// rows), so tables stay dark with dark text in light mode. Neutralise cell backgrounds under html.light:
// header row a soft grey-blue, everything else white. Matching on the substring "background" keeps this
// independent of attribute quoting/spacing, which differs between saves. Code editors are not <td>s.
const LIGHT_FIX_CSS = `
  html.light td[data-cell-row][style*="background"] { background-color:#ffffff !important; }
  html.light td[data-cell-row="0"][style*="background"] { background-color:#e8ecf4 !important; }
  html.light td[data-cell-row][style*="background"], html.light td[data-cell-row][style*="background"] * { color:#1a1a1c !important; }
`;

// Overrides on top of the page's own (deduplicated) CSS so a lone article renders as a document.
const SD_PAGE_CSS = `
  html, body { margin:0; height:auto !important; overflow:auto !important; background:#fff; }
  html.dark, html.dark body { background:#0b0b0d; }
  .sd-page { max-width:900px; margin:0 auto; padding:24px 28px 80px; }
  #view-collection-article-content-root, #handleArticleScroll { height:auto !important; max-height:none !important; overflow:visible !important; }
  #view-collection-article-content-root [style*="min-height"] { min-height:0 !important; }
  img, svg { max-width:100%; }
`;

function renderSdLesson(courseDef, id, theme = 'dark') {
  const file = path.join(courseDef.cacheDir, 'lessons', `${id}.json.gz`);
  if (!fs.existsSync(file)) return null;
  const { styles, html } = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)).toString('utf8'));
  const css = styles
    .map(h => { try { return fs.readFileSync(path.join(courseDef.cacheDir, 'styles', `${h}.css`), 'utf8'); } catch { return ''; } })
    .join('\n');
  return `<!doctype html><html class="${theme}"><head><meta charset="utf-8"><base target="_blank">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${id}</title>
<style>${css}</style><style>${SD_PAGE_CSS}${LIGHT_FIX_CSS}</style></head>
<body><div id="__next"><div class="sd-page">${html}</div></div></body></html>`;
}

function renderDgLesson(courseDef, id, theme = 'dark') {
  const toc = readDgToc(courseDef);
  const file = path.join(courseDef.cacheDir, 'lessons', `${id}.html`);
  if (!toc || !fs.existsSync(file)) return null;
  let meta = null, chapter = '';
  for (const c of toc.categories) {
    const l = c.lessons.find(x => x.folderName === id);
    if (l) { meta = l; chapter = c.name; break; }
  }
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html><html class="${theme}"><head><meta charset="utf-8"><base target="_blank">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(meta ? meta.title : id)}</title><style>${LESSON_PAGE_CSS}</style></head><body>
<div class="lesson-title"><div class="kicker">${esc(chapter)}</div><h1>${esc(meta ? meta.title : id)}</h1></div>
${fs.readFileSync(file, 'utf8')}
</body></html>`;
}

app.use(express.static(path.join(__dirname, 'public')));

function findCourseRoot(courseDir) {
  const entries = fs.readdirSync(courseDir);
  for (const entry of entries) {
    if (entry.startsWith('Educative') && fs.statSync(path.join(courseDir, entry)).isDirectory()) {
      return path.join(courseDir, entry);
    }
  }
  return courseDir;
}

function scanPatternCourse(courseInfo) {
  const root = findCourseRoot(courseInfo.dir);
  const sections = [];

  const entries = fs.readdirSync(root);
  for (const entry of entries) {
    const fullPath = path.join(root, entry);
    if (!fs.statSync(fullPath).isDirectory() || entry.startsWith('.')) continue;

    const tocFile = path.join(fullPath, '__toc__.json');
    const section = {
      name: entry,
      categories: [],
      lessonCount: 0
    };

    if (fs.existsSync(tocFile)) {
      try {
        const toc = JSON.parse(fs.readFileSync(tocFile, 'utf8'));
        for (const cat of toc.toc || []) {
          const lessons = [];
          for (const topic of cat.topics || []) {
            const [title, folderName] = topic;
            const lessonDir = path.join(root, entry, folderName);
            const htmlFile = path.join(lessonDir, `${folderName}.html`);
            const hasContent = fs.existsSync(htmlFile);
            const hasCodes = fs.existsSync(path.join(lessonDir, 'Codes_1'));
            const hasQuiz = fs.existsSync(path.join(lessonDir, 'Quiz'));

            lessons.push({
              title,
              folderName,
              sectionFolder: entry,
              hasContent,
              hasCodes,
              hasQuiz
            });
            if (hasContent) section.lessonCount++;
          }
          section.categories.push({
            name: cat.category,
            lessons
          });
        }
      } catch (e) {
        console.error(`Error parsing TOC for ${entry}:`, e.message);
      }
    } else {
      // Fallback: scan numbered folders
      const subEntries = fs.readdirSync(fullPath).filter(e =>
        fs.statSync(path.join(fullPath, e)).isDirectory() && /^\d{3}-/.test(e)
      ).sort();

      const lessons = [];
      for (const sub of subEntries) {
        const htmlFile = path.join(fullPath, sub, `${sub}.html`);
        const hasContent = fs.existsSync(htmlFile);
        const title = sub.replace(/^\d{3}-/, '').replace(/-/g, ' ');
        lessons.push({
          title: title.charAt(0).toUpperCase() + title.slice(1),
          folderName: sub,
          sectionFolder: entry,
          hasContent,
          hasCodes: fs.existsSync(path.join(fullPath, sub, 'Codes_1')),
          hasQuiz: fs.existsSync(path.join(fullPath, sub, 'Quiz'))
        });
        if (hasContent) section.lessonCount++;
      }
      if (lessons.length > 0) {
        section.categories.push({ name: 'Lessons', lessons });
      }
    }

    sections.push(section);
  }

  return sections;
}

function scanLLDCourse(courseInfo) {
  const root = findCourseRoot(courseInfo.dir);
  const entries = fs.readdirSync(root).filter(e =>
    fs.statSync(path.join(root, e)).isDirectory() && /^\d{3}-/.test(e)
  ).sort();

  const categories = [
    { name: 'Overview & Introduction', lessons: [] },
    { name: 'Object-Oriented Programming', lessons: [] },
    { name: 'Object-Oriented Analysis & Design', lessons: [] },
    { name: 'SOLID Design Principles', lessons: [] },
    { name: 'Design Patterns', lessons: [] },
    { name: 'Parking Lot', lessons: [] },
    { name: 'Elevator System', lessons: [] },
    { name: 'Library Management', lessons: [] },
    { name: 'Amazon Locker Service', lessons: [] },
    { name: 'Vending Machine', lessons: [] },
    { name: 'Online Blackjack Game', lessons: [] },
    { name: 'Meeting Scheduler', lessons: [] },
    { name: 'Movie Ticket Booking', lessons: [] },
    { name: 'Car Rental System', lessons: [] },
    { name: 'ATM System', lessons: [] },
    { name: 'Chess Game', lessons: [] },
    { name: 'Hotel Management', lessons: [] },
    { name: 'Amazon Online Shopping', lessons: [] },
    { name: 'Stack Overflow', lessons: [] },
    { name: 'Restaurant Management', lessons: [] },
    { name: 'Facebook', lessons: [] },
    { name: 'Online Stock Brokerage', lessons: [] },
    { name: 'Jigsaw Puzzle', lessons: [] },
    { name: 'Airline Management', lessons: [] },
    { name: 'Cricinfo', lessons: [] },
    { name: 'LinkedIn', lessons: [] },
    { name: 'Tips & Conclusion', lessons: [] }
  ];

  function categorize(num) {
    if (num <= 2) return 0;
    if (num <= 6) return 1;
    if (num <= 14) return 2;
    if (num <= 21) return 3;
    if (num <= 28) return 4;
    if (num <= 36) return 5;
    if (num <= 43) return 6;
    if (num <= 50) return 7;
    if (num <= 57) return 8;
    if (num <= 63) return 9;
    if (num <= 69) return 10;
    if (num <= 76) return 11;
    if (num <= 83) return 12;
    if (num <= 90) return 13;
    if (num <= 97) return 14;
    if (num <= 103) return 15;
    if (num <= 110) return 16;
    if (num <= 117) return 17;
    if (num <= 124) return 18;
    if (num <= 131) return 19;
    if (num <= 138) return 20;
    if (num <= 145) return 21;
    if (num <= 149) return 22;
    if (num <= 156) return 23;
    if (num <= 163) return 24;
    if (num <= 170) return 25;
    return 26;
  }

  let lessonCount = 0;
  for (const entry of entries) {
    const match = entry.match(/^(\d{3})-(.+)/);
    if (!match) continue;
    const num = parseInt(match[1]);
    const rawTitle = match[2];
    const title = rawTitle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const htmlFile = path.join(root, entry, `${entry}.html`);
    const hasContent = fs.existsSync(htmlFile);

    // Count code directories
    let codeCount = 0;
    for (let i = 1; i <= 9; i++) {
      if (fs.existsSync(path.join(root, entry, `Codes_${i}`))) codeCount = i;
    }

    const catIdx = categorize(num);
    categories[catIdx].lessons.push({
      title,
      folderName: entry,
      hasContent,
      hasCodes: codeCount > 0,
      codeCount,
      hasQuiz: false
    });
    if (hasContent) lessonCount++;
  }

  // Filter out empty categories
  const filteredCategories = categories.filter(c => c.lessons.length > 0);

  return [{ name: 'Full Course', categories: filteredCategories, lessonCount }];
}

// ─── Study state (progress, resume points, scroll, settings) ───
// One JSON file instead of browser localStorage, so it survives port changes and cleared site data.
// Completion keys are "<course>:<path>" so courses that share lesson paths no longer collide.
const DATA_DIR = path.join(__dirname, '.data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const DEFAULT_STATE = () => ({
  version: 1,
  completed: {},
  lastOpened: {},
  scroll: {},
  bookmarks: {},
  reviews: {},
  settings: { dailyMinutes: 120, weights: { sd: 3, gci: 1 } }
});

function loadState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    const d = DEFAULT_STATE();
    return { ...d, ...raw, settings: { ...d.settings, ...(raw.settings || {}) } };
  } catch {
    return DEFAULT_STATE();
  }
}

let state = loadState();

function writeJsonAtomic(file, data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

function saveState() { writeJsonAtomic(STATE_FILE, state); }

// Notes live in their own file: they are the one thing here you can't regenerate.
// { "<course>:<path>": { insight, body, updated } }
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
let notes = (() => {
  try { return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf8')); } catch { return {}; }
})();

function coursePaths(c) {
  try {
    const sections = c.type === 'lld' ? scanLLDCourse(c)
      : CACHED_TYPES.has(c.type) ? scanDgCourse(c)
      : scanPatternCourse(c);
    const set = new Set();
    for (const sec of sections) {
      for (const cat of sec.categories) {
        for (const l of cat.lessons) set.add((sec.name !== 'Full Course' ? sec.name + '/' : '') + l.folderName);
      }
    }
    return set;
  } catch {
    return new Set();
  }
}

const validCourse = k => COURSE_DIRS.some(c => c.key === k);
const validPath = p => typeof p === 'string' && p.length > 0 && p.length < 400;

app.use(express.json({ limit: '1mb' }));

// ─── Spaced review ───
// Ladder in days. A first rating picks the starting rung; later reviews move along it.
//   initial: 1 shaky -> rung 0, 2 okay -> rung 1, 3 solid -> rung 2
//   review:  1 again -> rung 0, 2 good -> next rung, 3 easy -> skip a rung
// Passing the last rung graduates the lesson (no more reviews).
const REVIEW_STEPS = [1, 3, 7, 21, 60];

function dueAfter(now, days) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

function applyReview(entry, rating, initial, now) {
  let step;
  if (!entry || initial) {
    step = rating === 1 ? 0 : rating === 2 ? 1 : 2;
    entry = { step, reviews: 0 };
  } else {
    step = rating === 1 ? 0 : entry.step + (rating === 2 ? 1 : 2);
    entry.reviews += 1;
    entry.last = now;
  }
  if (step >= REVIEW_STEPS.length) {
    entry.step = REVIEW_STEPS.length - 1;
    entry.graduated = true;
    entry.due = null;
  } else {
    entry.step = step;
    entry.graduated = false;
    entry.due = dueAfter(now, REVIEW_STEPS[step]);
  }
  return entry;
}

app.get('/api/state', (req, res) => res.json({ ...state, reviewSteps: REVIEW_STEPS }));

app.post('/api/state/review', (req, res) => {
  const { course, path: p, rating, initial, remove } = req.body || {};
  if (!validCourse(course) || !validPath(p)) return res.status(400).json({ error: 'bad request' });
  state.reviews = state.reviews || {};
  const key = `${course}:${p}`;
  if (remove) {
    delete state.reviews[key];
  } else {
    if (![1, 2, 3].includes(rating)) return res.status(400).json({ error: 'bad rating' });
    state.reviews[key] = applyReview(state.reviews[key], rating, !!initial, Date.now());
  }
  saveState();
  res.json({ ok: true, review: state.reviews[key] || null });
});

app.post('/api/state/complete', (req, res) => {
  const { course, path: p, done } = req.body || {};
  if (!validCourse(course) || !validPath(p)) return res.status(400).json({ error: 'bad request' });
  const key = `${course}:${p}`;
  if (done) state.completed[key] = Date.now();
  else delete state.completed[key];
  saveState();
  res.json({ ok: true, at: state.completed[key] || null });
});

app.post('/api/state/bookmark', (req, res) => {
  const { course, path: p, on } = req.body || {};
  if (!validCourse(course) || !validPath(p)) return res.status(400).json({ error: 'bad request' });
  state.bookmarks = state.bookmarks || {};
  const key = `${course}:${p}`;
  if (on) state.bookmarks[key] = Date.now();
  else delete state.bookmarks[key];
  saveState();
  res.json({ ok: true });
});

app.get('/api/notes', (req, res) => res.json(notes));

app.put('/api/notes', (req, res) => {
  const { course, path: p, insight, body } = req.body || {};
  if (!validCourse(course) || !validPath(p)) return res.status(400).json({ error: 'bad request' });
  const key = `${course}:${p}`;
  const i = String(insight || '').trim().slice(0, 300);
  const b = String(body || '').slice(0, 20000);
  if (i || b.trim()) notes[key] = { insight: i, body: b, updated: Date.now() };
  else delete notes[key];
  writeJsonAtomic(NOTES_FILE, notes);
  res.json({ ok: true, updated: notes[key] ? notes[key].updated : null });
});

app.post('/api/state/last', (req, res) => {
  const { course, path: p, title, index } = req.body || {};
  if (!validCourse(course) || !validPath(p)) return res.status(400).json({ error: 'bad request' });
  state.lastOpened[course] = { path: p, title: String(title || '').slice(0, 200), index: Number(index) || 0, at: Date.now() };
  saveState();
  res.json({ ok: true });
});

app.post('/api/state/scroll', (req, res) => {
  const { course, path: p, ratio } = req.body || {};
  if (!validCourse(course) || !validPath(p) || typeof ratio !== 'number') return res.status(400).json({ error: 'bad request' });
  const key = `${course}:${p}`;
  if (ratio < 0.02 || ratio > 0.98) delete state.scroll[key];
  else state.scroll[key] = Math.round(ratio * 1000) / 1000;
  saveState();
  res.json({ ok: true });
});

app.post('/api/state/settings', (req, res) => {
  const { dailyMinutes, weights } = req.body || {};
  if (Number.isFinite(dailyMinutes)) state.settings.dailyMinutes = Math.min(600, Math.max(15, Math.round(dailyMinutes)));
  if (weights && typeof weights === 'object') {
    const clean = {};
    for (const [k, v] of Object.entries(weights)) if (validCourse(k) && Number.isFinite(v) && v > 0) clean[k] = v;
    if (Object.keys(clean).length) state.settings.weights = clean;
  }
  saveState();
  res.json({ ok: true, settings: state.settings });
});

// One-time import of the old browser-side progress ({ path: timestamp }, not course-scoped).
// A path that exists in several courses is credited to each, which matches what the old UI showed.
app.post('/api/state/import', (req, res) => {
  const old = (req.body && req.body.completed) || {};
  const byCourse = COURSE_DIRS.map(c => [c.key, coursePaths(c)]);
  let imported = 0;
  for (const [p, ts] of Object.entries(old)) {
    for (const [key, paths] of byCourse) {
      const k = `${key}:${p}`;
      if (paths.has(p) && !state.completed[k]) { state.completed[k] = Number(ts) || Date.now(); imported++; }
    }
  }
  saveState();
  res.json({ ok: true, imported });
});

// API: Get all courses
app.get('/api/courses', (req, res) => {
  const courses = COURSE_DIRS.filter(c => !CACHED_TYPES.has(c.type) || readDgToc(c)).map(c => {
    let sections;
    if (c.type === 'lld') {
      sections = scanLLDCourse(c);
    } else if (CACHED_TYPES.has(c.type)) {
      sections = scanDgCourse(c);
    } else {
      sections = scanPatternCourse(c);
    }
    const totalLessons = sections.reduce((acc, s) => acc + s.lessonCount, 0);
    return {
      key: c.key,
      label: c.label,
      subtitle: c.subtitle,
      tag: c.tag,
      color: c.color,
      type: c.type,
      sections,
      totalLessons
    };
  });
  res.json(courses);
});

// API: Serve lesson content (HTML files)
app.get('/api/lesson/:courseKey/*', (req, res) => {
  const courseDef = COURSE_DIRS.find(c => c.key === req.params.courseKey);
  if (!courseDef) return res.status(404).send('Course not found');

  if (CACHED_TYPES.has(courseDef.type)) {
    const id = req.params[0].split('/')[0];
    if (!/^\d{2,3}(-\d{2})?$/.test(id)) return res.status(404).send('File not found');
    const theme = req.query.theme === 'light' ? 'light' : 'dark';
    const page = courseDef.type === 'sd' ? renderSdLesson(courseDef, id, theme) : renderDgLesson(courseDef, id, theme);
    return page ? res.type('html').send(page) : res.status(404).send('File not found');
  }

  const root = findCourseRoot(courseDef.dir);
  const relativePath = req.params[0];

  // Security: prevent path traversal
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(root)) return res.status(403).send('Forbidden');

  if (!fs.existsSync(resolved)) return res.status(404).send('File not found');

  const ext = path.extname(resolved).toLowerCase();
  if (ext === '.html') {
    // Read and inject a base tag so relative paths resolve against our asset API
    let html = fs.readFileSync(resolved, 'utf8');
    if (req.query.theme === 'light' || req.query.theme === 'dark') {
      html = html.replace(/<html\b[^>]*>/i, tag =>
        /\sclass=("[^"]*"|'[^']*'|[^\s>]+)/i.test(tag)
          ? tag.replace(/(\sclass=)("[^"]*"|'[^']*'|[^\s>]+)/i, `$1"${req.query.theme}"`)
          : tag.replace(/<html\b/i, `<html class="${req.query.theme}"`));
    }
    const dirPath = path.dirname(relativePath);
    const baseHref = `/api/asset/${req.params.courseKey}/${dirPath}/`;
    const baseTag = `<base href="${baseHref}"><style>${LIGHT_FIX_CSS}</style>`;
    const headMatch = html.match(/<head[^>]*>/i);
    if (headMatch) {
      html = html.replace(headMatch[0], headMatch[0] + baseTag);
    } else {
      // No <head> element (Educative saves have inline metas under <html>)
      html = html.replace(/<html[^>]*>/i, match => match + baseTag);
    }
    res.type('html').send(html);
  } else {
    res.sendFile(resolved);
  }
});

// API: Serve static assets from course folders (CSS, JS, images)
app.get('/api/asset/:courseKey/*', (req, res) => {
  const courseDef = COURSE_DIRS.find(c => c.key === req.params.courseKey);
  if (!courseDef) return res.status(404).send('Course not found');

  const root = findCourseRoot(courseDef.dir);
  const relativePath = req.params[0];
  const resolved = path.resolve(root, relativePath);

  if (!resolved.startsWith(root)) return res.status(403).send('Forbidden');
  if (!fs.existsSync(resolved)) return res.status(404).send('File not found');

  res.sendFile(resolved);
});

// API: Search across all courses
app.get('/api/search', (req, res) => {
  const q = (req.query.q || '').toLowerCase().trim();
  if (!q) return res.json([]);

  const results = [];

  for (const courseDef of COURSE_DIRS) {
    let lessons = [];

    if (CACHED_TYPES.has(courseDef.type)) {
      const toc = readDgToc(courseDef);
      for (const cat of (toc && toc.categories) || []) {
        for (const l of cat.lessons) {
          if (l.hasContent && (l.title.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q))) {
            lessons.push({
              title: l.title,
              course: courseDef.label,
              courseKey: courseDef.key,
              path: l.folderName,
              category: cat.name,
              tag: courseDef.tag
            });
          }
        }
      }
      results.push(...lessons.slice(0, 20));
      continue;
    }

    const root = findCourseRoot(courseDef.dir);

    if (courseDef.type === 'lld') {
      const entries = fs.readdirSync(root).filter(e =>
        fs.statSync(path.join(root, e)).isDirectory() && /^\d{3}-/.test(e)
      ).sort();
      for (const entry of entries) {
        const title = entry.replace(/^\d{3}-/, '').replace(/-/g, ' ');
        if (title.toLowerCase().includes(q)) {
          const htmlFile = path.join(root, entry, `${entry}.html`);
          if (fs.existsSync(htmlFile)) {
            lessons.push({
              title: title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              course: courseDef.label,
              courseKey: courseDef.key,
              path: entry,
              tag: courseDef.tag
            });
          }
        }
      }
    } else {
      const sections = fs.readdirSync(root).filter(e =>
        fs.statSync(path.join(root, e)).isDirectory() && !e.startsWith('.')
      );
      for (const section of sections) {
        const tocFile = path.join(root, section, '__toc__.json');
        if (fs.existsSync(tocFile)) {
          try {
            const toc = JSON.parse(fs.readFileSync(tocFile, 'utf8'));
            for (const cat of toc.toc || []) {
              for (const topic of cat.topics || []) {
                const [title, folderName] = topic;
                if (title.toLowerCase().includes(q) || cat.category.toLowerCase().includes(q)) {
                  const htmlFile = path.join(root, section, folderName, `${folderName}.html`);
                  if (fs.existsSync(htmlFile)) {
                    lessons.push({
                      title,
                      course: courseDef.label,
                      courseKey: courseDef.key,
                      path: `${section}/${folderName}`,
                      category: cat.category,
                      tag: courseDef.tag
                    });
                  }
                }
              }
            }
          } catch (e) { /* skip */ }
        }
      }
    }

    results.push(...lessons.slice(0, 20));
  }

  res.json(results);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

(async () => {
  for (const c of COURSE_DIRS.filter(c => CACHED_TYPES.has(c.type))) {
    try { await ensureDgCache(c); } catch (e) { console.error(`  ! ${c.label}: index failed:`, e.message); }
  }
  app.listen(PORT, HOST, () => {
    console.log(`\n  🎓 Educative Course Hub`);
    console.log(`  ──────────────────────`);
    console.log(`  Running at: http://${HOST === '127.0.0.1' ? 'localhost' : HOST}:${PORT}\n`);
  });
})();
