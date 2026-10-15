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

// Controls that need Educative's servers or scripts and do nothing in a saved page. They are buttons (or
// role=button) whose whole text is one of these labels; matching on that keeps content text untouched.
// Done in the browser, after load, because the three saved formats mark them up differently. Wrappers
// left empty are collapsed, and a MutationObserver covers pages that re-render after load.
const DEAD_CONTROLS_SNIPPET = `<style>[data-dead-ctl]{display:none!important}</style><script>(function(){
var LABELS={'Reset':1,'Run':1,'Save':1,'Submit':1,'Submit Answer':1,'Reset Quiz':1,'Show Answer':1,'Show Solution':1};
function txt(e){
  var t=(e.textContent||'').replace(/\\s+/g,' ').trim(),n=t.length,h,m;
  // responsive pairs render the label twice ("SubmitSubmit" or "Submit Submit")
  if(n>2&&n%2===0){h=t.slice(0,n/2);if(h===t.slice(n/2))return h;}
  m=/^(.+) \\1$/.exec(t);
  return m?m[1]:t;
}
function hide(e){e.setAttribute('data-dead-ctl','1');}
function emptied(p){
  var c;
  for(c=p.firstElementChild;c;c=c.nextElementSibling){if(!c.hasAttribute('data-dead-ctl'))return false;}
  for(c=p.firstChild;c;c=c.nextSibling){if(c.nodeType===3&&c.textContent.trim())return false;}
  return true;
}
function sweep(){
  var els=document.querySelectorAll('button,[role="button"]'),i,el,p,n;
  for(i=0;i<els.length;i++){
    el=els[i];
    if(el.hasAttribute('data-dead-ctl')||LABELS[txt(el)]!==1)continue;
    hide(el);
    p=el.parentElement;n=0;
    while(p&&n<3&&p!==document.body&&emptied(p)){hide(p);p=p.parentElement;n++;}
  }
}
var t;
function later(){clearTimeout(t);t=setTimeout(sweep,150);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sweep);else sweep();
if(window.MutationObserver&&document.documentElement){new MutationObserver(later).observe(document.documentElement,{childList:true,subtree:true});}
})();</script>`;

// Insert before the last </body> (or append when the save has none).
function addDeadControlsCleanup(html) {
  const at = html.lastIndexOf('</body>');
  return at < 0 ? html + DEAD_CONTROLS_SNIPPET : html.slice(0, at) + DEAD_CONTROLS_SNIPPET + html.slice(at);
}

module.exports = { stripEducativeChrome, balancedDiv, addDeadControlsCleanup, DEAD_CONTROLS_SNIPPET };
