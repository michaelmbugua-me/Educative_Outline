const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

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
  }
];

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

// API: Get all courses
app.get('/api/courses', (req, res) => {
  const courses = COURSE_DIRS.map(c => {
    let sections;
    if (c.type === 'lld') {
      sections = scanLLDCourse(c);
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
    const dirPath = path.dirname(relativePath);
    const baseHref = `/api/asset/${req.params.courseKey}/${dirPath}/`;
    const baseTag = `<base href="${baseHref}">`;
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
    const root = findCourseRoot(courseDef.dir);
    let lessons = [];

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

app.listen(PORT, () => {
  console.log(`\n  🎓 Educative Course Hub`);
  console.log(`  ──────────────────────`);
  console.log(`  Running at: http://localhost:${PORT}\n`);
});
