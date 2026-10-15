// Builds a cache for "Grokking Modern System Design Interview" (Save Page WE saves of educative.io).
//
// Source layout: <chapter N. Name>/<M. Lesson>.html, 1-5+ MB each, mostly inline CSS and scripts.
// For every lesson we keep:
//   - the article root (#view-collection-article-content-root) with scripts and chrome removed
//   - the page's own <style> blocks, deduplicated into styles/<hash>.css (87 unique blocks, ~5 MB)
// and write <cache>/toc.json plus <cache>/lessons/CC-LL.json.gz (gzipped { styles: [hash...], html }).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const { stripEducativeChrome } = require('./strip-chrome');

const ROOT_RE = /<div[^>]*id="view-collection-article-content-root"[^>]*>/;

function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .trim();
}

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

function numbered(dir, ext) {
  return fs.readdirSync(dir)
    .map(name => ({ name, m: name.match(/^(\d+)\.\s+(.*)$/) }))
    .filter(e => e.m && (!ext || name_ends(e.name, ext)))
    .map(e => ({ name: e.name, num: parseInt(e.m[1], 10), rest: e.m[2] }))
    .sort((a, b) => a.num - b.num);
}
const name_ends = (n, ext) => n.toLowerCase().endsWith(ext);

// Bump when extraction output changes so the server rebuilds the cache on next start.
const SCHEMA = 3;

function estimateMinutes(html) {
  const words = html.replace(/<(svg|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  const figures = (html.match(/<img\s/g) || []).length + (html.match(/<svg[^>]{0,200}viewBox/g) || []).length;
  // icons are inline <svg> too, so cap the figure allowance
  return Math.max(2, Math.round(words / 200 + Math.min(figures, 10) * 0.5));
}

const pad = n => String(n).padStart(2, '0');

// Page chrome that does nothing in a static save (toolbar buttons, dropdown toggles).
const CHROME_RE = /<button[^>]*aria-label="(?:ask-a-question-button(?:-sm)?|notes-and-highlights-button|options-button|Collapse Dropdown)"[\s\S]*?<\/button>/g;

function cleanRoot(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(CHROME_RE, '');
}

function cleanAll(html) {
  return stripEducativeChrome(cleanRoot(html));
}

function extractStyles(html, stylesDir) {
  const hashes = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html))) {
    const css = m[1];
    if (!css.trim()) continue;
    const h = crypto.createHash('md5').update(css).digest('hex').slice(0, 10);
    const file = path.join(stylesDir, `${h}.css`);
    if (!fs.existsSync(file)) fs.writeFileSync(file, css);
    if (!hashes.includes(h)) hashes.push(h);
  }
  return hashes;
}

async function build(srcDir, cacheDir, log = () => {}) {
  const lessonsDir = path.join(cacheDir, 'lessons');
  const stylesDir = path.join(cacheDir, 'styles');
  fs.mkdirSync(lessonsDir, { recursive: true });
  fs.mkdirSync(stylesDir, { recursive: true });

  const chapters = numbered(srcDir).filter(e => fs.statSync(path.join(srcDir, e.name)).isDirectory());
  if (!chapters.length) throw new Error(`No chapter folders found in ${srcDir}`);

  const categories = [];
  const problems = [];
  let count = 0;

  for (const ch of chapters) {
    const chDir = path.join(srcDir, ch.name);
    const files = numbered(chDir, '.html');
    const cat = { name: ch.rest.replace(/\s+/g, ' ').trim(), lessons: [] };

    for (const f of files) {
      const id = `${pad(ch.num)}-${pad(f.num)}`;
      const html = await fs.promises.readFile(path.join(chDir, f.name), 'utf8');
      const start = html.search(ROOT_RE);
      const end = start < 0 ? -1 : balancedDiv(html, start);
      const fallback = f.rest.replace(/\.html$/i, '').replace(/_ /g, ': ').replace(/_/g, '');
      let title = fallback;

      if (end > 0) {
        const root = cleanAll(html.slice(start, end));
        const h1 = root.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        if (h1) title = decode(h1[1].replace(/<[^>]+>/g, '')) || fallback;
        const styles = extractStyles(html, stylesDir);
        await fs.promises.writeFile(path.join(lessonsDir, `${id}.json.gz`), zlib.gzipSync(JSON.stringify({ styles, html: root })));
        cat.lessons.push({ title, folderName: id, hasContent: true, hasCodes: false, hasQuiz: false, minutes: estimateMinutes(root) });
        count++;
      } else {
        problems.push(`${ch.name}/${f.name}`);
        cat.lessons.push({ title: fallback, folderName: id, hasContent: false, hasCodes: false, hasQuiz: false });
      }
    }
    if (cat.lessons.length) categories.push(cat);
    log(`${ch.name}: ${files.length} lessons`);
  }

  fs.writeFileSync(path.join(cacheDir, 'toc.json'), JSON.stringify({ schema: SCHEMA, categories, count }));
  if (problems.length) log(`warning: article root not found in ${problems.length} files, e.g. ${problems[0]}`);
  return { count, problems };
}

module.exports = { build, SCHEMA };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const src = process.argv[2] || path.resolve(root, '..', 'Grokking Modern System Design Interview for Engineers & Managers');
  const out = process.argv[3] || path.join(root, '.cache', 'sd');
  build(src, out, console.log).then(r => console.log('done', r.count)).catch(e => { console.error(e); process.exit(1); });
}
