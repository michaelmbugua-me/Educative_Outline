// Removes dead Educative page chrome from saved lessons: the in-page Back / Mark as Completed / Next
// row, the "Report an Issue" strip and the OneTrust cookie-consent container. The hub provides its own navigation and progress tracking, and
// these controls do nothing in a static save.

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

// Cut the <div> that starts with `openPrefix`, nearest before each occurrence of `marker`.
// Guarded by a size cap and by the block containing the marker, so a wrong guess removes nothing.
function cutBlocks(html, marker, openPrefix, maxLen) {
  let from = 0;
  for (;;) {
    const at = html.indexOf(marker, from);
    if (at < 0) return html;
    const start = html.lastIndexOf(openPrefix, at);
    const end = start < 0 ? -1 : balancedDiv(html, start);
    if (end > at && end - start <= maxLen) {
      html = html.slice(0, start) + html.slice(end);
      from = start;
    } else {
      from = at + marker.length;
    }
  }
}

// Cut every <div> whose id is `id` (quoted or unquoted attribute), nested content included.
function cutById(html, id) {
  const open = new RegExp(`<div\\b[^>]*\\bid=["']?${id}["']?[\\s>/][^>]*>|<div\\b[^>]*\\bid=["']?${id}["']?>`);
  for (;;) {
    const m = open.exec(html);
    if (!m) return html;
    const end = balancedDiv(html, m.index);
    if (end < 0) return html;
    html = html.slice(0, m.index) + html.slice(end);
  }
}

function stripEducativeChrome(html) {
  html = cutById(html, 'onetrust-consent-sdk');                                            // cookie banner
  html = cutBlocks(html, 'Mark As Completed', '<div class="mt-12 flex flex-col"', 8000);   // older saves
  html = cutBlocks(html, 'Mark as Completed', '<div class="mt-4', 12000);                  // System Design
  html = cutBlocks(html, 'Report an Issue', '<div class="border-0 border-t', 4000);
  return html;
}

module.exports = { stripEducativeChrome, balancedDiv };
