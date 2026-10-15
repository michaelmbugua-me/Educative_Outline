// Builds a lightweight cache for the "Grokking the Coding Interview: Patterns" course.
//
// The source is 500+ SingleFile page-saves (~5 MB each) of designgurus.io, each one
// containing the whole course shell. We pull out two things:
//   - the chapter/lesson TOC (identical in every file, read from the first one)
//   - the lesson body (the .markdown-content div) for every file
// and write them to <cache>/toc.json and <cache>/lessons/NNN.html.

const fs = require('fs');
const path = require('path');

const PATCHES = JSON.parse(fs.readFileSync(path.join(__dirname, 'gci-patches.json'), 'utf8'));
const MARKER_RE = /^\/\/ … \d+ line\(s\) not captured[^\n]*\n?/;

const MARKDOWN_RE = /<div class=markdown-content[^>]*>/;

function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function norm(s) {
  return decode(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function listSourceFiles(srcDir) {
  return fs.readdirSync(srcDir)
    .map(name => ({ name, m: name.match(/^(\d+)\.\s+(.*)\.htm$/) }))
    .filter(f => f.m)
    .map(f => ({ name: f.name, num: parseInt(f.m[1], 10), title: f.m[2] }))
    .sort((a, b) => a.num - b.num);
}

function parseToc(html) {
  const chapters = [];
  const re = /data-cy=chapter-title>([^<]*)<|data-cy=cp-document-title>(?:(?!<span>)[\s\S])*?<span>([^<]*)<\/span>/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) chapters.push({ name: decode(m[1]), lessons: [] });
    else if (chapters.length) chapters[chapters.length - 1].lessons.push(decode(m[2]));
  }
  return chapters;
}

// Balanced <div>...</div> starting at html[start] (which must be an opening <div).
function balancedDiv(html, start) {
  const tag = /<\/?div\b/g;
  tag.lastIndex = start;
  let depth = 0, m;
  while ((m = tag.exec(html))) {
    depth += m[0] === '</div' ? -1 : 1;
    if (depth === 0) return html.indexOf('>', m.index) + 1;
  }
  return -1;
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`));
  return m ? (m[1] ?? m[2] ?? m[3]) : '';
}

// Text of a rendered Monaco editor (virtualised DOM: one .view-line per row, positioned by top:Npx).
// Rows the page never rendered are marked in place so partial code is not mistaken for complete code.
function editorText(chunk) {
  const rows = [];
  const re = /<div style=["']?top:(\d+)px;[^>]*class=view-line[^>]*>([\s\S]*?)<\/div>(?=<div style=|<\/div>|$)/g;
  let m;
  while ((m = re.exec(chunk))) {
    const text = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&');
    rows.push([parseInt(m[1], 10), text.replace(/\s+$/, '')]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  const lh = parseInt((chunk.match(/line-height:(\d+)px/) || [])[1], 10) || 19;
  const lines = [];
  let expected = 0, missing = 0;
  for (const [top, text] of rows) {
    const idx = Math.round(top / lh);
    if (idx > expected) {
      lines.push(`// … ${idx - expected} line(s) not captured in the saved page …`);
      missing += idx - expected;
    }
    lines.push(text);
    expected = idx + 1;
  }
  return { code: lines.join('\n'), missing };
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// The lesson body lives between the active-doc title and the prev/next bar, as a mix of
// markdown blocks, figures (base64 images) and a rendered code editor. Reassemble in order.
function extractLesson(html, id) {
  const from = html.indexOf('data-cy=cp-active-doc-title');
  let to = html.indexOf('data-cy=previous-doc-btn');
  if (from < 0) return null;
  if (to < 0) to = html.length;
  const region = html.slice(from, to);

  const out = [];
  let hasPre = false;
  const editors = [];
  const re = /<div class=markdown-content[^>]*>|<img\s[^>]*>|data-cy=code-editor-wrapper/g;
  let m;
  while ((m = re.exec(region))) {
    if (m[0].startsWith('<div')) {
      const end = balancedDiv(region, m.index);
      if (end < 0) break;
      const block = region.slice(m.index, end);
      if (block.includes('<pre')) hasPre = true;
      out.push(block);
      re.lastIndex = end;
    } else if (m[0].startsWith('<img')) {
      const src = attr(m[0], 'src');
      if (!/^(data:image|https?:)/.test(src)) continue;
      const cap = region.slice(re.lastIndex, re.lastIndex + 400).match(/^[\s\S]*?<figcaption>([^<]*)<\/figcaption>/);
      const width = (attr(m[0], 'style').match(/width:([\d.]+%)/) || [])[1];
      out.push(`<figure><img alt="${escapeHtml(attr(m[0], 'alt'))}" src="${src}"${width ? ` style="width:${width}"` : ''}>` +
        (cap ? `<figcaption>${cap[1]}</figcaption>` : '') + '</figure>');
    } else {
      const next = region.indexOf('data-cy=code-editor-wrapper', re.lastIndex);
      const chunk = region.slice(re.lastIndex, next < 0 ? region.length : next);
      const lang = (chunk.match(/data-mode-id=(\w+)/) || [])[1] || '';
      let { code, missing } = editorText(chunk);
      let patched = false;
      const patch = PATCHES[id];
      if (patch && missing) {
        if (patch.code) code = patch.code.join('\n');
        else if (patch.fill) code = code.replace(MARKER_RE, patch.fill.length ? patch.fill.join('\n') + '\n' : '');
        missing = 0;
        patched = true;
      }
      if (code.trim()) editors.push({ lang, code, missing, patched });
    }
  }
  if (!out.length) return null;

  const seen = new Set();
  for (const e of editors) {
    if (seen.has(e.code)) continue;
    seen.add(e.code);
    out.push(`<details class="editor"${hasPre ? '' : ' open'}><summary>Editor${e.lang ? ` (${e.lang})` : ''}${e.patched ? ' — reconstructed, original not captured in the saved page' : e.missing ? ' — incomplete in source' : ''}</summary>` +
      `<pre><code>${escapeHtml(e.code)}</code></pre></details>`);
  }
  return `<div class="lesson-body">${out.join('\n')}</div>`;
}

async function build(srcDir, cacheDir, log = () => {}) {
  const files = listSourceFiles(srcDir);
  if (!files.length) throw new Error(`No lesson files found in ${srcDir}`);

  const outLessons = path.join(cacheDir, 'lessons');
  fs.mkdirSync(outLessons, { recursive: true });

  const first = fs.readFileSync(path.join(srcDir, files[0].name), 'utf8');
  const chapters = parseToc(first);
  const tocTitles = chapters.flatMap(c => c.lessons.map(t => ({ t, chapter: c.name })));
  if (tocTitles.length !== files.length) {
    log(`warning: TOC lists ${tocTitles.length} lessons but ${files.length} files found; matching by order`);
  }

  const lessons = [];
  const pad = n => String(n).padStart(3, '0');
  const empty = [];
  const mismatched = [];

  let next = 0, done = 0;
  async function worker() {
    while (next < files.length) {
      const i = next++;
      const f = files[i];
      const html = await fs.promises.readFile(path.join(srcDir, f.name), 'utf8');
      const body = extractLesson(html, pad(f.num));
      const id = pad(f.num);
      if (body) await fs.promises.writeFile(path.join(outLessons, `${id}.html`), body);
      else empty.push(f.name);

      const toc = tocTitles[i];
      if (toc && norm(toc.t) !== norm(f.title)) mismatched.push(`${f.name}  vs  ${toc.t}`);
      lessons[i] = {
        id,
        title: toc ? toc.t : f.title,
        chapter: toc ? toc.chapter : 'Lessons',
        hasContent: !!body
      };
      if (++done % 50 === 0) log(`${done}/${files.length} lessons processed`);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));

  // Group into categories in order
  const categories = [];
  for (const l of lessons) {
    let cat = categories[categories.length - 1];
    if (!cat || cat.name !== l.chapter) {
      cat = { name: l.chapter, lessons: [] };
      categories.push(cat);
    }
    cat.lessons.push({ title: l.title, folderName: l.id, hasContent: l.hasContent, hasCodes: false, hasQuiz: false });
  }

  fs.writeFileSync(path.join(cacheDir, 'toc.json'), JSON.stringify({ categories, count: lessons.length }));
  if (empty.length) log(`warning: no body extracted for ${empty.length} files, e.g. ${empty[0]}`);
  if (mismatched.length) log(`warning: ${mismatched.length} title mismatches, e.g. ${mismatched[0]}`);
  return { count: lessons.length, empty, mismatched };
}

module.exports = { build };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const src = process.argv[2] || path.resolve(root, '..', 'Grokking the Coding Interview Patterns for Coding Questions');
  const out = process.argv[3] || path.join(root, '.cache', 'gci');
  build(src, out, console.log).then(r => console.log('done', r.count)).catch(e => { console.error(e); process.exit(1); });
}
